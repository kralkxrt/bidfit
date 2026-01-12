import json
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.llm_service import LLMService
from app.models import Opportunity, Document, Analysis, OpportunityDocument, Company

class AnalysisEngine:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    async def run_analysis(
        self,
        db: AsyncSession,
        opportunity_id: UUID,
        document_ids: List[UUID],
        user_id: UUID,
        company_id: UUID
    ) -> Analysis:
        """
        Run the full gap analysis pipeline.
        
        1. Fetch Opportunity & Requirements
        2. Fetch selected Past Performance Documents
        3. Construct Analysis Prompt (Prompt 5 adapted for JSON)
        4. Call LLM
        5. Save Results
        """
        
        # 1. Fetch Opportunity
        opp_query = select(Opportunity).where(Opportunity.id == opportunity_id)
        opp_res = await db.execute(opp_query)
        opportunity = opp_res.scalars().first()
        if not opportunity:
            raise ValueError("Opportunity not found")
            
        # Fetch Opportunity Requirements (from OpportunityDocument)
        # Assuming we use the "last" uploaded PWS or merge them?
        # For Phase 3 MVP, let's grab the most recent parsed PWS requirements.
        pws_query = select(OpportunityDocument).where(
            OpportunityDocument.opportunity_id == opportunity_id,
            OpportunityDocument.document_type == 'pws'
        ).order_by(OpportunityDocument.created_at.desc())
        pws_res = await db.execute(pws_query)
        pws_doc = pws_res.scalars().first()
        
        parsed_requirements = {}
        if pws_doc and pws_doc.parsed_requirements:
            parsed_requirements = pws_doc.parsed_requirements
        else:
            # Fallback if no PWS parsed yet
             parsed_requirements = {"error": "No PWS requirements found."}

        # 2. Fetch Selected Documents
        docs_query = select(Document).where(Document.id.in_(document_ids))
        docs_res = await db.execute(docs_query)
        documents = docs_res.scalars().all()
        
        if not documents:
             raise ValueError("No valid documents found for analysis")

        # 2.5 Fetch Company Profile for Phase 0 Check
        company_query = select(Company).where(Company.id == company_id)
        comp_res = await db.execute(company_query)
        company = comp_res.scalars().first()
        
        if not company:
             raise ValueError("Company profile not found")

        # 3. Construct Prompt
        prompt = self._construct_analysis_prompt(opportunity, parsed_requirements, documents, company)
        
        # 4. Call LLM
        # Using a higher max_tokens for analysis (8000)
        analysis_response_text = await self.llm.analyze(prompt, max_tokens=8000)
        
        # Parse JSON
        try:
             analysis_data = self._parse_json_response(analysis_response_text)
        except Exception as e:
            print(f"JSON Parsing failed: {e}")
            # Fallback structure
            analysis_data = {
                "overall_relevance_score": 0,
                "overall_relevance_label": "ERROR",
                "raw_llm_response": analysis_response_text,
                "error": str(e)
            }

        # 5. Save Analysis
        analysis = Analysis(
            company_id=company_id,
            opportunity_id=opportunity_id,
            documents_analyzed=document_ids,
            created_by=user_id,
            
            # Existing Fields (Mapped from v2.0 structure)
            overall_relevance_score=str(analysis_data.get("overall_relevance_score", "0")),
            overall_relevance_label=analysis_data.get("overall_relevance_label", "UNKNOWN"),
            
            # Map go_no_go to existing fields
            go_no_go_recommendation=analysis_data.get("go_no_go"),
            go_no_go_reasoning=analysis_data.get("go_no_go_reasoning"),
            
            strengths=analysis_data.get("strengths", []),
            weaknesses=analysis_data.get("weaknesses", []),
            recommendations=analysis_data.get("recommendations", {}),
            
            # Map requirements_matrix to gap_matrix for backward compatibility if needed
            gap_matrix=analysis_data.get("requirements_matrix", []), 
            
            document_assessments=analysis_data.get("contract_assessments", []),
            
            # NEW v2.0 fields
            requirements_matrix=analysis_data.get("requirements_matrix", []),
            requirements_summary=analysis_data.get("requirements_summary", {}),
            contract_assessments=analysis_data.get("contract_assessments", []),
            red_flags=analysis_data.get("red_flags", []),
            evaluator_perspective=analysis_data.get("evaluator_perspective"),

            dimensional_scores=analysis_data.get("dimensional_scores", {}),
            
            # Phase 0
            company_compliance=analysis_data.get("company_compliance", {}),
            
            agent_confidence=float(analysis_data.get("confidence_score", 0.0)) if "confidence_score" in analysis_data else 0.0,
            raw_llm_response=analysis_response_text,
            
            model_version=self.llm.model,
            processing_time_seconds=0 
        )
        
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        
        return analysis

    def _construct_analysis_prompt(self, opportunity: Opportunity, requirements: Dict, documents: List[Document], company: Company) -> str:
        
        # Format Opportunity Details
        opp_details = f"""
**Title**: {opportunity.title}
**Solicitation**: {opportunity.solicitation_number or 'N/A'}
**Agency**: {opportunity.agency or 'N/A'}
**Estimated Value**: {opportunity.estimated_value or 'N/A'}
**NAICS Code**: {opportunity.naics_code or 'N/A'}
**Response Due**: {opportunity.response_due_date or 'N/A'}
**Scope Summary**: {opportunity.notes or 'N/A'}
"""

        # Format Requirements Text
        req_text = json.dumps(requirements, indent=2)
        
        # Format Documents Text
        docs_text = ""
        for i, doc in enumerate(documents):
            meta = doc.parsed_content or {}
            docs_text += f"""
### Reference {i+1}: {doc.contract_title or doc.filename}

**Contract Details**:
- Customer Agency: {doc.customer_agency or meta.get('customer_agency', 'N/A')}
- Service Branch: {meta.get('service_branch', 'N/A')}
- Contract Number: {doc.contract_number or meta.get('contract_number', 'N/A')}
- Contract Value: {doc.contract_value or meta.get('contract_value', 'N/A')}
- Period of Performance: {doc.period_of_performance_start or meta.get('pop_start', 'N/A')} to {doc.period_of_performance_end or meta.get('pop_end', 'N/A')}
- Contract Type: {doc.contract_type or meta.get('contract_type', 'N/A')}
- FTE Count: {doc.fte_count or meta.get('fte_count', 'N/A')}
- Locations: {doc.locations or meta.get('locations', 'N/A')}

**Work Performed & Capabilities**:
{meta.get('scope_summary', 'N/A')}

**Key Capabilities Demonstrated**:
{json.dumps(meta.get('key_capabilities', []), indent=1)}

**Performance Evidence (CPARS/Ratings)**:
{json.dumps(meta.get('performance_ratings', {}), indent=1)}
---
"""

        # Format Company Data
        company_data = f"""
**Name**: {company.name}
**Business Size**: {company.business_size or 'N/A'}
**Certifications**: {', '.join(company.certifications) if company.certifications else 'None'}
**GSA Schedules**: {', '.join([s.get('contract_number', 'N/A') for s in company.gsa_schedules]) if company.gsa_schedules else 'None'}
**Facility Clearance**: {company.facility_clearance or 'None'}
**NAICS Codes**: {', '.join(company.naics_codes) if company.naics_codes else 'None'}
**Geographic Coverage**: {', '.join(company.geographic_coverage) if company.geographic_coverage else 'None'}
**Bonding Capacity**: {company.bonding_capacity or 'N/A'}
"""

        # BidFit v2.0 JSON Schema
        json_schema = """
{
  "company_compliance": {
    "qualification_status": "QUALIFIED|CONDITIONAL|DISQUALIFIED",
    "disqualifiers": ["List of automatic disqualifiers found"],
    "compliance_flags": [
      {
        "field": "facility_clearance",
        "requirement": "Secret Clearance",
        "company_value": "Confidential",
        "status": "GAP|WEAKNESS|COMPLIANT",
        "note": "Explanation"
      }
    ]
  },
  "requirements_matrix": [
    {
      "req_id": "PWS-2.1.6.1",
      "category": "Personnel|Technical|Compliance|Deliverable|Performance|Operational",
      "requirement_text": "Full requirement text from PWS",
      "criticality": "CRITICAL|HIGH|MEDIUM|LOW",
      "coverage_status": "STRONG|MODERATE|WEAK|GAP",
      "supporting_evidence": ["Evidence from PP doc 1", "Evidence from PP doc 2"],
      "notes": "Additional context or concerns"
    }
  ],
  "requirements_summary": {
    "total": 26,
    "strong": 10,
    "moderate": 8,
    "weak": 4,
    "gap": 4,
    "coverage_percentage": 69
  },
  "contract_assessments": [
    {
      "contract_name": "LDSS",
      "contract_number": "W15P7T22C0014",
      "customer_agency": "ACC-APG",
      "service_branch": "Army",
      "contract_value": 5268827,
      "contract_type": "CPFF",
      "duration_months": 7,
      "fte_count": 13,
      "relevance_score": 65,
      "scope_match": "HIGH|PARTIAL|LOW",
      "environment_match": "MATCH|PARTIAL|MISMATCH",
      "primary_use": "Which PWS sections this contract supports",
      "limitations": ["Army only - no Navy/USMC environment", "7 months limited track record"],
      "is_padding": false
    }
  ],
  "dimensional_scores": {
    "scope_alignment": {
      "score": 75,
      "label": "HIGH",
      "strengths": [
        {"item": "HAZMAT lifecycle management", "evidence": "LDSS: cradle-to-grave operations documented"}
      ],
      "weaknesses": [
        {"item": "Navy CHRIMP experience", "evidence": "PP shows 'CHRIMP-like' not actual Navy CHRIMP"}
      ],
      "gaps": [
        {"item": "Navy/USMC personnel experience", "evidence": "All PP is Army environment only"}
      ]
    },
    "magnitude": {
      "score": 85,
      "label": "HIGH",
      "strengths": [], "weaknesses": [], "gaps": []
    },
    "complexity": {
      "score": 70,
      "label": "MODERATE",
      "strengths": [], "weaknesses": [], "gaps": []
    },
    "recency": {
      "score": 65,
      "label": "MODERATE",
      "strengths": [], "weaknesses": [], "gaps": []
    },
    "quality": {
      "score": 80,
      "label": "HIGH",
      "strengths": [], "weaknesses": [], "gaps": []
    }
  },
  "red_flags": [
    {
      "warning": "Do NOT claim direct NAVSUP customer relationship",
      "reason": "PP contracts are for Army ACC-APG, not Navy NAVSUP"
    }
  ],
  "evaluator_perspective": "Summary of how a government evaluator would likely view this submission...",
  "overall_relevance_score": 70,
  "overall_relevance_label": "RELEVANT",
  "go_no_go": "CONDITIONAL_GO",
  "go_no_go_reasoning": "Core HAZMAT capabilities demonstrated but critical gaps in Navy-specific experience require mitigation.",
  "strengths": [
    {
      "title": "HAZMAT Lifecycle Management",
      "evidence": "LDSS contract demonstrates cradle-to-grave operations",
      "pws_alignment": "Section 1.2.1",
      "impact": "HIGH"
    }
  ],
  "weaknesses": [
    {
      "title": "No Navy/USMC Personnel Experience",
      "evidence": "All PP contracts are Army environment",
      "risk_level": "HIGH",
      "mitigation": "Show individual personnel resumes with Navy backgrounds"
    }
  ],
  "recommendations": {
    "narrative_strategy": "Lead with HAZMAT lifecycle expertise...",
    "gap_mitigations": [
      {
        "gap": "Navy/USMC experience",
        "action": "Include personnel resumes showing Navy backgrounds",
        "priority": "HIGH"
      }
    ],
    "teaming_suggestion": "string"
  }
}
"""

        prompt = f"""
You are an expert Government Contract Proposal Evaluator conducting a Past Performance Gap Analysis. Your role is to objectively assess how well an offeror's past performance documents demonstrate capability to perform a new opportunity.

## CRITICAL EVALUATION PRINCIPLES

1. **BE SKEPTICAL OF CLAIMS**: Offerors will use marketing language to stretch relevance. Your job is to evaluate EVIDENCE, not accept claims at face value.

2. **FACTS vs. CLAIMS**:
   - FACT: Verifiable data (contract numbers, dollar values, dates, customer names)
   - CLAIM: Offeror assertions ("we achieved 95% accuracy", "CHRIMP-like operations")
   - Always distinguish between these. Claims require corroborating evidence.

3. **CUSTOMER MISMATCH RULE**: If the PP contract customer is DIFFERENT from the opportunity customer, you CANNOT claim "direct customer relationship" or "incumbent advantage." Army ≠ Navy. DHS ≠ DoD.

4. **"SIMILAR TO" RULE**: If PP document says "similar to," "like," "equivalent to," or "comparable to" a requirement, rate coverage as PARTIAL at best, never STRONG.

5. **SERVICE BRANCH SPECIFICITY**: If opportunity requires Navy/Marine Corps experience and PP shows Army-only experience, this is a GAP regardless of functional similarity.

6. **SHORT DURATION FLAG**: Contracts with <12 months performance have "limited track record" - flag this in recency assessment.

7. **SCOPE MISMATCH DETECTION**: If a PP contract's primary scope differs significantly from the opportunity (e.g., facility management vs. HAZMAT operations), question its relevance and note it may be "padding."

---

## PHASE 0: COMPANY QUALIFICATION CHECK (Do First)
Before analyzing past performance, check if the company is QUALIFIED to bid based on their profile data.

**Company Profile**:
{company_data}

**Check these against the opportunity details**:

1. **SET-ASIDE COMPLIANCE**
   - If opportunity is "8(a) Set-Aside" and company lacks 8(a) certification → DISQUALIFIED
   - If opportunity is "Small Business Set-Aside" and company is "Large Business" (Other Than Small) → DISQUALIFIED
   - If opportunity is "SDVOSB" and company lacks SDVOSB → DISQUALIFIED
   - Check certification usage.

2. **CLEARANCE REQUIREMENTS**
   - If opportunity requires "Top Secret" and company has "Secret" or "None" → GAP / DISQUALIFIED (depending on if they can sponsor)
   - If opportunity requires "Secret" and company has "None" → DISQUALIFIED

3. **CONTRACT VEHICLE REQUIREMENTS**
   - If opportunity notes "GSA Schedule required" and company has none → DISQUALIFIED
   - If opportunity is under OASIS/SEWP/etc. and company lacks access → DISQUALIFIED

4. **NAICS CODE CHECK**
   - If opportunity NAICS not in company's registered codes → FLAG (Need to add)

5. **GEOGRAPHIC REQUIREMENTS**
   - If opportunity requires OCONUS and company only does CONUS → FLAG

**Output a `company_compliance` section**:
- `qualification_status`: "QUALIFIED" | "CONDITIONAL" | "DISQUALIFIED"
- `compliance_flags`: List of specific checks {field, requirement, company_value, status, note}
- `disqualifiers`: List of automatic disqualifiers found.

---

## PHASE 1: REQUIREMENT EXTRACTION

Extract 25-40 requirements from the PWS/SOW document. Be exhaustive - evaluators will check coverage against ALL requirements, not just obvious ones. Focus on Personnel, Technical, Compliance, Deliverables, Performance Standards, and Operational requirements.

---

## PHASE 2: PAST PERFORMANCE DOCUMENT ANALYSIS

Analyze each PP document separately. Extract contract facts vs offeror claims. Period of performance, value, FTEs, customer service branch, and work scope.

---

## PHASE 3: REQUIREMENT-BY-REQUIREMENT GAP MAPPING

Map EVERY extracted requirement to PP evidence. Use strict coverage criteria:
- STRONG: Direct, verified evidence, same environment.
- MODERATE: Similar work, different environment.
- WEAK: Loosely related, significant interpretation required.
- GAP: No evidence or disqualifying mismatch.

---

## PHASE 4: CRITICAL EVALUATION & SCORING

Run false positive detection checklist. Did you claim direct customer relationship incorrectly? Did you rate "similar" as STRONG?
Provide dimensional scores (Scope, Magnitude, Complexity, Recency, Quality) with reasoning (strengths, weaknesses, gaps per dimension).
Overall Relevance Calculation: Scope(35%), Quality(25%), Magnitude(15%), Complexity(15%), Recency(10%).

---

## PHASE 5: OUTPUT GENERATION

Return the analysis in the exact JSON format specified below.

## TARGET OPPORTUNITY
{opp_details}

### Requirements Text
{req_text}

---

## COMPANY PAST PERFORMANCE PORTFOLIO
{docs_text}

---

## JSON OUTPUT SCHEMA (STRICT REQUIREMENT)
{json_schema}

Return ONLY the JSON object. No other text.
"""
        return prompt

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Helper to parse JSON from LLM response."""
        try:
            if "```json" in text:
                json_start = text.index("```json") + 7
                json_end = text.index("```", json_start)
                json_str = text[json_start:json_end].strip()
            elif "{" in text:
                json_start = text.index("{")
                json_end = text.rindex("}") + 1
                json_str = text[json_start:json_end]
            else:
                json_str = text
            return json.loads(json_str)
        except Exception as e:
            raise ValueError(f"Failed to parse JSON: {e}")
