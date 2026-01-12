from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Company, UserCompany
from app.dependencies import get_current_active_user
from pydantic import BaseModel
from uuid import UUID

router = APIRouter()

from app.schemas import CompanyCreate, CompanyResponse

@router.get("/", response_model=List[CompanyResponse])
async def get_my_companies(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all companies associated with the current user.
    """
    # We need to join UserCompany to find companies
    result = await db.execute(
        select(Company)
        .join(UserCompany, UserCompany.company_id == Company.id)
        .where(UserCompany.user_id == current_user.id)
    )
    companies = result.scalars().all()
    return companies

@router.post("/", response_model=CompanyResponse, status_code=201)
async def create_company(
    company: CompanyCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new company and associate it with the current user.
    """
    # Create Company
    new_company = Company(name=company.name)
    db.add(new_company)
    await db.flush() # flush to get ID
    
    # Associate with User
    user_company = UserCompany(user_id=current_user.id, company_id=new_company.id)
    db.add(user_company)
    
    await db.commit()
    await db.refresh(new_company)
    
    return new_company

@router.delete("/{id}", status_code=204)
async def delete_company(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a company and all its associated data (cascading).
    Only the user who is associated with the company can delete it (for MVP).
    """
    # Check if company exists and user is associated
    result = await db.execute(
        select(Company)
        .join(UserCompany, UserCompany.company_id == Company.id)
        .where(and_(Company.id == id, UserCompany.user_id == current_user.id))
    )
    company = result.scalars().first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or access denied")
        
    await db.delete(company)
    await db.commit()
    return None

@router.get("/{id}", response_model=CompanyResponse)
async def get_company(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific company profile.
    """
    result = await db.execute(
        select(Company)
        .join(UserCompany, UserCompany.company_id == Company.id)
        .where(and_(Company.id == id, UserCompany.user_id == current_user.id))
    )
    company = result.scalars().first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return company

from app.schemas import CompanyUpdate

@router.patch("/{id}", response_model=CompanyResponse)
async def update_company(
    id: UUID,
    company_update: CompanyUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a company profile.
    """
    # Verify access
    result = await db.execute(
        select(Company)
        .join(UserCompany, UserCompany.company_id == Company.id)
        .where(and_(Company.id == id, UserCompany.user_id == current_user.id))
    )
    company = result.scalars().first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Update fields
    update_data = company_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
        
    db.add(company)
    await db.commit()
    await db.refresh(company)
    
    return company
