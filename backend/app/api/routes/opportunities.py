from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, and_, func, text
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Opportunity, OpportunityDocument, Company, Analysis
from app.schemas import OpportunityCreate, OpportunityResponse, OpportunityDocumentResponse
from app.dependencies import get_current_user
from app.services.storage_service import StorageService
from app.services.document_processor import DocumentProcessor
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

# Dependency for services
def get_document_processor():
    # Helper to get processor instance
    from app.config import settings
    llm = LLMService(api_key=settings.ANTHROPIC_API_KEY, model=settings.CLAUDE_MODEL)
    storage = StorageService()
    return DocumentProcessor(llm_service=llm, storage_service=storage)


@router.get("/", response_model=List[OpportunityResponse])
async def list_opportunities(
    company_id: Optional[UUID] = None,
    # Filters
    stage: Optional[str] = Query(None, description="Pipeline stage filter"),
    is_hidden: bool = Query(False, description="Include hidden opportunities"),
    show_only_hidden: bool = Query(False, description="Show only hidden"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    min_score: Optional[int] = Query(None, description="Minimum relevance score"),
    max_score: Optional[int] = Query(None, description="Maximum relevance score"),
    agency: Optional[str] = Query(None, description="Filter by agency"),
    due_within_days: Optional[int] = Query(None, description="Due within N days"),
    search: Optional[str] = Query(None, description="Search title, agency, sol number"),
    # Sorting
    sort_by: str = Query("response_due_date", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List opportunities. If company_id provided, filter by company. Otherwise return all."""
    
    # Create subquery for latest analysis per opportunity
    latest_analysis_subq = (
        select(
            Analysis.id,
            Analysis.opportunity_id,
            Analysis.overall_relevance_label,
            Analysis.overall_relevance_score,
            Analysis.go_no_go_recommendation,
            Analysis.requirements_summary,
            Analysis.created_at
        )
        .distinct(Analysis.opportunity_id)
        .order_by(Analysis.opportunity_id, desc(Analysis.created_at))
        .subquery()
    )

    query = select(Opportunity).options(
        selectinload(Opportunity.company)
    )
    
    if company_id:
        query = query.where(Opportunity.company_id == company_id)

    # Visibility filter
    if show_only_hidden:
        query = query.where(Opportunity.is_hidden == True)
    elif not is_hidden:
        query = query.where(Opportunity.is_hidden == False)
    
    # Stage filter
    if stage:
        query = query.where(Opportunity.pipeline_stage == stage)
    
    # Favorite filter
    if is_favorite is not None:
        query = query.where(Opportunity.is_favorite == is_favorite)
    
    # Agency filter
    if agency:
        query = query.where(Opportunity.agency.ilike(f"%{agency}%"))
    
    # Due date filter
    if due_within_days:
        due_date = datetime.utcnow() + timedelta(days=due_within_days)
        query = query.where(Opportunity.response_due_date <= due_date)
        query = query.where(Opportunity.response_due_date >= datetime.utcnow())
    
    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Opportunity.title.ilike(search_term),
                Opportunity.agency.ilike(search_term),
                Opportunity.solicitation_number.ilike(search_term)
            )
        )
    
    # Sorting
    sort_column = getattr(Opportunity, sort_by, Opportunity.response_due_date)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Execute query
    result = await db.execute(query)
    opportunities = result.scalars().all()
    
    # Fetch analyses for these opportunities
    opp_ids = [o.id for o in opportunities]
    
    if opp_ids:
        # Fetch latest analyses for the found opportunities
        analysis_query = (
            select(Analysis)
            .where(Analysis.opportunity_id.in_(opp_ids))
            .order_by(Analysis.opportunity_id, desc(Analysis.created_at))
            .distinct(Analysis.opportunity_id)
        )
        analysis_res = await db.execute(analysis_query)
        analyses_map = {a.opportunity_id: a for a in analysis_res.scalars().all()}
        
        # Merge analysis data into opportunity objects using Pydantic model response
        # We need to manually construct the response list because generic SQLAlchemy models
        # don't accept extra fields easily without modifying the model class itself to verify schema.
        # But Pydantic's from_attributes=True needs the attributes to exist on the object.
        
        # A better way is to attach the analysis summary to the opportunity object dynamically
        for opp in opportunities:
            # Map company name manually since it's on a relationship
            if opp.company:
                opp.company_name = opp.company.name
                
            analysis = analyses_map.get(opp.id)
            if analysis:
                opp.latest_analysis = {
                    "id": str(analysis.id),
                    "overall_relevance_score": float(analysis.overall_relevance_score) if analysis.overall_relevance_score and analysis.overall_relevance_score.replace('.','',1).isdigit() else 0,
                    "overall_relevance_label": analysis.overall_relevance_label,
                    "go_no_go": analysis.go_no_go_recommendation,
                    "requirements_summary": analysis.requirements_summary
                }
    
    return opportunities


@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    opportunity: OpportunityCreate,
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new opportunity."""
    
    # Check if company exists
    company_res = await db.execute(select(Company).where(Company.id == company_id))
    if not company_res.scalars().first():
        raise HTTPException(status_code=404, detail="Company not found")

    new_opp = Opportunity(
        **opportunity.model_dump(),
        company_id=company_id,
        created_by=current_user.id
    )
    
    db.add(new_opp)
    await db.commit()
    await db.refresh(new_opp)
    
    return new_opp

@router.get("/pipeline-summary")
async def get_pipeline_summary(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get opportunity counts grouped by pipeline stage"""
    
    query = text("""
        SELECT 
            pipeline_stage,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_hidden = false) as active,
            COUNT(*) FILTER (WHERE is_hidden = true) as hidden,
            COUNT(*) FILTER (WHERE is_no_bid = true) as no_bid,
            COUNT(*) FILTER (WHERE is_favorite = true AND is_hidden = false) as favorites
        FROM opportunities
        WHERE company_id = :company_id
        GROUP BY pipeline_stage
    """)
    
    result = await db.execute(query, {"company_id": str(company_id)})
    rows = result.fetchall()
    
    # Initialize all stages
    stages = {
        'capture': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'analyzing': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'writing': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'submitted': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'awarded': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'lost': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
    }
    
    for row in rows:
        stage = row[0]
        if stage in stages:
            stages[stage] = {
                'total': row[1],
                'active': row[2],
                'hidden': row[3],
                'no_bid': row[4],
                'favorites': row[5]
            }
    
    total_active = sum(s['active'] for s in stages.values())
    total_hidden = sum(s['hidden'] for s in stages.values())
    
    return {
        'stages': stages,
        'total_active': total_active,
        'total_hidden': total_hidden
    }


@router.patch("/{opportunity_id}/stage")
async def update_pipeline_stage(
    opportunity_id: UUID,
    body: dict = Body(...),  # {"stage": "writing"}
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move opportunity to a different pipeline stage (drag-and-drop)"""
    
    valid_stages = ['capture', 'analyzing', 'writing', 'submitted', 'awarded', 'lost']
    stage = body.get('stage')
    
    if stage not in valid_stages:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid stage. Must be one of: {', '.join(valid_stages)}"
        )
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    old_stage = opportunity.pipeline_stage
    opportunity.pipeline_stage = stage
    opportunity.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "old_stage": old_stage,
        "new_stage": stage
    }


@router.patch("/{opportunity_id}/hide")
async def hide_opportunity(
    opportunity_id: UUID,
    body: dict = Body(...),  # {"is_no_bid": false, "reason": "..."}
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hide an opportunity from the pipeline view"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    is_no_bid = body.get('is_no_bid', False)
    reason = body.get('reason', None)
    
    opportunity.is_hidden = True
    opportunity.hidden_at = datetime.utcnow()
    opportunity.hidden_reason = reason
    
    if is_no_bid:
        opportunity.is_no_bid = True
        opportunity.no_bid_reason = reason
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "is_hidden": True,
        "is_no_bid": is_no_bid
    }


@router.patch("/{opportunity_id}/restore")
async def restore_opportunity(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restore a hidden opportunity back to the pipeline"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_hidden = False
    opportunity.hidden_at = None
    opportunity.hidden_reason = None
    opportunity.is_no_bid = False
    opportunity.no_bid_reason = None
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "restored": True
    }


@router.patch("/{opportunity_id}/favorite")
async def toggle_favorite(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle favorite status of an opportunity"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_favorite = not opportunity.is_favorite
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "is_favorite": opportunity.is_favorite
    }

@router.get("/{id}", response_model=OpportunityResponse)
async def get_opportunity(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get opportunity details."""
    query = select(Opportunity).where(Opportunity.id == id)
    result = await db.execute(query)
    opp = result.scalars().first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    # Fetch latest analysis
    analysis_query = (
        select(Analysis)
        .where(Analysis.opportunity_id == id)
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    analysis_res = await db.execute(analysis_query)
    analysis = analysis_res.scalars().first()
    
    if analysis:
        opp.latest_analysis = {
            "id": str(analysis.id),
            "overall_relevance_score": float(analysis.overall_relevance_score) if analysis.overall_relevance_score and analysis.overall_relevance_score.replace('.', '', 1).isdigit() else 0,
            "overall_relevance_label": analysis.overall_relevance_label,
            "go_no_go": analysis.go_no_go_recommendation,
            "requirements_summary": analysis.requirements_summary
        }
        
    return opp

@router.post("/{id}/documents", response_model=OpportunityDocumentResponse)
async def upload_opportunity_document(
    id: UUID,
    file: UploadFile = File(...),
    document_type: str = Form("pws"), # pws, sow, etc.
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    processor: DocumentProcessor = Depends(get_document_processor)
):
    """Upload and process an opportunity document (SOW/PWS)."""
    
    # Check opportunity
    query = select(Opportunity).where(Opportunity.id == id)
    result = await db.execute(query)
    opp = result.scalars().first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    file_content = await file.read()
    
    try:
        # We need to add this method to DocumentProcessor
        doc = await processor.process_opportunity_document(
            db=db,
            file_content=file_content,
            filename=file.filename,
            opportunity_id=id,
            document_type=document_type,
            company_id=opp.company_id
        )
        return doc
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("/{id}/documents", response_model=List[OpportunityDocumentResponse])
async def list_opportunity_documents(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all documents for an opportunity (PWS, SOW, etc.)."""
    query = select(OpportunityDocument).where(OpportunityDocument.opportunity_id == id).order_by(desc(OpportunityDocument.created_at))
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/{opp_id}/documents/{doc_id}")
async def delete_opportunity_document(
    opp_id: UUID,
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an opportunity document (PWS/SOW/Amendment)."""
    
    query = select(OpportunityDocument).where(
        OpportunityDocument.id == doc_id,
        OpportunityDocument.opportunity_id == opp_id
    )
    result = await db.execute(query)
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    
    # Hard delete for opportunity documents (or soft delete if preferred)
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}

@router.delete("/{id}", status_code=204)
async def delete_opportunity(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an opportunity."""
    
    query = select(Opportunity).where(Opportunity.id == id)
    result = await db.execute(query)
    opp = result.scalars().first()
    
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
        
    await db.delete(opp)
    await db.commit()
    return None
