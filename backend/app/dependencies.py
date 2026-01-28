from typing import Generator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserCompany

# MVP MODE: Hardcoded user email to fetch from DB
# In a real app, this would verify a JWT token
MOCK_USER_EMAIL = "admin@internal.local"

async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    """
    Returns the hardcoded MVP user.
    """
    result = await db.execute(select(User).where(User.email == MOCK_USER_EMAIL))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MVP User not found in database. Please run seed script.",
        )
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def require_org_id(
    org_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UUID:
    result = await db.execute(
        select(UserCompany)
        .where(UserCompany.user_id == current_user.id)
        .where(UserCompany.company_id == org_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid org_id")
    return org_id
