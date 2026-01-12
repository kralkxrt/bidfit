# BidFit v2.0 - Implementation Summary for Agent

## QUICK REFERENCE: What's Changing

### NEW: Requirements Compliance Matrix (Top of Report)

Add a new section that appears FIRST in the analysis output - a scannable table showing every PWS requirement with a simple status icon.

```
┌────────────────────────────────────────────────────────────────────┐
│            REQUIREMENTS COMPLIANCE MATRIX                          │
│            XX of YY Requirements Covered (ZZ%)                     │
│            ✅ AA Strong | ⚠️ BB Moderate | ❌ CC Gaps              │
├──────────┬─────────────────────────────────────────────┬──────────┤
│ REQ ID   │ REQUIREMENT                                 │ STATUS   │
├──────────┼─────────────────────────────────────────────┼──────────┤
│ PWS-2.1.6│ Truck Driver: 2 yrs + 2 yrs Navy/USMC exp  │ ❌ GAP   │
│ PWS-2.2.4│ 95% inventory accuracy                      │ ✅ STRONG│
│ PWS-2.2.5│ 812-992 locker assessments annually         │ ❌ GAP   │
│ PWS-1.2.1│ OSHA/HAZCOM compliance                      │ ✅ STRONG│
│ ...      │ ...                                         │ ...      │
└──────────┴─────────────────────────────────────────────┴──────────┘
```

**Implementation:**
1. New DB field or JSON structure to store requirement-level assessments
2. Frontend component to render the matrix table
3. Summary stats calculation (X of Y covered, breakdown by status)

---

## CRITICAL FIXES NEEDED

### Fix 1: Add Critical Evaluation Rules to Analysis Prompt

Add these rules to `04-AI-PROMPTS-agent-instructions.md` Section 5 (Gap Analysis):

```
CRITICAL EVALUATION RULES - PREVENT FALSE POSITIVES:

1. CUSTOMER MISMATCH: If PP customer ≠ opportunity customer, do NOT claim 
   "direct customer relationship." Army contracts ≠ Navy experience.

2. "SIMILAR TO" RULE: If PP says "similar to," "like," or "equivalent to" 
   a requirement, rate as PARTIAL/WEAK coverage, never STRONG.

3. SERVICE BRANCH CHECK: If opportunity requires Navy/USMC experience and 
   PP shows Army-only, flag as GAP regardless of functional similarity.

4. SHORT DURATION FLAG: Contracts with <12 months = "limited track record"

5. SCOPE MISMATCH: If PP contract's primary scope differs from opportunity 
   (e.g., facility management vs. operations), question relevance.

6. FACTS vs CLAIMS: Distinguish verifiable facts (contract #, value, dates) 
   from offeror claims ("we achieved 95%"). Claims need corroboration.
```

### Fix 2: Improve Requirement Extraction

Current extraction is too sparse (9 requirements). Need 25+.

**Update extraction prompt to specifically look for:**

```
EXTRACT ALL REQUIREMENTS INCLUDING:

PERSONNEL (per labor category):
- Years of total experience required
- Years in specific environment (Navy/Army/USMC)
- Certifications (CDL, DOT, security clearance level)
- Education requirements
- Physical requirements

TECHNICAL:
- Named systems (Navy ERP, HMM Tool, WEBFLIS, etc.)
- Equipment types (MHE, forklifts, vehicles by weight class)
- Specific processes (CHRIMP, shelf-life management, etc.)

COMPLIANCE:
- Every regulation cited (OSHA, DOT 49 CFR, EPCRA, ISO 14001, etc.)
- Security requirements (NACLC, SECRET, CAC)
- Training requirements (Table 5 in typical Navy PWS)

DELIVERABLES WITH QUANTITIES:
- "812-992 locker assessments annually" 
- "QA Plan within 30 days"
- "Monthly status report by 10th of month"
- Response time requirements ("2-hour emergency response")

PERFORMANCE METRICS:
- Accuracy standards ("95% inventory accuracy")
- Service levels
- Quality thresholds
```

### Fix 3: Add Contract-Level Relevance Scoring

Before rolling up to overall score, assess each PP contract individually:

```python
# New structure for each PP contract
contract_assessment = {
    "contract_id": "...",
    "contract_name": "...",
    "customer_agency": "ACC-APG",  # EXACT customer
    "service_branch": "Army",       # Army/Navy/USMC/Air Force/Civilian
    "contract_value": 5268827,
    "duration_months": 7,
    "fte_count": 13,
    "primary_scope": "HAZMAT logistics",
    
    # Individual relevance scores
    "scope_match": 75,
    "magnitude_match": 85,
    "environment_match": 40,  # Army vs Navy requirement = low
    "recency_score": 60,      # Only 7 months = limited
    
    "overall_relevance": 65,
    "primary_use": "Sections 2.1-2.3 HAZMAT operations",
    "limitations": ["Army only - no Navy/USMC environment", "7 months limited track record"],
    "is_padding": False  # Flag if scope doesn't match
}
```

### Fix 4: Add Dimensional Score Reasoning

Don't just output "HIGH" - show WHY:

```python
dimensional_scores = {
    "scope_alignment": {
        "score": 75,
        "label": "HIGH",
        "strengths": [
            {"item": "HAZMAT lifecycle management", "evidence": "LDSS: cradle-to-grave operations"},
            {"item": "95% inventory accuracy", "evidence": "LDSS: same standard documented"}
        ],
        "weaknesses": [
            {"item": "Navy CHRIMP experience", "evidence": "PP shows 'CHRIMP-like' not actual Navy CHRIMP"},
            {"item": "Locker assessments", "evidence": "No documentation of locker assessment work"}
        ],
        "gaps": [
            {"item": "Navy/USMC personnel experience", "evidence": "All PP is Army environment"}
        ]
    },
    # ... other dimensions
}
```

### Fix 5: Add Red Flags Section

New section in output to warn users what NOT to do:

```python
red_flags = [
    {
        "warning": "Do NOT claim 'direct NAVSUP customer relationship'",
        "reason": "PP contracts are for Army ACC-APG, not Navy"
    },
    {
        "warning": "Do NOT claim 'Navy CHRIMP experience'", 
        "reason": "PP says 'CHRIMP-like' operations - this is Army logistics, not Navy CHRIMP"
    },
    {
        "warning": "MUST address locker assessment capability",
        "reason": "PWS requires 812-992 assessments/year - zero evidence in PP"
    }
]
```

### Fix 6: Add Evaluator Perspective

New field that summarizes how a government evaluator would view this:

```python
evaluator_perspective = """
An evaluator will likely note that while HAZMAT logistics capability is 
demonstrated through the LDSS contract, the Army-only experience creates 
uncertainty about Navy-specific CHRIMP protocols. The locker assessment 
requirement (812-992/year) has no coverage. The 7-month contract duration 
provides limited performance data. Expected rating: Satisfactory Confidence 
unless Navy-specific experience is demonstrated in the proposal narrative.
"""
```

---

## UPDATED DATA MODELS

### RequirementAssessment (New)

```python
class RequirementAssessment(BaseModel):
    req_id: str                    # "PWS-2.1.6.1"
    category: str                  # Personnel|Technical|Compliance|Deliverable|Performance
    requirement_text: str          # Full requirement text
    criticality: str               # CRITICAL|HIGH|MEDIUM|LOW
    coverage_status: str           # STRONG|MODERATE|WEAK|GAP
    supporting_evidence: list[str] # Evidence from PP docs
    notes: str                     # Additional context
```

### AnalysisResult (Updated)

```python
class AnalysisResult(BaseModel):
    # NEW: Requirements matrix
    requirements_matrix: list[RequirementAssessment]
    requirements_summary: dict  # {"total": 25, "strong": 10, "moderate": 8, "weak": 3, "gap": 4}
    
    # NEW: Contract-level assessments
    contract_assessments: list[ContractAssessment]
    
    # UPDATED: Dimensional scores with reasoning
    dimensional_scores: dict  # Includes strengths/weaknesses/gaps per dimension
    
    # NEW: Red flags
    red_flags: list[dict]
    
    # NEW: Evaluator perspective
    evaluator_perspective: str
    
    # Existing fields (keep)
    overall_relevance_score: int
    overall_relevance_label: str
    go_no_go: str
    go_no_go_reasoning: str
    strengths: list[dict]
    weaknesses: list[dict]
    recommendations: dict
```

---

## UPDATED ANALYSIS PROMPT STRUCTURE

### Phase 1: Requirement Extraction
- Extract ALL requirements (target: 20-40 per typical PWS)
- Categorize each requirement
- Assign criticality level
- Note if requirement has specific metric

### Phase 2: PP Document Analysis  
- Extract facts vs. claims separately
- Assess each contract's individual relevance
- Check service branch match
- Flag short-duration contracts
- Identify potential "padding" contracts

### Phase 3: Requirement Mapping
- Map EVERY requirement to evidence
- Apply skepticism to "similar/like" claims
- Use strict coverage criteria
- Document evidence source for each

### Phase 4: Critical Evaluation
- Run false positive detection checklist
- Calculate dimensional scores with reasoning
- Determine overall score and Go/No-Go
- Write evaluator perspective

### Phase 5: Output Generation
- Requirements Compliance Matrix (NEW - TOP)
- Executive Summary
- Detailed Analysis
- Red Flags (NEW)
- Strategic Recommendations

---

## FILE CHANGES NEEDED

1. **04-AI-PROMPTS-agent-instructions.md**
   - Update Section 5 (Gap Analysis) with critical evaluation rules
   - Update Section 6 (Output Format) with new sections
   - Add requirement extraction guidelines

2. **Backend: models.py**
   - Add RequirementAssessment model
   - Add ContractAssessment model
   - Update Analysis model with new fields

3. **Backend: analysis_engine.py**
   - Update prompt construction
   - Add requirements matrix generation
   - Add contract-level scoring
   - Add red flags extraction

4. **Backend: export_service.py**
   - Update DOCX template with Requirements Matrix section
   - Add Red Flags section
   - Add Evaluator Perspective section

5. **Frontend: AnalysisResults page**
   - Add Requirements Matrix component (collapsible table)
   - Add Red Flags alert component
   - Add Evaluator Perspective callout
   - Update dimensional scores to show reasoning

---

## DOCX EXPORT TEMPLATE UPDATE

```
Page 1: Cover + Requirements Compliance Matrix
- Title, date, opportunity name
- Full requirements matrix table
- Summary stats bar

Page 2: Executive Summary
- Score badges (Overall, Go/No-Go, Confidence)
- Key findings bullets
- Evaluator Perspective box

Page 3-4: Detailed Analysis
- Dimensional scores with progress bars
- Per-dimension strengths/weaknesses

Page 5-6: Gap Analysis
- Critical gaps (red)
- High-risk weaknesses (orange)
- Moderate concerns (yellow)

Page 7: Strengths
- Bulleted list with evidence

Page 8: Strategic Recommendations
- RED FLAGS box (prominent, red border)
- Gap mitigation checklist
- Narrative strategy

Page 9: Appendix
- Documents analyzed
- Methodology note
```

---

## TESTING CHECKLIST

After implementation, test with the NAVSUP HAZMAT case:

- [ ] Requirements matrix shows 25+ requirements (not 9)
- [ ] Navy/USMC experience gap is flagged
- [ ] Locker assessment gap is flagged
- [ ] "Direct customer relationship" is NOT claimed (PP is Army)
- [ ] "CHRIMP experience" is rated WEAK/PARTIAL, not STRONG
- [ ] 7-month contract duration is noted as limited
- [ ] PdM SATCOM is noted as lower relevance / different scope
- [ ] Red flags section warns against overclaiming
- [ ] Overall score is ~70% RELEVANT, not VERY RELEVANT
- [ ] Go/No-Go is CONDITIONAL GO, not unconditional GO
- [ ] Evaluator perspective accurately assesses government view
