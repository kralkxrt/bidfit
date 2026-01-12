from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User

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
