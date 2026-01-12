import os
import sys
import asyncio
from fastapi.testclient import TestClient
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

def test_upload():
    # 1. Get a company ID
    company_id = asyncio.run(get_company_id())
    if not company_id:
        print("❌ No companies found in DB. Run seed script first.")
        return

    print(f"Using Company ID: {company_id}")

    client = TestClient(app)

    # 2. Create dummy file
    file_content = b"This is a test contract for Past Performance Gap Analysis. Contract Number: TEST-2026-001. Customer: US Navy."
    files = {"file": ("test_contract.txt", file_content, "text/plain")}
    data = {
        "company_id": company_id,
        "document_type": "past_performance"
    }

    print("Uploading file...")
    response = client.post("/api/documents/upload", files=files, data=data)

    if response.status_code == 201:
        print("✅ Upload Successful!")
        doc = response.json()
        print(f"Document ID: {doc['id']}")
        print(f"Filename: {doc['filename']}")
        print(f"Parsed Content: {doc.get('parsed_content')}")
        
        # Verify metadata extraction (even if mock or LLM)
        # Since we use LLM, it might take a moment or depend on API key
        if doc.get('parsed_content'):
            print("✅ Metadata Extracted")
        else:
            print("⚠️ No Metadata Extracted (Check LLM logs)")
            
    else:
        print(f"❌ Upload Failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_upload()
