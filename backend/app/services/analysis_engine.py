import json
from typing import List, Dict, Any, Optional
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
        # Prioritize RFP/Solicitation for full analysis, then PWS/SOW.
        # We fetch ALL relevant docs (RFP + Amendments) to ensure full context.
        # Sorting ASC to reconstruct timeline: RFP -> Amend 1 -> Amend 2
        doc_query = select(OpportunityDocument).where(
            OpportunityDocument.opportunity_id == opportunity_id,
            OpportunityDocument.document_type.in_(['rfp', 'solicitation', 'pws', 'sow', 'amendment', 'other'])
        ).order_by(OpportunityDocument.created_at.asc())
        
        doc_res = await db.execute(doc_query)
        target_docs = doc_res.scalars().all()
        
        parsed_requirements = {}
        target_doc_text = ""
        
        if target_docs:
            # Consolidate requirements from ALL documents
            # Logic:
            # 1. Sort documents by creation date (RFP first, Amendments later)
            # 2. Iterate and merge requirements into a map by ID
            # 3. Later documents override earlier ones for the same ID
            
            # Sort documents by created_at if available
            sorted_docs = sorted(target_docs, key=lambda d: d.created_at or datetime.min)
            
            requirements_map = {}
            for doc in sorted_docs:
                if doc.parsed_requirements and "requirements" in doc.parsed_requirements:
                    for req in doc.parsed_requirements["requirements"]:
                        # Use ID as key - later docs override earlier
                        req_id = req.get("id")
                        if req_id:
                            requirements_map[req_id] = req
                
                # Concatenate text with separators for ALL documents
                if doc.raw_text:
                    target_doc_text += f"\n\n--- DOCUMENT: {doc.filename} ({doc.document_type}) ---\n"
                    target_doc_text += doc.raw_text
            
            # If map is populated, set parsed_requirements
            if requirements_map:
                print(f"DEBUG: Consolidated {len(requirements_map)} unique requirements from {len(sorted_docs)} documents.")
                
                # Filter out Administrative/Formatting noise
                # We want to focus on substantive requirements (Technical, Performance, Experience)
                SKIP_KEYWORDS = [
                    "font size", "font type", "times new roman", "margins", "page limit", 
                    "paper size", "copies", "binder", "electronic format", "microsoft word",
                    "pdf format", "submission deadline", "delivery address", "labeling"
                ]
                
                filtered_requirements = []
                for req in requirements_map.values():
                    text = req.get("text", "").lower() + " " + req.get("requirement_text", "").lower()
                    category = req.get("category", "").lower()
                    
                    # Skip if strictly formatting/admin
                    if "formatting" in category or "administrative" in category or "submission instruction" in category:
                         # Exception: specific Section L content requirements are technically "submission instructions" 
                         # but we want "content" not "format"
                         pass 
                    
                    # Check keywords
                    if any(kw in text for kw in SKIP_KEYWORDS):
                        continue
                        
                    filtered_requirements.append(req)
                
                print(f"DEBUG: Filtered down to {len(filtered_requirements)} substantive requirements.")
                
                # Sort by Criticality (CRITICAL -> HIGH -> MEDIUM -> LOW)
                criticality_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
                filtered_requirements.sort(key=lambda x: criticality_order.get(x.get("criticality", "UNKNOWN").upper(), 4))
                
                # Cap at 50 to ensure high-quality analysis
                final_requirements = filtered_requirements[:50]
                
                parsed_requirements = {
                    "document_type": "CONSOLIDATED", 
                    "requirements": final_requirements
                }
        else:
            # Fallback
             parsed_requirements = {"error": "No requirements document found."}
             target_doc_text = "No solicitation document text available."

        # 2. Fetch Selected Documents
        docs_query = select(Document).where(Document.id.in_(document_ids))
        docs_res = await db.execute(docs_query)
        documents = docs_res.scalars().all()
        
        print(f"DEBUG: Requested {len(document_ids)} documents. Fetched {len(documents)} from DB.")
        for d in documents:
            print(f" - Found Doc: {d.id} | {d.filename}")
        
        if not documents:
             raise ValueError("No valid documents found for analysis")

        # 2.5 Fetch Company Profile for Phase 0 Check
        company_query = select(Company).where(Company.id == company_id)
        comp_res = await db.execute(company_query)
        company = comp_res.scalars().first()
        
        if not company:
             raise ValueError("Company profile not found")
    
        # 3. Construct Prompt
        # Truncate target_doc_text to avoid context window overflow (e.g. 150k chars)
        # We prioritize the END of the text if it's too long? OR the beginning?
        # Amendments are usually at the end (if ASC). RFP is at start.
        # Let's keep the first 150k.
        truncated_text = target_doc_text[:150000] 
        prompt = self._construct_analysis_prompt(opportunity, parsed_requirements, truncated_text, documents, company)
        
        print(f"DEBUG: Prompt constructed. Length: {len(prompt)} chars.")
        
        # 4. Call LLM
        # Using a higher max_tokens for analysis (8000)
        analysis_response_text = await self.llm.analyze(prompt, max_tokens=8000)
        
        # Parse JSON
        try:
             analysis_data = self._parse_json_response(analysis_response_text)
             assessments = analysis_data.get("contract_assessments", [])
             req_matrix = analysis_data.get("requirements_matrix", [])
             print(f"DEBUG: LLM returned {len(assessments)} contract assessments.")
             print(f"DEBUG: LLM returned {len(req_matrix)} rows in requirements_matrix (Input was {len(parsed_requirements.get('requirements', []))}).")
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
            document_analysis=analysis_data.get("document_analysis", {}),
            
            agent_confidence=float(analysis_data.get("confidence_score", 0.0)) if "confidence_score" in analysis_data else 0.0,
            raw_llm_response=analysis_response_text,
            
            model_version=self.llm.model,
            processing_time_seconds=0 
        )
        
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        
        return analysis

    def _construct_analysis_prompt(self, opportunity: Opportunity, requirements: Dict, target_doc_text: str, documents: List[Document], company: Company) -> str:
        
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
        # Safely handle JSON fields
        certs = company.certifications if isinstance(company.certifications, list) else (company.certifications or [])
        gsa = company.gsa_schedules if isinstance(company.gsa_schedules, list) else (company.gsa_schedules or [])
        naics = company.primary_naics if isinstance(company.primary_naics, list) else (company.primary_naics or [])
        geo = company.geographic_coverage if isinstance(company.geographic_coverage, list) else (company.geographic_coverage or [])

        # Format GSA string separately to avoid f-string complexity issues
        if gsa:
            gsa_list = [s.get('contract_number', 'N/A') if isinstance(s, dict) else str(s) for s in gsa]
            gsa_str = ', '.join(gsa_list)
        else:
            gsa_str = 'None'
        
        company_data = f"""
**Name**: {company.name}
**Business Size**: {company.business_size or 'N/A'}
**Certifications**: {', '.join(certs) if certs else 'None'}
**GSA Schedules**: {gsa_str}
**Facility Clearance**: {company.facility_clearance or 'None'}
**NAICS Codes**: {', '.join(naics) if naics else 'None'}
**Geographic Coverage**: {', '.join(geo) if geo else 'None'}
**Bonding Capacity**: {company.bonding_capacity or 'N/A'}
"""

        # BidFit v2.0 JSON Schema
        json_schema = """
{
  "document_analysis": {
    "document_type": "RFP|PWS|SOW",
    "sections_identified": ["Section C", "Section L", "Section M"],
    "scope_overview": {
      "summary": "High-level description of the procurement scope (Section C)",
      "key_objectives": ["Obj 1", "Obj 2"]
    },
    "pp_requirements": {
      "references_required": {"min": 3, "max": 5},
      "recency_years": 6,
      "completion_threshold": "65%",
      "contract_value": {"min": 500000, "max": 20000000},
      "mandatory_requirements": ["At least 1 Design-Build project"],
      "geographic_preference": "RMACC region preferred",
      "cpars_requested": true
    },
    "evaluation_factors": {
      "past_performance_weight": "Significantly more important than cost",
      "rating_scale": ["Substantial Confidence", "Satisfactory Confidence", "Limited Confidence"]
    }
  },
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

## PHASE 0A: DOCUMENT TYPE DETECTION
First, identify what type of document(s) you're analyzing by looking at the provided "TARGET SOLICITATION DOCUMENT TEXT" below.

Document Types:
- **PWS/SOW**: Direct task/requirement listing. Proceed to Phase 1.
- **RFP (Request for Proposal)**: Full solicitation (Sections A-M).
- **Sources Sought**: Market research.

**IF RFP DETECTED (CRITICAL)**:
You must extract data from the following sections if present:
- **Section C (Description/SOW)**: This is your PRIMARY source for Phase 1 Requirement Extraction. Extract a high-level summary for the 'scope_overview' field.
- **Section H (Special Requirements)**: Extract clearance, certs, and goals for Company Compliance checks.
- **Section L (Instructions)**: **CRITICAL - Extract EXACT numeric values using patterns below:**

  **PATTERN 1 - References Required:**
  Look for text like: "minimum of three (3) and a maximum of five (5) relevant... projects"
  → Extract as: {{"references_required": {{"min": 3, "max": 5}}}}

  **PATTERN 2 - Contract Value Range:**
  Look for text like: "contract value of approximately $500,000 to $20,000,000"
  → Extract as: {{"contract_value": {{"min": 500000, "max": 20000000}}}}

  **PATTERN 3 - Recency Period:**
  Look for text like: "65% complete within six-year period" or "within 6 years"
  → Extract as: {{"recency_years": 6, "completion_threshold": "65%"}}

  **PATTERN 4 - Mandatory Requirements:**
  Look for text like: "At least one (1) of the submitted projects must clearly demonstrate experience utilizing the Design-Build method"
  → Extract as: {{"mandatory_requirements": ["At least 1 Design-Build project"]}}

  **PATTERN 5 - CPARS Preference:**
  Look for text like: "CPARS report shall be submitted" or "PPQ may be submitted if CPARS not available"
  → Extract as: {{"cpars_requested": true}}

- **Section M (Evaluation)**: Extract weighting, scoring factors, and evaluation method.

**CRITICAL FOR SECTION L**: Do NOT use vague text. Extract ACTUAL NUMBERS:
- ❌ BAD: "references_required": "relevant projects"
- ✅ GOOD: "references_required": {{"min": 3, "max": 5}}

Output a `document_analysis` block in the JSON (only if RFP detected).

**IF NOT RFP**:
Set `document_analysis` to null or simple type "PWS".

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
- `compliance_flags`: List of specific checks {{field, requirement, company_value, status, note}}
- `disqualifiers`: List of automatic disqualifiers found.

---

## PHASE 1: REQUIREMENT EXTRACTION

Extract 25-40 requirements from the PWS/SOW/RFP document. Be exhaustive.

**SECTIONS TO EXTRACT FROM**:
- **Section C** (Description/SOW/PWS): Technical and performance requirements
- **Section E** (Inspection & Acceptance): Quality control requirements
- **Section F** (Deliverables): Deliverable requirements
- **Section H** (Special Contract Requirements): Special requirements
- **Section L** (Instructions to Offerors): Compliance and submission requirements
- **Section M** (Evaluation Criteria): Evaluation factors and scoring criteria

**ID FORMAT CRITICAL RULE**: Use the EXACT section number from the document (e.g., "C.1.2", "L.5.1.a", "M.3.1", "H-3"). DO NOT use generic prefixes like "SOW-" or "REQ-" unless the document uses them. Evaluators must be able to find the section by this ID.

**Section L Requirements** (Examples):
- L.5.1.a: Submit minimum 3, maximum 5 relevant construction projects
- L.5.1.b: Each project must be $500K-$20M contract value
- L.5.1.c: Projects must be 65% complete within 6 years
- L.5.1.e: At least 1 project must be Design-Build
- L.5.2: Submit CPARS or PPQ for each cited project

**Section M Requirements** (Examples):
- M.3.1: Demonstrate similar size, scope, and complexity
- M.3.2: Past performance relevance and quality

Focus on Personnel, Technical, Compliance, Deliverables, Performance Standards, and Operational requirements.

---

## PHASE 2: PAST PERFORMANCE DOCUMENT ANALYSIS

**CRITICAL FIRST STEP**: You are analyzing exactly {len(documents)} documents provided below.
Before proceeding with analysis, list each document by filename to confirm receipt:
1. [Document 1 filename]
2. [Document 2 filename]
... etc.

You MUST analyze ALL {len(documents)} documents. Do not skip any.

---

Analyze each PP document separately. Extract contract facts vs offeror claims. Period of performance, value, FTEs, customer service branch, and work scope.

**DOCUMENT CLASSIFICATION RULE (CRITICAL):**
- Identify if the document is a **Specific Contract/CPARS** or a **General Narrative/Capability Statement**.
- **IF NARRATIVE (e.g., "Talion Past Performance", "Capability Statement"):**
  - Do NOT create a "Contract Assessment" entry for it.
  - Do NOT count it towards the "contracts qualifying" count.
  - Use its content ONLY for supporting evidence in the text.
- **IF CONTRACT:**
  - Create a "Contract Assessment" entry.

**CUSTOMER MATCH LABELS:**
- For "Customer Match", use ONLY these labels:
  - **DIRECT MATCH**: Same Agency (e.g. USCG to USCG)
  - **PARTIAL MATCH**: Same Department but diff Agency (e.g. DHS to TSA), or Federal to Federal (e.g. VA to USCG).
  - **NO MATCH**: Commercial or unrelated.
- Do NOT use "N/A".

**CPARS / RATING EXTRACTION (REDUNDANT CHECK):**
- Look for CPARS or Performance Evaluation forms within the document.
- Extract adjectival ratings (e.g., "Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory").
- Common rating elements: Quality, Schedule, Cost Control, Management, Small Business Subcontracting, Regulatory Compliance
- If found, list them in the contract_assessments output
- If not found, explicitly state "No CPARS Included"
- **CRITICAL**: If any rating is "Marginal" or "Unsatisfactory", this MUST be flagged (see Phase 2D below)

---

## PHASE 2B: SECTION L COMPLIANCE CHECK
If "Section L" requirements were found in Phase 0A (e.g., Min Value in `pp_requirements`):
- Count how many submitted documents meets the **Minimum Contract Value**.
- Count how many submitted documents meet the **Recency** criteria.
- Compare this count against `references_required`.

**Outcome**:
- If Valid Count < Required Count → FLAG AS RED FLAG / WEAKNESS ("Insufficient qualifying references").

---

## PHASE 2C: PROJECT COUNT VALIDATION (CRITICAL)

**Using the `pp_requirements` extracted in Phase 0A, validate the submitted portfolio.**

**Step 1: Get thresholds from pp_requirements**
- `min_required`: pp_requirements.references_required.min (e.g., 3)
- `value_min`: pp_requirements.contract_value.min (e.g., 500000)
- `value_max`: pp_requirements.contract_value.max (e.g., 20000000)

**Step 2: For each submitted contract, check if value is within range**
- Contract value >= value_min AND contract value <= value_max → QUALIFIES
- Contract value < value_min → DOES NOT QUALIFY (below threshold)
- Contract value > value_max → DOES NOT QUALIFY (above threshold)

**Step 3: Count qualifying contracts and compare to minimum**
Example for Talion portfolio against USCG RMACC requirement ($500K-$20M, min 3):
- VA EHRM $4.77M → ✅ QUALIFIES (within range)
- VA Bi-Plane $1.08M → ✅ QUALIFIES (within range)
- USCG Novato $312K → ❌ DOES NOT QUALIFY (below $500K)
- USCG Galley $105K → ❌ DOES NOT QUALIFY (below $500K)
Result: 2 of 3 required → COMPLIANCE GAP

**Step 4: If qualifying count < min_required, add compliance flag:**
```
{{
  "field": "minimum_project_count",
  "requirement": "Minimum 3 projects at $500K-$20M (Section L.5.1)",
  "company_value": "2 of 4 contracts qualify",
  "status": "GAP",
  "note": "Only 2 contracts meet value threshold. Need 1 more qualifying project. Qualifying: VA EHRM ($4.77M), VA Bi-Plane ($1.08M). Non-qualifying: USCG Novato ($312K - below threshold), USCG Galley ($105K - below threshold). RECOMMEND: Teaming arrangement or additional qualifying past performance."
}}
```

**Step 5: This triggers CONDITIONAL_GO (not GO) in Phase 5**

---

## PHASE 2D: NEGATIVE CPARS RATING DETECTION (New)
For each contract with CPARS ratings:
1. Check if ANY rating is "Marginal" or "Unsatisfactory"
2. If found:
   - Add to red_flags:
     ```
     {{
       "warning": "[Rating Element] rated Marginal/Unsatisfactory on [Contract Name]",
       "reason": "CPARS shows [element]: [rating]. [Include contractor dispute if present]",
       "mitigation": "Address proactively in proposal narrative, emphasize corrective actions"
     }}
     ```
   - Include in contract_assessments limitations
   - Note in dimensional_scores.quality.weaknesses

---

## PHASE 3: REQUIREMENT-BY-REQUIREMENT GAP MAPPING

**CRITICAL INSTRUCTION**: You must map EVERY SINGLE REQUIREMENT listed in the `pp_requirements` section above to the Past Performance evidence.
- There are **{len(requirements.get('requirements', []))}** requirements provided.
- Your output Matrix MUST have exactly **{len(requirements.get('requirements', []))}** rows.
- **CONCISENESS RULE**: Keep evidence descriptions concise (under 20 words) to ensure you can process ALL {len(requirements.get('requirements', []))} requirements within the output limit.
- Do NOT skip requirements. Do NOT summarize.
- If a requirement is not addressed in the documents, mark it as "GAP" with note "No evidence found".

Map specific Past Performance Evidence:
**CRITICAL EVIDENCE RULE**: You must textualize the source document for every piece of evidence.
Format: "Evidence statement here... [Source: Document Name]"
or "Evidence statement here... [Source: Contract #]"
Example: "Experience with lead abatement shown in range safety project [Source: USCG Novato CPARS]"

Use strict coverage criteria:
- STRONG: Direct, verified evidence, same environment, CPARS supports it.
- MODERATE: Similar work, different environment.
- WEAK: Loosely related, significant interpretation required.
- GAP: No evidence or disqualifying mismatch.

---

## PHASE 4: CRITICAL EVALUATION & SCORING

Run false positive detection checklist. Did you claim direct customer relationship incorrectly? Did you rate "similar" as STRONG?
Provide dimensional scores (Scope, Magnitude, Complexity, Recency, Quality) with reasoning (strengths, weaknesses, gaps per dimension).
Overall Relevance Calculation: Scope(35%), Quality(25%), Magnitude(15%), Complexity(15%), Recency(10%).

---

## PHASE 5: GO/NO-GO DECISION LOGIC (CRITICAL - COMPLIANCE OVERRIDES PERCENTAGE)

**THE FINAL RECOMMENDATION MUST FOLLOW THIS DECISION TREE. DO NOT USE PERCENTAGE ALONE.**

### STEP 1: Check for HARD DISQUALIFIERS (→ NO-GO)
If ANY of these are true, the recommendation is **NO-GO** (red flag):
- Set-aside certification missing (e.g., 8(a), SDVOSB, HUBZone required but company doesn't have it)
- Minimum project count cannot be resolved (e.g., need 3 projects with 0-1 qualifying)
- Required bonding capacity missing AND cannot be obtained
- Mandatory capability completely absent with no path to resolution

### STEP 2: Check for SOFT BLOCKERS (→ CONDITIONAL)
**If ANY of these conditions exist from Phase 2C/2D or company_compliance, use CONDITIONAL (yellow flag):**
- **Minimum project count not fully met** (e.g., 2 of 3 required) → CONDITIONAL
- **Bonding capacity not documented** → CONDITIONAL
- **Negative CPARS ratings** (Marginal/Unsatisfactory) present → CONDITIONAL
- **Critical capability gaps mitigable via teaming** → CONDITIONAL
- **Geographic experience gap** (non-mandatory but relevant) → CONDITIONAL

**For CONDITIONAL, you MUST include "Path to GO" in go_no_go_reasoning:**
```
Path to GO:
1. Secure teaming partner with qualifying $500K+ project to meet minimum count
2. Prepare narrative mitigation for Marginal Small Business rating
3. Document bonding capacity with surety letter
If blockers cannot be resolved → NO-GO
```

### STEP 3: All Clear (→ GO)
**ONLY recommend GO (green flag) if:**
- All compliance requirements met (project count, certifications, etc.)
- No negative CPARS ratings
- Strong capability match exists
- Percentage score supports the recommendation

### ENFORCEMENT RULE
**The go_no_go_recommendation field MUST be:**
- **"NO-GO"** if Step 1 conditions exist
- **"CONDITIONAL"** if Step 2 conditions exist (even with high percentage)
- **"GO"** only if Step 1 AND Step 2 are clear

**Example:** If percentage is 72% but project count is 2/3 → Recommendation = **CONDITIONAL** (not GO)

---

## PHASE 6: OUTPUT GENERATION

Return the analysis in the exact JSON format specified below.

## TARGET OPPORTUNITY
{opp_details}

### TARGET SOLICITATION DOCUMENT TEXT (Truncated)
{target_doc_text}

### Requirements Text (Pre-Extracted)
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
