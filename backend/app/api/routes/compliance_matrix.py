from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_org_id
from app.models import (
    ComplianceMatrixItem,
    Opportunity,
    OpportunityDocument,
    User,
)
from app.schemas import (
    ComplianceMatrixItemCreate,
    ComplianceMatrixItemResponse,
    ComplianceMatrixItemUpdate,
)
from app.services.pdf_text_service import PdfTextService

router = APIRouter(prefix="/api/opportunities", tags=["compliance-matrix"])

_ALLOWED_STATUSES = {"not_started", "in_progress", "complete", "n_a"}


def _normalize_snippet(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split(" ")
    return " ".join(words[:12]).strip()


def _validate_status(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if value not in _ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid response_status. Must be one of: {', '.join(sorted(_ALLOWED_STATUSES))}",
        )
    return value


async def _get_opportunity_or_404(db: AsyncSession, opportunity_id: UUID, org_id: UUID) -> Opportunity:
    opp_res = await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id).where(Opportunity.company_id == org_id)
    )
    opp = opp_res.scalars().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


@router.get("/{id}/compliance-matrix", response_model=List[ComplianceMatrixItemResponse])
async def list_compliance_matrix_items(
    id: UUID,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_opportunity_or_404(db, id, org_id)

    res = await db.execute(
        select(ComplianceMatrixItem)
        .where(ComplianceMatrixItem.opportunity_id == id)
        .order_by(ComplianceMatrixItem.section.asc(), ComplianceMatrixItem.created_at.asc())
    )
    return res.scalars().all()


@router.post(
    "/{id}/compliance-matrix",
    response_model=ComplianceMatrixItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_compliance_matrix_item(
    id: UUID,
    payload: ComplianceMatrixItemCreate,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_opportunity_or_404(db, id, org_id)

    _validate_status(payload.response_status)

    item = ComplianceMatrixItem(
        opportunity_id=id,
        section=payload.section.strip(),
        requirement=payload.requirement.strip(),
        source_document=payload.source_document,
        page_number=payload.page_number,
        response_status=payload.response_status or "not_started",
        notes=payload.notes,
        assigned_to=payload.assigned_to,
        updated_at=datetime.utcnow(),
    )

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{id}/compliance-matrix/{item_id}", response_model=ComplianceMatrixItemResponse)
async def update_compliance_matrix_item(
    id: UUID,
    item_id: UUID,
    payload: ComplianceMatrixItemUpdate,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_opportunity_or_404(db, id, org_id)

    item_res = await db.execute(
        select(ComplianceMatrixItem)
        .where(ComplianceMatrixItem.id == item_id)
        .where(ComplianceMatrixItem.opportunity_id == id)
    )
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance matrix item not found")

    _validate_status(payload.response_status)

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)

    for field in [
        "section",
        "requirement",
        "source_document",
        "page_number",
        "response_status",
        "notes",
        "assigned_to",
    ]:
        if field in update_data:
            value = update_data[field]
            if isinstance(value, str):
                value = value.strip()
            setattr(item, field, value)

    item.updated_at = datetime.utcnow()

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{id}/compliance-matrix/{item_id}", status_code=status.HTTP_200_OK)
async def delete_compliance_matrix_item(
    id: UUID,
    item_id: UUID,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_opportunity_or_404(db, id, org_id)

    item_res = await db.execute(
        select(ComplianceMatrixItem)
        .where(ComplianceMatrixItem.id == item_id)
        .where(ComplianceMatrixItem.opportunity_id == id)
    )
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance matrix item not found")

    await db.delete(item)
    await db.commit()
    return {"success": True}


@router.post("/{id}/compliance-matrix/generate")
async def generate_compliance_matrix_items(
    id: UUID,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-generate compliance matrix items by reusing previously extracted requirements
    from uploaded opportunity documents.

    We only add NEW items; existing items (and their statuses) remain unchanged.
    """
    await _get_opportunity_or_404(db, id, org_id)

    existing_res = await db.execute(
        select(ComplianceMatrixItem.section, ComplianceMatrixItem.requirement)
        .where(ComplianceMatrixItem.opportunity_id == id)
    )
    existing = {(row[0], row[1]) for row in existing_res.fetchall()}

    docs_res = await db.execute(
        select(OpportunityDocument)
        .where(OpportunityDocument.opportunity_id == id)
        .where(OpportunityDocument.document_type.in_(["rfp", "solicitation", "pws", "sow"]))
        .order_by(OpportunityDocument.created_at.desc())
    )
    docs = docs_res.scalars().all()

    pdf_text = PdfTextService()

    created_count = 0
    skipped_count = 0
    new_items: list[ComplianceMatrixItem] = []

    for doc in docs:
        parsed = doc.parsed_requirements or {}
        requirements = parsed.get("requirements") if isinstance(parsed, dict) else None
        if not isinstance(requirements, list):
            continue

        for req in requirements:
            if not isinstance(req, dict):
                continue

            req_id = str(req.get("id") or "").strip()
            req_section = str(req.get("section") or "").strip()
            section_value = (req_id or req_section).strip()
            section_upper = section_value.upper()
            if not (section_upper.startswith("L.") or section_upper.startswith("M.") or 
                   section_upper.startswith("L-") or section_upper.startswith("M-")):
                # Compliance Matrix is specifically for Section L/M.
                continue

            requirement_text = str(req.get("text") or "").strip()
            if not requirement_text:
                continue

            key = (section_value, requirement_text)
            if key in existing:
                skipped_count += 1
                continue

            page_number = None
            try:
                snippet = _normalize_snippet(requirement_text)
                match = await pdf_text.find_best_match(
                    db=db,
                    document_id=str(doc.id),
                    text_snippet=snippet,
                    page_number=None,
                )
                if match is not None and hasattr(match, "page_number"):
                    page_number = getattr(match, "page_number")
            except Exception:
                # Best-effort page detection; keep generating items even if matching fails.
                pass

            item = ComplianceMatrixItem(
                opportunity_id=id,
                section=section_value[:50],
                requirement=requirement_text,
                source_document=doc.filename,
                page_number=page_number,
                response_status="not_started",
                updated_at=datetime.utcnow(),
            )
            db.add(item)
            new_items.append(item)
            existing.add(key)
            created_count += 1

    if new_items:
        await db.commit()

    return {
        "created": created_count,
        "skipped": skipped_count,
    }
