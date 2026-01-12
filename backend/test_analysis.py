import asyncio
import httpx
import uuid
from typing import Dict, Any

# Test Config
BASE_URL = "http://localhost:8000"
USER_EMAIL = "admin@internal.local"
PASSWORD = "admin"

async def test_analysis_pipeline():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        # 1. Login
        login_res = await client.post("/auth/jwt/login", data={"username": USER_EMAIL, "password": PASSWORD})
        if login_res.status_code != 200:
             # Try /token if standard fastAPI OAuth2
             login_res = await client.post("/token", data={"username": USER_EMAIL, "password": PASSWORD})
        
        # For simplicity in this env, we might be using session cookie or Header?
        # The app seems to use `fastapi_users` mostly, or custom.
        # Let's check `test_opportunities.py` pattern (it mocked db or used client directly).
        # Actually `test_opportunities.py` used `httpx` against running server OR mocked app?
        # It connected to DB directly for cleanup but used `AsyncClient(app=app, ...)`
        pass

# Re-using the pattern from test_opportunities.py which imports the app object
from app.main import app
from app.database import get_db
from app.models import User, Company, Opportunity, Document
from sqlalchemy import select

async def run_test():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # 0. Setup: Get a user and company
        # We need to bypass auth or login.
        # In `test_opportunities.py`, we relied on `get_current_user` override or just valid token?
        # `test_opportunities.py` didn't show auth headers.
        # Let's check if auth is enforced on the routes.
        # `opportunities.py` uses `current_user: User = Depends(get_current_user)`.
        # `test_opportunities.py` likely failed initially due to auth if not handled?
        # Wait, I didn't see `test_opportunities.py` log "401 Unauthorized". 
        # Ah, looking at `test_opportunities.py` content via `view_file` might reveal how I handled auth.
        # But I never viewed the final `test_opportunities.py`.
        # I'll Assume I need to override dependency.
        
        from app.dependencies import get_current_user
        from app.database import SessionLocal
        
        # Get a real user from DB
        async with SessionLocal() as db:
            res = await db.execute(select(User).where(User.email == "admin@internal.local"))
            real_user = res.scalars().first()
            if not real_user:
                print("No user found in DB. Run seed_mvp.py first.")
                return
        
        # Mock dependency override
        app.dependency_overrides[get_current_user] = lambda: real_user
        
        # 1. Create Opportunity
        company_id = "96f87f05-c153-42d5-ad39-547cada8fa4b" # From previous logs: 96f87f05...
        
        opp_data = {
            "title": "Analysis Test Auto Opp",
            "solicitation_number": "TEST-ANALYSIS-001",
            "agency": "Test Agency",
            "response_due_date": "2026-12-31"
        }
        res = await client.post(f"/api/opportunities/?company_id={company_id}", json=opp_data)
        if res.status_code not in [200, 201]:
             print(f"Failed to create opp: {res.text}")
             return
        opp_id = res.json()["id"]
        print(f"Created Opp: {opp_id}")

        # 2. Upload PWS (To get requirements)
        # We'll upload a simple text file
        files = {"file": ("pws.txt", "Requirement: Contractor shall provide cloud migration services.", "text/plain")}
        res = await client.post(f"/api/opportunities/{opp_id}/documents", files=files, data={"document_type": "pws"})
        if res.status_code != 200:
             print(f"Failed to upload PWS: {res.text}")
             return
        print("Uploaded PWS.")
        
        # 3. Create a Dummy Past Performance Document (if not exists)
        # We can upload one via `documents` API or insert to DB.
        # Let's use `documents` API.
        
        # Need to know the route. `documents.py` usually has upload.
        # Assuming `POST /api/documents/upload`
        files_pp = {"file": ("pp_ref.txt", "We successfully migrated 500 servers to AWS for Navy.", "text/plain")}
        res = await client.post(f"/api/documents/upload?company_id={company_id}", files=files_pp)
         # Note: route might be different. Let's assume we can query existing docs from DB or just fail if route wrong.
         # Alternatively, we can use the `test_opportunities` created extraction if we knew the ID.
         # But simpler to just proceed if 3.3 is pure backend logic check.
        
        # Let's try to list documents to pick one.
        res = await client.get(f"/api/documents/?company_id={company_id}")
        docs = res.json()
        if not docs:
             print("No docs found. Uploading one via API...")
             # Fallback route guess
             res = await client.post(f"/api/documents/?company_id={company_id}", files=files_pp)
             if res.status_code != 200:
                 print(f"Failed to upload PP doc: {res.text}")
                 # Try directly inserting to DB if API fails?
                 # Ignoring for now.
             else:
                 docs = [res.json()]
        
        if not docs:
            print("Still no docs. Cannot analyze.")
            return

        doc_id = docs[0]["id"]
        print(f"Using PP Doc: {doc_id}")
        
        # 4. Run Analysis
        print("Running Analysis... (This may take 30-60s)")
        payload = {
            "opportunity_id": opp_id,
            "document_ids": [doc_id]
        }
        
        # Increase timeout for this request
        res = await client.post("/api/analyses/", json=payload, timeout=90.0)
        
        if res.status_code == 201:
            print("✅ Analysis Success!")
            data = res.json()
            print(f"Analysis ID: {data['id']}")
            print(f"Score: {data['overall_relevance_score']}")
            print(f"Go/No-Go: {data.get('go_no_go_recommendation')}")
        else:
            print(f"❌ Analysis Failed: {res.status_code}")
            print(res.text)

if __name__ == "__main__":
    asyncio.run(run_test())
