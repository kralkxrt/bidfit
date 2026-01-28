from datetime import datetime
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_org_id
from app.models import Document, User
from app.schemas import PastPerformanceCreate, PastPerformanceResponse, PastPerformanceUpdate

router = APIRouter(prefix="/api/past-performance", tags=["past-performance"])

# Keep consistent with company_profile.py
CONTRACT_DOC_TYPES = {"past_performance", "contract", "cpars", "contract_cpars"}


@router.get("", response_model=List[PastPerformanceResponse])
@router.get("/", response_model=List[PastPerformanceResponse])
async def list_past_performance(
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Document)
        .where(Document.company_id == org_id)
        .where(Document.deleted_at.is_(None))
        .where(Document.document_type.in_(CONTRACT_DOC_TYPES))
        .order_by(Document.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{id}", response_model=PastPerformanceResponse)
async def get_past_performance(
    id: UUID,
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Document)
        .where(Document.id == id)
        .where(Document.company_id == org_id)
        .where(Document.deleted_at.is_(None))
        .where(Document.document_type.in_(CONTRACT_DOC_TYPES))
    )
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Past performance contract not found")
    return doc


@router.post("", response_model=PastPerformanceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PastPerformanceResponse, status_code=status.HTTP_201_CREATED)
async def create_past_performance(
    payload: PastPerformanceCreate,
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_id = uuid4()
    data = payload.model_dump(exclude_unset=True)

    filename = data.pop("filename", None) or data.get("contract_title") or "Past Performance"

    # Documents currently require file_path. For manually-created contracts, store a stable placeholder.
    file_path = f"manual://past-performance/{new_id}"

    doc = Document(
        id=new_id,
        company_id=org_id,
        document_type="past_performance",
        filename=str(filename),
        file_path=file_path,
        file_size_bytes=0,
        mime_type="application/json",
        created_by=current_user.id,
        **data,
    )

    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.put("/{id}", response_model=PastPerformanceResponse)
async def update_past_performance(
    id: UUID,
    payload: PastPerformanceUpdate,
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Document)
        .where(Document.id == id)
        .where(Document.company_id == org_id)
        .where(Document.deleted_at.is_(None))
        .where(Document.document_type.in_(CONTRACT_DOC_TYPES))
    )
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Past performance contract not found")

    update = payload.model_dump(exclude_unset=True)
    for k, v in update.items():
        setattr(doc, k, v)

    doc.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_past_performance(
    id: UUID,
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Document)
        .where(Document.id == id)
        .where(Document.company_id == org_id)
        .where(Document.deleted_at.is_(None))
        .where(Document.document_type.in_(CONTRACT_DOC_TYPES))
    )
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Past performance contract not found")

    doc.deleted_at = datetime.utcnow()
    await db.commit()
    return None
