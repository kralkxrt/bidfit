import asyncio
import uuid
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Import models
# Need to make sure app path is in sys.path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.models import User, Company, UserCompany
from app.config import settings

# Modify database URL for asyncpg
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(database_url, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == 'admin@internal.local'))
        existing_user = result.scalars().first()
        
        if existing_user:
            print("User 'admin@internal.local' already exists. Skipping seed.")
            return

        print("Seeding data...")
        
        # 1. Create User
        new_user = User(
            id=uuid.uuid4(),
            email='admin@internal.local',
            name='Admin',
            is_active=True,
            auth_provider='local'
        )
        session.add(new_user)
        
        # 2. Create Companies
        company_names = ["Liberty Alliance", "RWD Consulting", "The Ginisis Group"]
        companies = []
        for name in company_names:
            company = Company(
                id=uuid.uuid4(),
                name=name
            )
            session.add(company)
            companies.append(company)
            
        await session.flush() # flush to get IDs if needed (though we generated UUIDs)
        
        # 3. Link User to Companies
        for company in companies:
            user_company = UserCompany(
                id=uuid.uuid4(),
                user_id=new_user.id,
                company_id=company.id,
                role='owner',
                is_default=(company.name == "Liberty Alliance") # Make one default
            )
            session.add(user_company)
            
        await session.commit()
        print("🎉 Seed complete: 1 User, 3 Companies linked.")

if __name__ == "__main__":
    asyncio.run(seed_data())
