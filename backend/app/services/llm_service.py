from anthropic import AsyncAnthropic
from typing import Dict, Any, Optional
import json
import re
from app.config import settings
from app.logger import logger

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
            logger.exception("LLM Extraction failed")
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
        # Debug logging (guarded by DEBUG flag)
        logger.debug("=" * 60)
        logger.debug("DEBUG EXTRACT_REQUIREMENTS:")
        logger.debug(f"Document text length: {len(document_text)} chars")
        logger.debug(f"Truncated to: {min(len(document_text), 50000)} chars")
        logger.debug("First 2000 chars of document:")
        logger.debug(document_text[:2000])
        logger.debug("--- Checking for Section indicators ---")
        for section in ['SECTION C', 'Section C', 'PART C', 'C.1', 'C.2', 'SECTION L', 'L.5']:
            if section in document_text:
                idx = document_text.find(section)
                logger.debug(f"  Found '{section}' at position {idx}")
            else:
                logger.debug(f"  NOT FOUND: '{section}'")
        logger.debug("=" * 60)
        
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
            logger.debug(f"Extracted {len(result.get('requirements', []))} requirements")
            return result
        except Exception as e:
             logger.exception("Requirement Extraction failed")
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
            logger.exception("JSON Parse Error")
            logger.debug(f"Text snippet: {text[:200]}")
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

    def extract_section_l_patterns(self, document_text: str) -> Dict[str, Any]:
        """
        Extract Section L requirements using regex pattern matching as a fallback
        when LLM extraction fails or returns vague values.
        
        Returns a dict with validated numeric values for:
        - references_required: {min, max} or single number
        - contract_value: {min, max} in dollars
        - recency_years: number
        - completion_threshold: percentage string
        """
        if not document_text:
            return {}
        
        # Normalize text for pattern matching
        text_upper = document_text.upper()
        text_lower = document_text.lower()
        results = {}
        
        # PATTERN 1: References Required
        # Look for: "minimum of three (3) and a maximum of five (5)"
        # Or: "at least 3 and no more than 5"
        # Or: "3-5 references"
        ref_patterns = [
            r'minimum\s+of\s+(\d+)\s*\(?\d*\)?\s+and\s+(?:a\s+)?maximum\s+of\s+(\d+)',
            r'submit\s+(?:a\s+)?minimum\s+of\s+(\d+)\s+and\s+(?:a\s+)?maximum\s+of\s+(\d+)',
            r'at\s+least\s+(\d+)\s+(?:and\s+)?(?:no\s+more\s+than|up\s+to|maximum\s+of)\s+(\d+)',
            r'(\d+)\s*[-–]\s*(\d+)\s+(?:references?|projects?|contracts?|past\s+performance)',
            r'between\s+(\d+)\s+and\s+(\d+)\s+(?:references?|projects?|contracts?|past\s+performance)',
            r'(\d+)\s+to\s+(\d+)\s+(?:references?|projects?|contracts?|past\s+performance)',
        ]
        
        for pattern in ref_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                min_val = int(match.group(1))
                max_val = int(match.group(2))
                if min_val > 0 and max_val >= min_val:
                    results['references_required'] = {"min": min_val, "max": max_val}
                    break
        
        # If no range found, look for single number
        if 'references_required' not in results:
            single_ref_patterns = [
                r'(?:minimum|at\s+least|no\s+fewer\s+than)\s+(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?|past\s+performance)',
                r'(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?|past\s+performance)\s+(?:required|must\s+be\s+submitted)',
                r'submit\s+(?:at\s+least|a\s+minimum\s+of|no\s+fewer\s+than)\s+(\d+)\s+(?:relevant\s+)?(?:references?|projects?|contracts?)',
            ]
            for pattern in single_ref_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    num = int(match.group(1))
                    if num > 0:
                        results['references_required'] = {"min": num, "max": num}
                        break
        
        # PATTERN 2: Contract Value Range
        # Look for: "$500,000 to $20,000,000" or "$500K-$20M" or "$1M and $10M"
        value_patterns = [
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)\s*(?:to|-|and)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)',
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:to|-|and)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
            r'contract\s+value\s+(?:of|range|between)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?\s*(?:to|-|and)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?',
            r'valued\s+between\s+\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?\s*(?:and|to|-)\s+\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?',
            r'projects?\s+must\s+be\s+valued\s+between\s+\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?\s*(?:and|to|-)\s+\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m\b)?',
        ]
        
        for pattern in value_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                min_str = match.group(1).replace(',', '')
                max_str = match.group(2).replace(',', '')
                match_text = match.group(0)
                
                # Check if min value has "million" or "m" suffix immediately after it
                min_pattern = r'\$' + re.escape(min_str) + r'\s*(?:million|m\b)'
                max_pattern = r'\$' + re.escape(max_str) + r'\s*(?:million|m\b)'
                
                min_has_m = bool(re.search(min_pattern, match_text, re.IGNORECASE))
                max_has_m = bool(re.search(max_pattern, match_text, re.IGNORECASE))
                
                min_val = float(min_str)
                max_val = float(max_str)
                
                if min_has_m:
                    min_val *= 1000000
                if max_has_m:
                    max_val *= 1000000
                
                if min_val > 0 and max_val >= min_val:
                    results['contract_value'] = {"min": int(min_val), "max": int(max_val)}
                    break
        
        # If no range, look for minimum only
        if 'contract_value' not in results:
            min_value_patterns = [
                r'minimum\s+contract\s+value\s+of\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?',
                r'contract\s+value\s+(?:of|at\s+least)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|m\b)?',
            ]
            for pattern in min_value_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    val_str = match.group(1).replace(',', '')
                    if 'million' in match.group(0).lower() or re.search(r'\bm\b', match.group(0), re.IGNORECASE):
                        min_val = float(val_str) * 1000000
                    else:
                        min_val = float(val_str)
                    if min_val > 0:
                        results['contract_value'] = {"min": int(min_val)}
                        break
        
        # PATTERN 3: Recency Period
        # Look for: "within 6 years" or "completed after 2018" or "65% complete within six-year period"
        recency_patterns = [
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(\d+)[-\s]*(?:year|yr)\s+period',
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(six|seven|eight|nine|ten|\d+)[-\s]*(?:year|yr)',
            r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(\d+)[-\s]*(?:year|yr)',
            r'within\s+(\d+)\s*(?:year|yr)',
            r'(\d+)\s*(?:year|yr)\s+period',
            r'completed\s+(?:after|since|within)\s+(\d{4})',
        ]
        
        # Map word numbers to digits
        word_to_num = {
            'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
            'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15'
        }
        
        for pattern in recency_patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                if len(match.groups()) == 2:
                    # Has completion threshold
                    threshold = match.group(1)
                    years_str = match.group(2)
                    # Convert word to number if needed
                    years_str = word_to_num.get(years_str.lower(), years_str)
                    try:
                        years = int(years_str)
                        results['completion_threshold'] = f"{threshold}%"
                        results['recency_years'] = years
                        break
                    except ValueError:
                        pass
                elif len(match.groups()) == 1:
                    val = match.group(1)
                    # Check if it's a year (4 digits) or years (1-2 digits)
                    if len(val) == 4:
                        # It's a year, calculate years from now
                        try:
                            year = int(val)
                            current_year = 2025  # Could use datetime, but this is simpler
                            years = current_year - year
                            if 0 < years < 20:  # Reasonable range
                                results['recency_years'] = years
                                break
                        except:
                            pass
                    else:
                        # It's a number of years
                        try:
                            years = int(val)
                            if 0 < years < 20:
                                results['recency_years'] = years
                                break
                        except ValueError:
                            pass
        
        # PATTERN 4: CPARS Preference
        if re.search(r'cpars\s+(?:report|evaluation|rating)\s+(?:shall|must|is\s+required)', text_lower, re.IGNORECASE):
            results['cpars_requested'] = True
        elif re.search(r'cpars\s+(?:may|can)\s+be\s+submitted', text_lower, re.IGNORECASE):
            results['cpars_requested'] = False  # Optional
        
        return results