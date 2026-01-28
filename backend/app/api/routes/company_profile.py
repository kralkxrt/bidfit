from __future__ import annotations

from decimal import Decimal
from typing import Any, List, Optional, Set
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_active_user, require_org_id
from app.models import Company, CompanyProfile, Document, User
from app.schemas import CompanyProfileAPIResponse, CompanyProfileAPIUpdate, PastPerformanceSummary

router = APIRouter(prefix="/api/company-profile", tags=["company-profile"])

CONTRACT_DOC_TYPES: Set[str] = {"past_performance", "contract", "cpars", "contract_cpars"}


def _unique_preserve_order(values: List[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for v in values:
        if not v:
            continue
        if v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def _coerce_set_asides(value: Any) -> List[str]:
    # Existing schema stores JSONB; historically we've used {"SDVOSB": true}.
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v]
    if isinstance(value, dict):
        return [str(k) for k, v in value.items() if v]
    return []


def _build_naics(company: Company, profile: Optional[CompanyProfile]) -> tuple[Optional[str], List[str]]:
    codes: List[str] = []

    if company.primary_naics:
        codes.extend([str(c) for c in company.primary_naics if c])
    if company.primary_naic_code:
        codes.append(str(company.primary_naic_code))

    if not codes and profile and profile.naics_codes:
        codes.extend([str(c) for c in profile.naics_codes if c])

    codes = _unique_preserve_order(codes)

    naics_primary = company.primary_naic_code or (codes[0] if codes else None)
    naics_secondary = [c for c in codes if c and c != naics_primary]
    return naics_primary, naics_secondary


def _build_clearance(company: Company, profile: Optional[CompanyProfile]) -> Optional[str]:
    if profile and profile.clearances:
        return str(profile.clearances[0])
    if company.facility_clearance:
        return str(company.facility_clearance)
    return None


def _contract_docs(documents: List[Document]) -> List[Document]:
    contract_docs: List[Document] = []
    for doc in documents:
        doc_type = (doc.document_type or "").lower()
        parsed = doc.parsed_content or {}
        actual_type = (parsed.get("actual_document_type") or "").upper()
        if actual_type == "CONTRACT_CPARS" or doc_type in CONTRACT_DOC_TYPES:
            contract_docs.append(doc)
    return contract_docs


def _build_past_performance_summary(documents: List[Document]) -> PastPerformanceSummary:
    contract_docs = _contract_docs(documents)

    total_value = Decimal("0")
    agencies: List[str] = []

    for doc in contract_docs:
        if doc.contract_value is not None:
            total_value += Decimal(str(doc.contract_value))
        if doc.customer_agency:
            agencies.append(str(doc.customer_agency))

    agencies_unique = sorted(set(a for a in agencies if a))

    try:
        total_value_num = int(total_value)
    except Exception:
        total_value_num = 0

    return PastPerformanceSummary(
        contract_count=len(contract_docs),
        total_value=total_value_num,
        agencies=agencies_unique,
    )


async def _load_company_profile_context(
    db: AsyncSession,
    org_id: UUID,
) -> tuple[Company, Optional[CompanyProfile], List[Document]]:
    company_res = await db.execute(select(Company).where(Company.id == org_id))
    company = company_res.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    profile_res = await db.execute(select(CompanyProfile).where(CompanyProfile.id == org_id))
    profile = profile_res.scalars().first()

    docs_res = await db.execute(
        select(Document)
        .where(Document.company_id == org_id)
        .where(Document.deleted_at.is_(None))
    )
    documents = docs_res.scalars().all()

    return company, profile, documents


def _build_response(
    org_id: UUID,
    company: Company,
    profile: Optional[CompanyProfile],
    documents: List[Document],
) -> CompanyProfileAPIResponse:
    naics_primary, naics_secondary = _build_naics(company, profile)

    certifications: List[str] = []
    if profile and profile.certifications:
        certifications = [str(c) for c in profile.certifications if c]
    elif company.certifications:
        certifications = [str(c) for c in (company.certifications or []) if c]

    return CompanyProfileAPIResponse(
        id=org_id,
        name=company.name,
        duns=company.duns,
        cage=company.cage_code,
        uei=company.uei,
        naics_primary=naics_primary,
        naics_secondary=naics_secondary,
        certifications=certifications,
        set_asides=_coerce_set_asides(profile.set_asides) if profile else [],
        clearance_level=_build_clearance(company, profile),
        # NOTE: current DB schema doesn't have a dedicated cleared_personnel_count column.
        # We reuse company_profiles.employee_count for now.
        cleared_personnel_count=(profile.employee_count if profile and profile.employee_count is not None else 0),
        past_performance_summary=_build_past_performance_summary(documents),
    )


@router.get("", response_model=CompanyProfileAPIResponse, status_code=status.HTTP_200_OK)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org_id: UUID = Depends(require_org_id),
):
    company, profile, documents = await _load_company_profile_context(db, org_id)
    return _build_response(org_id, company, profile, documents)


@router.put("", response_model=CompanyProfileAPIResponse, status_code=status.HTTP_200_OK)
async def update_company_profile(
    payload: CompanyProfileAPIUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org_id: UUID = Depends(require_org_id),
):
    company, profile, documents = await _load_company_profile_context(db, org_id)
    update = payload.model_dump(exclude_unset=True)

    # --- Companies table fields ---
    if "name" in update and update["name"] is not None:
        company.name = update["name"]

    if "duns" in update:
        company.duns = update["duns"]

    if "cage" in update:
        company.cage_code = update["cage"]

    if "uei" in update:
        company.uei = update["uei"]

    if "naics_primary" in update or "naics_secondary" in update:
        naics_primary = update.get("naics_primary")
        naics_secondary = update.get("naics_secondary") or []
        codes = _unique_preserve_order([naics_primary] + naics_secondary if naics_primary else naics_secondary)
        company.primary_naic_code = naics_primary
        company.primary_naics = codes if codes else None

    if "certifications" in update:
        # Keep company + profile in sync for downstream logic.
        company.certifications = update["certifications"]

    # --- company_profiles (optional) ---
    if not profile:
        profile = CompanyProfile(id=org_id, name=company.name)

    if "name" in update and update["name"] is not None:
        profile.name = update["name"]

    if "certifications" in update:
        profile.certifications = update["certifications"]

    if "set_asides" in update:
        # Store as JSONB dict-of-bools for backward compatibility.
        profile.set_asides = {str(s): True for s in (update["set_asides"] or [])}

    if "clearance_level" in update:
        profile.clearances = [update["clearance_level"]] if update["clearance_level"] else None
        company.facility_clearance = update["clearance_level"]

    if "cleared_personnel_count" in update:
        profile.employee_count = update["cleared_personnel_count"]

    db.add(company)
    db.add(profile)
    await db.commit()

    await db.refresh(company)
    await db.refresh(profile)

    _, _, documents = await _load_company_profile_context(db, org_id)
    return _build_response(org_id, company, profile, documents)
