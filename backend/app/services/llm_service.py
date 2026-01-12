from anthropic import AsyncAnthropic
from typing import Dict, Any, Optional
import json
from app.config import settings

class LLMService:
    """
    Wrapper service for Claude API interactions.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        # Initialize client
        key = api_key or settings.ANTHROPIC_API_KEY
        self.client = AsyncAnthropic(api_key=key)
        self.model = model or settings.CLAUDE_MODEL
        self.max_tokens = settings.CLAUDE_MAX_TOKENS
    
    async def extract_metadata(self, prompt: str) -> Dict[str, Any]:
        """
        Extract structured metadata from document.
        """
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                temperature=0.0,  # Zero for extraction
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            text = response.content[0].text
            return self._parse_json(text)

        except Exception as e:
            print(f"LLM Extraction failed: {e}")
            return {"error": str(e)}

    async def extract_requirements(self, document_text: str) -> Dict[str, Any]:
        """
        Extract SOW/PWS requirements using Prompt 4.
        """
        prompt = f"""
Extract and structure the requirements from this government solicitation document.

## DOCUMENT TEXT
{document_text[:50000]} 

## EXTRACTION REQUIREMENTS

**CRITICAL: Extract from ALL relevant sections of the RFP/Solicitation:**

### Section C (Description/SOW/PWS) - MOST IMPORTANT
Extract technical requirements: scope of work, tasks, deliverables, performance standards.
Example IDs: C.1, C.2.1, C.3.a

### Section E (Inspection & Acceptance)
Extract quality assurance requirements, inspection criteria, acceptance standards.
Example IDs: E.1, E.2

### Section F (Deliverables)
Extract deliverable descriptions, schedules, formats.
Example IDs: F.1, F.2

### Section H (Special Contract Requirements)
Extract clearance requirements, certifications, special clauses.
Example IDs: H.1, H-3, H.10

### Section L (Instructions to Offerors)
Extract submission requirements, format rules, evaluation demonstration requirements.
Example IDs: L.5.1, L.5.a

### Section M (Evaluation Criteria)
Extract evaluation factors, weighting, scoring criteria.
Example IDs: M.1, M.3.1

**YOU MUST EXTRACT 25-50 REQUIREMENTS across ALL sections, not just Section L.**
**Prioritize Section C (technical requirements) as this is most relevant for gap analysis.**

---

Categorize each requirement by type:

1. **Technical Requirements**: What work must be performed (mostly Section C)
2. **Personnel Requirements**: Qualifications, certifications, clearances (Sections C, H)
3. **Deliverable Requirements**: What must be produced/delivered (Sections C, F)
4. **Performance Requirements**: Standards, SLAs, metrics (Sections C, E)
5. **Management Requirements**: Reporting, meetings, processes (Section C)
6. **Facility Requirements**: Location, space, equipment (Section C)
7. **Compliance Requirements**: Regulations, standards, certifications (Sections H, L)

For each requirement:
- **ID Format**: Use the EXACT section number from the document (e.g., "C.1.2", "4.1.3", "H-3"). DO NOT use generic prefixes like "SOW-" unless the document uses them.
- **CRITICAL - UNIQUE IDs**: If multiple requirements come from the same section (e.g., multiple items under C.1), use sub-numbering:
  - C.1.1 - First requirement from C.1
  - C.1.2 - Second requirement from C.1
  - C.1.3 - Third requirement from C.1
  Do NOT create duplicate IDs. Each requirement MUST have a unique ID.
- Extract the exact requirement text
- Categorize by type
- Assess criticality (Critical, Important, Standard)

## OUTPUT FORMAT

Return a JSON object:
```json
{{
  "document_type": "PWS|SOW|Section_L|Section_M",
  "solicitation_number": "",
  "title": "",
  "requirements": [
    {{
      "id": "PWS-3.1",
      "section": "3.1",
      "text": "The contractor shall provide...",
      "category": "Technical|Personnel|Deliverable|Performance|Management|Facility|Compliance",
      "criticality": "Critical|Important|Standard",
      "keywords": ["planning", "JOPES", "coalition"],
      "personnel_implications": "Requires personnel with JOPES certification",
      "evidence_needed": "Past performance showing JOPES execution"
    }}
  ],
  "key_personnel_requirements": [
    {{
      "role": "Program Manager",
      "qualifications": ["PMP certification", "10 years experience"],
      "clearance": "TS/SCI"
    }}
  ],
  "evaluation_criteria_mentioned": [],
  "extraction_confidence": 0.0
}}
```
"""
        # Debug: Print document info
        print(f"\n{'='*60}")
        print(f"DEBUG EXTRACT_REQUIREMENTS:")
        print(f"Document text length: {len(document_text)} chars")
        print(f"Truncated to: {min(len(document_text), 50000)} chars")
        print(f"\nFirst 2000 chars of document:")
        print(document_text[:2000])
        print(f"\n--- Checking for Section indicators ---")
        for section in ['SECTION C', 'Section C', 'PART C', 'C.1', 'C.2', 'SECTION L', 'L.5']:
            if section in document_text:
                idx = document_text.find(section)
                print(f"  Found '{section}' at position {idx}")
            else:
                print(f"  NOT FOUND: '{section}'")
        print(f"{'='*60}\n")
        
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=8000,  # Increased for large PWS documents
                temperature=0.0,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            result = self._parse_json(response.content[0].text)
            print(f"DEBUG: Extracted {len(result.get('requirements', []))} requirements")
            return result
        except Exception as e:
             print(f"Requirement Extraction failed: {e}")
             return {"error": str(e)}

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Helper to parse JSON from LLM response."""
        try:
            text = text.strip()
            
            # Handle markdown code blocks
            if "```json" in text:
                json_start = text.index("```json") + 7
                # Find the closing ``` after the opening ```json
                json_end = text.index("```", json_start)
                json_str = text[json_start:json_end].strip()
            elif "```" in text:
                # Handle plain ``` without json marker
                json_start = text.index("```") + 3
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
            print(f"JSON Parse Error: {e}")
            print(f"Text snippet: {text[:200]}")
            return {"error": "Failed to parse JSON", "raw_text": text[:1000]}

    async def analyze(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """
        Send analysis prompt to Claude and get response.
        """
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            temperature=0.3,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.content[0].text

