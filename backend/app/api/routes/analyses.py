from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import User, Analysis
from app.dependencies import get_current_user
from app.services.llm_service import LLMService
from app.services.analysis_engine import AnalysisEngine
from app.config import settings

router = APIRouter(prefix="/api/analyses", tags=["analyses"])

# --- Schemas ---

class AnalysisCreateRequest(BaseModel):
    opportunity_id: UUID
    document_ids: List[UUID]

class AnalysisResponse(BaseModel):
    id: UUID
    company_id: UUID
    opportunity_id: UUID
    overall_relevance_score: str
    go_no_go_recommendation: Optional[str]
    created_at: datetime
    # We can add full details if needed, but list view usually needs minimal.
    # For Detailed view, we'll return everything.

class AnalysisDetailResponse(AnalysisResponse):
    overall_relevance_label: Optional[str]
    scope_score: Optional[str]
    magnitude_score: Optional[str]
    complexity_score: Optional[str]
    recency_score: Optional[str]
    strengths: List[Any]
    weaknesses: List[Any]
    recommendations: Optional[Any]
    gap_matrix: Optional[Any]
    document_assessments: Optional[List[Any]]
    go_no_go_reasoning: Optional[str]
    agent_confidence: Optional[float]
    
    # v2.0 Fields
    requirements_matrix: Optional[List[Any]]
    requirements_summary: Optional[Dict[str, Any]]
    contract_assessments: Optional[List[Any]]
    red_flags: Optional[List[Any]]
    evaluator_perspective: Optional[str]
    dimensional_scores: Optional[Dict[str, Any]]
    
    # Phase 0 Integration
    company_compliance: Optional[Dict[str, Any]]
    document_analysis: Optional[Dict[str, Any]]
    
    raw_llm_response: Optional[str]

    class Config:
        from_attributes = True

# --- Dependency ---

def get_analysis_engine():
    llm = LLMService(api_key=settings.ANTHROPIC_API_KEY, model=settings.CLAUDE_MODEL)
    return AnalysisEngine(llm)

# --- Routes ---

class BulkDeleteRequest(BaseModel):
    ids: List[UUID]

@router.post("/bulk-delete")
async def bulk_delete_analyses(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk soft delete analyses."""
    from sqlalchemy import update
    
    if not payload.ids:
        return {"message": "No IDs provided"}
        
    query = update(Analysis).where(Analysis.id.in_(payload.ids)).values(deleted_at=datetime.utcnow())
    await db.execute(query)
    await db.commit()
    
    return {"message": f"Successfully deleted {len(payload.ids)} analyses"}

@router.post("/", response_model=AnalysisDetailResponse, status_code=status.HTTP_201_CREATED)
async def run_analysis(
    request: AnalysisCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: AnalysisEngine = Depends(get_analysis_engine)
):
    """
    Run a gap analysis.
    WARNING: This process takes 30-60 seconds to complete.
    The client should expect a long response time.
    """
    
    # We pass the user's implicit company (hardcoded for MVP via user_companies rel or passed?
    # For MVP, we'll fetch the opportunity to check company_id)
    
    try:
        # Fetch Opportunity to get company_id
        # (Engine does this too, but we need it for auth check ideally)
        # engine.run_analysis handles validation too.
        
        # We assume Opportunity belongs to the user's company (skipped detailed authz for MVP)
        # Just getting company_id from db in engine or passing it?
        # Let's pass the user_id and let engine handle logic, but engine needs company_id.
        # We can look up company_id one of the docs or opps.
        
        # Quick lookup for company_id from Opp
        from app.models import Opportunity
        res = await db.execute(select(Opportunity.company_id).where(Opportunity.id == request.opportunity_id))
        company_id = res.scalar()
        
        if not company_id:
             raise HTTPException(status_code=404, detail="Opportunity not found")

        analysis = await engine.run_analysis(
            db=db,
            opportunity_id=request.opportunity_id,
            document_ids=request.document_ids,
            user_id=current_user.id,
            company_id=company_id
        )
        
        return analysis

    except ValueError as e:
        print(f"ValueError in analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Unexpected error in analysis: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/{id}", response_model=AnalysisDetailResponse)
async def get_analysis(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analysis details."""
    query = select(Analysis).where(Analysis.id == id)
    result = await db.execute(query)
    analysis = result.scalars().first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return analysis

@router.get("/", response_model=List[AnalysisResponse])
async def list_analyses(
    opportunity_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List analyses, optionally filtered by opportunity or company."""
    stmt = select(Analysis).order_by(desc(Analysis.created_at))
    
    if opportunity_id:
        stmt = stmt.where(Analysis.opportunity_id == opportunity_id)
    
    if company_id:
        stmt = stmt.where(Analysis.company_id == company_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{id}/export")
async def export_analysis(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export analysis to DOCX format."""
    from fastapi.responses import StreamingResponse
    from app.services.export_service import ExportService
    from app.models import Opportunity
    
    # Fetch analysis
    query = select(Analysis).where(Analysis.id == id)
    result = await db.execute(query)
    analysis = result.scalars().first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Fetch opportunity
    opp_query = select(Opportunity).where(Opportunity.id == analysis.opportunity_id)
    opp_result = await db.execute(opp_query)
    opportunity = opp_result.scalars().first()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    # Generate DOCX
    export_service = ExportService()
    docx_buffer = export_service.generate_analysis_docx(analysis, opportunity)
    
    # Return as downloadable file
    filename = f"Gap_Analysis_{opportunity.solicitation_number or 'Report'}_{datetime.now().strftime('%Y%m%d')}.docx"
    
    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/{id}", status_code=204)
async def delete_analysis(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an analysis."""
    query = select(Analysis).where(Analysis.id == id)
    result = await db.execute(query)
    analysis = result.scalars().first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    await db.delete(analysis)
    await db.commit()
    return None
