
import asyncio
from unittest.mock import MagicMock
from app.services.analysis_engine import AnalysisEngine
from app.services.llm_service import LLMService
from app.models import Opportunity, Document, Company

def verify_prompt_fix():
    print("Verifying Analysis Engine Bug Fixes in Prompt...")
    
    # Mock LLM
    mock_llm = MagicMock(spec=LLMService)
    mock_llm.model = "claude-3-5-sonnet-20240620"
    engine = AnalysisEngine(mock_llm)
    
    # Mock Data
    opp = Opportunity(title="Test", solicitation_number="123")
    reqs = {"requirements": []}
    
    # Mock Document (CPARS)
    doc = Document(
        filename="cpars.pdf", 
        parsed_content={"performance_ratings": {"Quality": "Exceptional"}}
    )
    
    company = Company(name="Acme", primary_naics=["541511"])
    
    # Construct Prompt
    target_text = "SECTION L... SECTION M..."
    prompt = engine._construct_analysis_prompt(opp, reqs, target_text, [doc], company)
    
    # Checks
    print("\n--- Checks ---")
    if "PHASE 2B: SECTION L COMPLIANCE CHECK" in prompt:
        print("✅ Phase 2B (Compliance) instruction found.")
    else:
        print("❌ Phase 2B instruction MISSING.")
        
    if "CPARS / RATING EXTRACTION" in prompt:
         print("✅ CPARS Extraction instruction found.")
    else:
         print("❌ CPARS Extraction instruction MISSING.")

if __name__ == "__main__":
    verify_prompt_fix()
