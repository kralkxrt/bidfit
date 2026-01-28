from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_active_user, require_org_id
from app.models import Company, CompanyProfile, User, UserCompany
from app.schemas import CompanyProfileResponse, CompanyProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


async def get_default_company_id(db: AsyncSession, user: User):
    result = await db.execute(
        select(UserCompany.company_id)
        .where(UserCompany.user_id == user.id)
        .order_by(UserCompany.is_default.desc())
    )
    company_id = result.scalars().first()
    if not company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    return company_id


async def get_company_id_for_user(
    db: AsyncSession,
    user: User,
    company_id: Optional[str]
):
    if not company_id:
        return await get_default_company_id(db, user)

    access_res = await db.execute(
        select(UserCompany)
        .where(UserCompany.user_id == user.id)
        .where(UserCompany.company_id == company_id)
    )
    if not access_res.scalars().first():
        raise HTTPException(status_code=403, detail="User not authorized for company")
    return company_id


@router.get("/", response_model=CompanyProfileResponse, status_code=status.HTTP_200_OK)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org_id: UUID = Depends(require_org_id)
):
    company_id = await get_company_id_for_user(db, current_user, str(org_id))
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.id == company_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return profile


@router.put("/", response_model=CompanyProfileResponse, status_code=status.HTTP_200_OK)
async def upsert_company_profile(
    profile_update: CompanyProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    org_id: UUID = Depends(require_org_id)
):
    company_id = await get_company_id_for_user(db, current_user, str(org_id))
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.id == company_id)
    )
    profile = result.scalars().first()
    update_data = profile_update.model_dump(exclude_unset=True)

    if profile:
        for key, value in update_data.items():
            setattr(profile, key, value)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalars().first()
    default_name = company.name if company else "Company Profile"

    profile = CompanyProfile(
        id=company_id,
        name=update_data.get("name", default_name),
        naics_codes=update_data.get("naics_codes"),
        certifications=update_data.get("certifications"),
        clearances=update_data.get("clearances"),
        set_asides=update_data.get("set_asides"),
        employee_count=update_data.get("employee_count"),
        annual_revenue=update_data.get("annual_revenue"),
        bonding_capacity=update_data.get("bonding_capacity"),
        cage_code=update_data.get("cage_code"),
        duns_number=update_data.get("duns_number"),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile
