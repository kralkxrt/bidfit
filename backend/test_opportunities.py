import os
import sys
import asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.config import settings
from app.models import Company

# Setup Async DB for fetching company
database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(database_url)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_company_id():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Company))
        company = result.scalars().first()
        return str(company.id) if company else None

async def test_opportunities():
    # 1. Get a company ID
    company_id = await get_company_id()
    if not company_id:
        print("❌ No companies found in DB. Run seed script first.")
        return

    print(f"Using Company ID: {company_id}")

    # Use AsyncClient
    async with AsyncClient(app=app, base_url="http://test") as client:
        
        # 2. Create Opportunity
        opp_data = {
            "title": "Test Opportunity - Cyber Security Services",
            "solicitation_number": "SOL-2026-003",
            "agency": "Department of Homeland Security",
            "notes": "Test creation via script"
        }
        
        print("\nCreating Opportunity...")
        # Passing company_id as query param as defined in router
        res_opp = await client.post(f"/api/opportunities/?company_id={company_id}", json=opp_data)
        
        if res_opp.status_code != 201:
            print(f"❌ Custom Opportunity Creation Failed: {res_opp.status_code}")
            print(res_opp.text)
            return
            
        opp = res_opp.json()
        opp_id = opp["id"]
        print(f"✅ Created Opportunity: {opp_id}")
        print(f"Title: {opp['title']}")
        
        # 3. Upload SOW/PWS
        print("\nUploading PWS...")
        pws_content = b"""
        PERFORMANCE WORK STATEMENT (PWS)
        
        1.0 SCOPE
        The contractor shall provide cybersecurity monitoring services for the DHS headquarters. 
        
        2.0 REQUIREMENTS
        2.1 The contractor shall monitor network traffic 24/7/365.
        2.2 The contractor must possess ISO 27001 certification.
        2.3 Key Personnel: The Program Manager must have PMP certification and 10 years experience.
        2.4 Deliverables: Monthly Status Report due by the 5th of each month.
        """
        
        files = {"file": ("test_pws.txt", pws_content, "text/plain")}
        data = {"document_type": "pws"}
        
        res_doc = await client.post(f"/api/opportunities/{opp_id}/documents", files=files, data=data)
        
        if res_doc.status_code == 200:
            doc = res_doc.json()
            print("✅ Document Upload & Processing Successful!")
            print(f"Doc ID: {doc['id']}")
            
            reqs = doc.get('parsed_requirements')
            if reqs:
                print("\n✅ Requirements Extracted (Example):")
                # print first requirement if exists
                if reqs.get('requirements'):
                    print(reqs['requirements'][0])
                else:
                     print("Requirements JSON structure seems empty or different.")
                     print(reqs)
            else:
                print("⚠️ No Requirements Extracted (Check LLM logs)")
                print(f"Full Parsed Content: {doc.get('parsed_requirements')}")
                
        else:
            print(f"❌ Upload Failed: {res_doc.status_code}")
            print(res_doc.text)

if __name__ == "__main__":
    asyncio.run(test_opportunities())
