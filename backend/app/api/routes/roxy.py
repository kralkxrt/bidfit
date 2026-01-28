import json
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_current_user
from app.database import get_db
from app.models import User, UserCompany, RoxyMessage, Opportunity
from app.services.roxy_service import RoxyService
from app.dependencies import require_org_id

router = APIRouter(prefix="/api/roxy", tags=["roxy"])


class RoxyChatRequest(BaseModel):
    opportunity_id: UUID
    message: str
    context: Optional[Dict[str, Any]] = None


class RoxyAnalyzeRequest(BaseModel):
    opportunity_id: UUID


class RoxyBidDecisionRequest(BaseModel):
    opportunity_id: UUID


class RoxySummarizeAttachmentRequest(BaseModel):
    attachment_id: Optional[UUID] = None
    document_id: Optional[UUID] = None


class RoxyExtractMemoriesRequest(BaseModel):
    opportunity_id: UUID
    session_id: Optional[UUID] = None


class RoxyExplainRequest(BaseModel):
    opportunityId: UUID
    topic: str


class RoxyComplianceCheckRequest(BaseModel):
    opportunity_id: UUID


def get_roxy_service() -> RoxyService:
    return RoxyService()


async def resolve_org_id_for_opportunity(
    db: AsyncSession,
    current_user: User,
    opportunity_id: UUID,
    org_id: Optional[UUID],
) -> UUID:
    """
    org_id is optional for Roxy endpoints.

    If org_id is omitted, infer it from the opportunity_id and still enforce
    that the current user has access to that org.
    """
    opp_res = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = opp_res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    resolved_org_id = org_id or opp.company_id

    # If org_id was provided explicitly, ensure the opportunity belongs to it.
    if org_id and opp.company_id != org_id:
        raise HTTPException(status_code=404, detail="Opportunity not found for org_id")

    # Enforce org access (equivalent to require_org_id, but optional).
    access_res = await db.execute(
        select(UserCompany.id)
        .where(UserCompany.user_id == current_user.id)
        .where(UserCompany.company_id == resolved_org_id)
    )
    if not access_res.scalars().first():
        raise HTTPException(status_code=403, detail="Invalid org_id")

    return resolved_org_id


@router.post("/chat", status_code=status.HTTP_200_OK)
async def chat_roxy(
    request: RoxyChatRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Streaming chat endpoint for Roxy (SSE).
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunity_id, org_id)
        session = await roxy_service.get_or_create_session(db, request.opportunity_id)

        # Save user message
        user_msg = RoxyMessage(
            session_id=session.id,
            role="user",
            content=request.message,
            citations=[],
            tool_used=None
        )
        db.add(user_msg)
        await db.commit()

        async def event_stream():
            async for event in roxy_service.stream_chat(
                db=db,
                session_id=session.id,
                opportunity_id=request.opportunity_id,
                message=request.message,
                context=request.context or {}
            ):
                yield f"data: {json.dumps(event)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roxy chat failed: {str(e)}")


@router.get("/history/{opportunity_id}", status_code=status.HTTP_200_OK)
async def get_roxy_history(
    opportunity_id: UUID,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Get chat history for an opportunity.
    """
    await resolve_org_id_for_opportunity(db, current_user, opportunity_id, org_id)
    messages = await roxy_service.get_history(db, opportunity_id)
    return {
        "messages": [
            {
                "id": str(m.id),
                "session_id": str(m.session_id),
                "role": m.role,
                "content": m.content,
                "citations": m.citations or [],
                "tool_used": m.tool_used,
                "created_at": m.created_at,
            }
            for m in messages
        ]
    }


@router.post("/analyze", status_code=status.HTTP_200_OK)
async def roxy_auto_analyze(
    request: RoxyAnalyzeRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Trigger Roxy auto-analysis of documents.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunity_id, org_id)
        result = await roxy_service.auto_analyze(db, request.opportunity_id)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roxy analysis failed: {str(e)}")


@router.post("/summarize-attachment", status_code=status.HTTP_200_OK)
async def roxy_summarize_attachment(
    request: RoxySummarizeAttachmentRequest,
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Summarize a single attachment/document by document_id.
    """
    try:
        document_id = request.document_id or request.attachment_id
        if not document_id:
            raise ValueError("document_id is required")
        return await roxy_service.summarize_attachment(db, document_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Attachment summary failed: {str(e)}")


@router.post("/tools/bid-decision", status_code=status.HTTP_200_OK)
async def roxy_bid_decision(
    request: RoxyBidDecisionRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Return GO / NO-GO / CONDITIONAL recommendation for bid decision.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunity_id, org_id)
        result = await roxy_service.bid_decision(db, request.opportunity_id)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roxy bid decision failed: {str(e)}")


@router.post("/extract-memories", status_code=status.HTTP_200_OK)
async def roxy_extract_memories(
    request: RoxyExtractMemoriesRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Extract high-confidence memories from a conversation session.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunity_id, org_id)
        memories = await roxy_service.extract_memories(
            db=db,
            opportunity_id=request.opportunity_id,
            session_id=request.session_id
        )
        return {"memories": memories}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory extraction failed: {str(e)}")


@router.get("/memories", status_code=status.HTTP_200_OK)
async def roxy_get_memories(
    opportunity_id: UUID,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Get stored memories for the company associated with the opportunity.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, opportunity_id, org_id)
        context = await roxy_service._build_context(db, opportunity_id)
        return {"memories": context.get("memories", [])}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory retrieval failed: {str(e)}")


@router.post("/explain", status_code=status.HTTP_200_OK)
async def roxy_explain(
    request: RoxyExplainRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Explain a specific aspect of an opportunity in detail.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunityId, org_id)
        explanation = await roxy_service.explain(
            db=db,
            opportunity_id=request.opportunityId,
            topic=request.topic
        )
        return {"explanation": explanation}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explain failed: {str(e)}")


@router.post("/tools/compliance-check", status_code=status.HTTP_200_OK)
async def roxy_compliance_check(
    request: RoxyComplianceCheckRequest,
    org_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    roxy_service: RoxyService = Depends(get_roxy_service)
):
    """
    Compliance check against extracted requirements and company profile.
    """
    try:
        await resolve_org_id_for_opportunity(db, current_user, request.opportunity_id, org_id)
        return await roxy_service.compliance_check(db, request.opportunity_id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")
