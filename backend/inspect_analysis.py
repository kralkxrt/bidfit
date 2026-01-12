
import asyncio
from app.database import SessionLocal
from app.models import Analysis, Opportunity
from sqlalchemy import select, desc
import json

async def check_recent_analysis():
    print("Fetching most recent analysis...")
    
    async with SessionLocal() as db:
        query = (
            select(Analysis)
            .order_by(desc(Analysis.created_at))
            .limit(1)
        )
        result = await db.execute(query)
        analysis = result.scalars().first()
        
        if not analysis:
            print("No analysis found.")
            return

        print(f"Analysis ID: {analysis.id}")
        print(f"Created At: {analysis.created_at}")
        print(f"Opp ID: {analysis.opportunity_id}")
        
        # Check Document Analysis (New Feature)
        if analysis.document_analysis:
            print("\n--- RFP Document Analysis (Phase 0A) ---")
            print(json.dumps(analysis.document_analysis, indent=2))
        else:
            print("\n--- No RFP Document Analysis Found (Legacy or PWS) ---")
            
        # Check Compliance (Phase 0)
        if analysis.company_compliance:
            print("\n--- Company Compliance (Phase 0) ---")
            print(json.dumps(analysis.company_compliance, indent=2))
            
        # Check Results
        print("\n--- Results ---")
        print(f"Score: {analysis.overall_relevance_score}")
        print(f"Recommendation: {analysis.go_no_go_recommendation}")
        print(f"Reasoning: {analysis.go_no_go_reasoning}")
        
        if analysis.requirements_summary:
             print("\n--- Requirements Summary ---")
             print(json.dumps(analysis.requirements_summary, indent=2))

if __name__ == "__main__":
    asyncio.run(check_recent_analysis())
