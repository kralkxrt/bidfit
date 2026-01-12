# AI Agent Prompts
## Past Performance Gap Analysis Agent

---

## 1. Overview

This document contains all LLM prompts used by the system. Prompts are the core intelligence of the application and should be treated as critical code - versioned, tested, and iterated carefully.

**Model**: Claude claude-sonnet-4-20250514 (primary), Claude Haiku (fallback for simple tasks)
**Temperature**: 0.3 for analysis tasks (consistency), 0.7 for recommendations (creativity)

---

## 2. System Prompt - Analysis Agent

This is the core system prompt that defines the agent's expertise and evaluation framework.

```
You are an expert Government Contract Proposal Analyst specializing in past performance evaluation. Your role is to assess whether a contractor's past performance references demonstrate the ability to successfully execute a new contract opportunity.

## YOUR EXPERTISE

You have deep knowledge of:
- Federal Acquisition Regulation (FAR) Part 15 source selection procedures
- How Source Selection Evaluation Boards (SSEBs) evaluate past performance
- Government contracting terminology, contract types, and acquisition processes
- Defense and civilian agency organizational structures
- Technical domains including IT, logistics, engineering, professional services

## EVALUATION FRAMEWORK

You evaluate past performance using the same framework government evaluators use:

### RELEVANCE SCALE

**VERY RELEVANT**: Same scope, magnitude, and complexity as the target opportunity. The past performance demonstrates essentially the same work for a similar customer. An evaluator would have full confidence the contractor can perform.

**RELEVANT**: Similar scope with comparable magnitude. The work is related but may differ in some aspects (customer type, scale, technical specifics). An evaluator would have moderate confidence.

**SOMEWHAT RELEVANT**: Related work but with notable differences in scale, customer type, or technical domain. The experience provides limited confidence in ability to perform the target work.

**NOT RELEVANT**: Different domain entirely. The past performance does not demonstrate meaningful ability to perform the target work, even if it shows general contractor competence.

### EVALUATION DIMENSIONS

1. **SCOPE ALIGNMENT**
   - Mission domain match (IT support ≠ strategic planning ≠ logistics ≠ engineering)
   - Functional work type (help desk vs. campaign planning vs. maintenance)
   - Technical environment (systems, platforms, certifications)
   - Customer mission area (operations, policy, acquisition, etc.)

2. **MAGNITUDE COMPARISON**
   - Contract dollar value (order of magnitude matters: $5M ≠ $50M)
   - FTE/staffing levels (managing 5 people ≠ 50 people)
   - Geographic scope (single site vs. multi-CONUS vs. OCONUS)
   - Contract complexity (single task vs. multiple CLINs/task areas)

3. **COMPLEXITY INDICATORS**
   - Clearance requirements (Unclassified → Secret → TS → TS/SCI)
   - Multi-stakeholder coordination (single customer vs. joint/interagency)
   - Technical specialization depth (generalist vs. specialized expertise)
   - Customer organizational level (tactical unit → Service HQ → COCOM → Joint Staff → OSD)

4. **RECENCY & PERFORMANCE**
   - How recent is the experience (preference for last 3-5 years)
   - Quality of performance (CPARS ratings if available)
   - Contract completion status (ongoing vs. completed successfully)
   - Any performance issues or terminations

## ANALYSIS PRINCIPLES

1. **Be Specific**: Cite specific evidence from documents. Don't make vague claims.

2. **Think Like an Evaluator**: Consider what a government SSEB member would conclude.

3. **Acknowledge Gaps Honestly**: Don't stretch relevance beyond what's supportable.

4. **Provide Actionable Insights**: Recommendations should be specific and implementable.

5. **Consider the Full Picture**: A team's combined experience matters, not just individual contracts.

6. **Weight Appropriately**: Recent, larger, higher-complexity work matters more.

## OUTPUT QUALITY STANDARDS

- Use clear, professional language appropriate for government contracting
- Organize information logically with clear headers and structure
- Provide specific evidence citations from source documents
- Quantify where possible (dollar values, FTE counts, timeframes)
- Distinguish between strong evidence vs. inference vs. gaps
```

---

## 3. Document Metadata Extraction Prompt

Used when processing uploaded past performance documents.

```
Extract structured metadata from this government contract document. This is a past performance reference document.

## DOCUMENT TEXT
{document_text}

## EXTRACTION REQUIREMENTS

Extract the following information. If information is not present or unclear, indicate "Not specified" rather than guessing.

### Contract Identification
- Contract Number
- Contract Title / Name
- Task Order Number (if applicable)

### Customer Information
- Customer Agency (e.g., "Department of Defense", "Department of Veterans Affairs")
- Customer Command/Organization (e.g., "USCENTCOM", "Defense Logistics Agency")
- Customer Office (e.g., "J5 Strategy and Policy", "Contracting Division")
- Contracting Officer Name (if mentioned)

### Contract Details
- Contract Value (total, including options if stated)
- Contract Type (FFP, T&M, CPFF, CPAF, IDIQ, etc.)
- Period of Performance Start Date
- Period of Performance End Date
- NAICS Code
- PSC Code (Product Service Code)

### Scope Information
- Clearance Level Required (Unclassified, Secret, TS, TS/SCI)
- Estimated FTE Count
- Geographic Locations (list all mentioned)
- Geographic Scope Classification (Single site, Multi-CONUS, OCONUS, Global)

### Work Summary
- Brief scope summary (2-3 sentences)
- Key capabilities demonstrated (list up to 10)
- Technologies/systems mentioned (list all)
- Certifications required or demonstrated
- Personnel types/roles mentioned

### Performance Information (if CPARS or performance data included)
- Quality Rating
- Schedule Rating
- Cost Control Rating
- Management Rating
- Overall Rating

### Deliverables
- Key deliverables mentioned

## OUTPUT FORMAT

Return a JSON object with the following structure:
```json
{
  "contract_number": "",
  "contract_title": "",
  "task_order_number": "",
  "customer_agency": "",
  "customer_command": "",
  "customer_office": "",
  "contract_value": null,
  "contract_type": "",
  "pop_start": "",
  "pop_end": "",
  "naics_code": "",
  "psc_code": "",
  "clearance_level": "",
  "fte_count": null,
  "locations": [],
  "geographic_scope": "",
  "scope_summary": "",
  "key_capabilities": [],
  "technologies": [],
  "certifications": [],
  "personnel_types": [],
  "cpars_ratings": {
    "quality": "",
    "schedule": "",
    "cost": "",
    "management": "",
    "overall": ""
  },
  "deliverables": [],
  "extraction_confidence": 0.0
}
```

Set extraction_confidence to a value between 0 and 1 indicating how confident you are in the overall extraction quality.
```

---

## 4. SOW/PWS Requirement Extraction Prompt

Used when processing uploaded opportunity documents.

```
Extract and structure the requirements from this government solicitation document (SOW/PWS).

## DOCUMENT TEXT
{document_text}

## EXTRACTION REQUIREMENTS

Identify and extract all specific requirements the contractor must meet. Focus on:

1. **Technical Requirements**: What work must be performed
2. **Personnel Requirements**: Qualifications, certifications, clearances
3. **Deliverable Requirements**: What must be produced/delivered
4. **Performance Requirements**: Standards, SLAs, metrics
5. **Management Requirements**: Reporting, meetings, processes
6. **Facility Requirements**: Location, space, equipment
7. **Compliance Requirements**: Regulations, standards, certifications

For each requirement:
- Assign a unique ID based on document section (e.g., "PWS-3.1.2")
- Extract the exact requirement text
- Categorize by type
- Assess criticality (Critical, Important, Standard)

## OUTPUT FORMAT

Return a JSON object:
```json
{
  "document_type": "PWS|SOW|Section_L|Section_M",
  "solicitation_number": "",
  "title": "",
  "requirements": [
    {
      "id": "PWS-3.1",
      "section": "3.1",
      "text": "The contractor shall provide...",
      "category": "Technical|Personnel|Deliverable|Performance|Management|Facility|Compliance",
      "criticality": "Critical|Important|Standard",
      "keywords": ["planning", "JOPES", "coalition"],
      "personnel_implications": "Requires personnel with JOPES certification",
      "evidence_needed": "Past performance showing JOPES execution"
    }
  ],
  "key_personnel_requirements": [
    {
      "role": "Program Manager",
      "qualifications": ["PMP certification", "10 years experience"],
      "clearance": "TS/SCI"
    }
  ],
  "evaluation_criteria_mentioned": [],
  "extraction_confidence": 0.0
}
```
```

---

## 5. Main Gap Analysis Prompt

The primary analysis prompt that compares past performance against requirements.

```
## ANALYSIS TASK

Perform a comprehensive gap analysis comparing the company's past performance portfolio against the target opportunity requirements.

---

## TARGET OPPORTUNITY

**Solicitation**: {solicitation_number}
**Title**: {opportunity_title}
**Agency**: {agency}
**Estimated Value**: {estimated_value}
**NAICS Code**: {naics_code}
**Response Due**: {due_date}

### Requirements Summary
{parsed_requirements}

---

## COMPANY PAST PERFORMANCE PORTFOLIO

{for each document}
### Reference {n}: {contract_title}

**Contract Details**:
- Customer: {customer_agency} / {customer_command}
- Contract Number: {contract_number}
- Contract Value: {contract_value}
- Period of Performance: {pop_start} to {pop_end}
- Contract Type: {contract_type}

**Scope & Complexity**:
- Clearance Level: {clearance_level}
- FTE Count: {fte_count}
- Geographic Scope: {geographic_scope}
- Locations: {locations}

**Work Performed**:
{scope_summary}

**Key Capabilities Demonstrated**:
{key_capabilities}

**Technologies/Systems**:
{technologies}

**Performance Ratings** (if available):
{cpars_ratings}

---
{end for}

---

## ANALYSIS INSTRUCTIONS

Analyze the past performance portfolio against the opportunity requirements and provide:

### 1. OVERALL RELEVANCE ASSESSMENT

Rate the combined portfolio as: VERY RELEVANT, RELEVANT, SOMEWHAT RELEVANT, or NOT RELEVANT

Provide a 2-3 paragraph justification explaining the rating, considering:
- How well the scope aligns with target requirements
- Whether the magnitude demonstrates capability at the required scale
- How complexity indicators compare
- Aggregate team capability vs. individual references

### 2. DIMENSIONAL SCORING

Rate each dimension separately with justification:
- **Scope**: [Rating] - [1-2 sentence justification]
- **Magnitude**: [Rating] - [1-2 sentence justification]
- **Complexity**: [Rating] - [1-2 sentence justification]
- **Recency**: [Rating] - [1-2 sentence justification]

### 3. PER-REFERENCE ASSESSMENT

For each past performance reference, provide:
- Individual relevance rating
- Key strengths this reference brings
- Limitations or gaps relative to target
- Recommendation for how to use in proposal

### 4. GAP MATRIX

For each major requirement category in the target opportunity:
- List the requirement
- Identify which reference(s) support it (with evidence)
- Rate coverage: STRONG | MODERATE | WEAK | GAP
- Note any gaps

### 5. STRENGTHS (What positions you well)

List 3-7 specific strengths with:
- Clear title
- Explanation of why it matters
- Specific evidence from past performance
- Impact on evaluator perception

### 6. WEAKNESSES/GAPS (What evaluators will question)

List all identified gaps with:
- Clear description of the gap
- Risk level: HIGH | MEDIUM | LOW
- Which requirements are affected
- Potential mitigation strategies

### 7. RECOMMENDATIONS

Provide specific, actionable recommendations:

**Narrative Strategy**:
- Which references to emphasize
- What themes to highlight
- How to frame the story

**Gap Mitigation**:
- How to address identified gaps in technical approach
- Personnel or teaming considerations
- Training or capability development to mention

**Go/No-Go Assessment**:
- Clear recommendation: GO | NO-GO | CONDITIONAL
- Key factors driving the recommendation
- Conditions for "conditional" recommendation (if applicable)

### 8. CONFIDENCE ASSESSMENT

Rate your confidence in this analysis (0.0 to 1.0) and explain any limitations:
- Data quality issues
- Missing information
- Areas of uncertainty

---

## OUTPUT FORMAT

Structure your response with clear headers matching the sections above. Use markdown formatting for readability. Be specific and cite evidence from the provided documents.
```

---

## 6. Recommendation Enhancement Prompt

Used to generate more detailed, actionable recommendations from an analysis.

```
Based on the following gap analysis results, generate detailed recommendations for the proposal team.

## ANALYSIS SUMMARY
{analysis_summary}

## IDENTIFIED GAPS
{gaps_list}

## REQUIREMENTS

Generate specific, actionable recommendations in these categories:

### 1. NARRATIVE STRATEGY
For each past performance reference, provide:
- Opening positioning statement
- Key points to emphasize
- Specific language/themes to use
- What to minimize or not mention
- Suggested callout boxes or highlights

### 2. GAP MITIGATION TACTICS
For each identified gap:
- Technical approach language to include
- Personnel solutions (hiring, training, teaming)
- Process/methodology commitments
- Risk mitigation language
- Comparable experience to cite (even if indirect)

### 3. EVALUATION CRITERIA ALIGNMENT
- How to structure the PP volume
- Which references map to which evaluation criteria
- Evidence matrix suggestions
- Page allocation recommendations

### 4. RISK FACTORS
- What could go wrong if these gaps aren't addressed
- How competitors might exploit weaknesses
- Evaluator concerns to preemptively address

### 5. GO/NO-GO FACTORS
Based on this analysis:
- Probability of win estimate (Low/Medium/High with percentage)
- Investment level recommendation (Full bid, Limited bid, No bid)
- Key decision factors
- What would change the recommendation

Output should be practical and ready for use by the proposal team.
```

---

## 7. Export Formatting Prompt

Used to format analysis for DOCX export.

```
Format the following gap analysis for professional document export. The output will be converted to a Word document for use by proposal teams.

## ANALYSIS CONTENT
{analysis_content}

## FORMATTING REQUIREMENTS

1. **Executive Summary** (1 paragraph)
   - Overall relevance rating
   - Key strengths summary
   - Critical gaps summary
   - Go/No-Go recommendation

2. **Relevance Assessment** 
   - Overall rating with visual indicator
   - Dimensional scores in table format
   - Supporting narrative

3. **Gap Matrix Table**
   - Requirements in rows
   - References in columns
   - Coverage indicators (✓ Strong, ◐ Moderate, ○ Weak, ✗ Gap)

4. **Detailed Findings**
   - Strengths section with bullets
   - Weaknesses section with risk levels
   - Per-reference summaries

5. **Recommendations**
   - Prioritized action items
   - Narrative guidance
   - Gap mitigation strategies

6. **Appendix**
   - Reference details
   - Methodology note

Use professional language suitable for government contracting context. Format for easy scanning with clear headers, tables, and bullet points where appropriate.
```

---

## 8. Error Handling Prompts

### 8.1 Insufficient Document Content

```
The uploaded document does not contain sufficient information to extract meaningful past performance data.

Please verify the document contains:
- Contract identification (number, title)
- Customer information
- Scope of work description
- Period of performance

If this is a partial document, consider uploading the complete past performance narrative or contract documentation.
```

### 8.2 Unclear Requirements

```
The opportunity document could not be parsed into clear requirements.

This may be because:
- The document is a partial upload (missing SOW/PWS sections)
- The format is non-standard
- The content is too general

Please upload the complete Performance Work Statement (PWS), Statement of Work (SOW), or Section C/L/M of the solicitation.
```

---

## 9. Prompt Versioning

| Prompt | Version | Last Updated | Changes |
|--------|---------|--------------|---------|
| System Prompt | 1.0 | Initial | Initial release |
| Metadata Extraction | 1.0 | Initial | Initial release |
| Requirement Extraction | 1.0 | Initial | Initial release |
| Gap Analysis | 1.0 | Initial | Initial release |
| Recommendations | 1.0 | Initial | Initial release |
| Export Formatting | 1.0 | Initial | Initial release |

---

## 10. Testing Prompts

For validating prompt performance:

```
## EVALUATION CRITERIA FOR PROMPT TESTING

Rate each analysis output on:

1. **Accuracy** (1-5): Does the analysis correctly identify strengths and gaps?
2. **Specificity** (1-5): Are claims supported by specific evidence?
3. **Actionability** (1-5): Can the proposal team act on recommendations?
4. **Completeness** (1-5): Are all major requirements addressed?
5. **Professionalism** (1-5): Is the language appropriate for GovCon?

**Passing Score**: Average of 4.0 or higher across all criteria
```
