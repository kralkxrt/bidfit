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
Extract and structure the requirements from this government solicitation document (SOW/PWS).

## DOCUMENT TEXT
{document_text[:50000]} 

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
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=8000,  # Increased for large PWS documents
                temperature=0.0,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return self._parse_json(response.content[0].text)
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

