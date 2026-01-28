# PP Gap Analysis - Comprehensive Lessons Learned

> **Purpose**: This document captures bugs, fixes, patterns, and gotchas from building the PP Gap Analysis application. Use this as a reference when building similar FastAPI + Next.js + Supabase + Claude AI applications.

---

## 1. Bugs Fixed

### 1.1 Package Deprecation - shadcn-ui
**Error**: `npm ERR! 404 Not Found - GET https://registry.npmjs.org/shadcn-ui`

**Solution**: The package was renamed to `shadcn`:
```bash
# Wrong
npx shadcn-ui@latest init

# Correct
npx shadcn@latest init
npx shadcn@latest add button card dialog
```

### 1.2 Python Version Mismatch
**Error**: `Python 3.11 not found`

**Solution**: Verified compatibility with Python 3.9.6. Note that Python 3.11+ is preferred for production due to better async performance and typing features.

### 1.3 JSON Parsing from LLM Responses
**Error**: `json.JSONDecodeError: Expecting value: line 1 column 1`

**Root Cause**: Claude often wraps JSON in markdown code blocks (` ```json ... ``` `).

**Solution**: Robust JSON extraction that handles multiple formats:
```python
def _parse_json(self, text: str) -> Dict[str, Any]:
    text = text.strip()
    
    # Handle markdown code blocks
    if "```json" in text:
        json_start = text.index("```json") + 7
        json_end = text.index("```", json_start)
        json_str = text[json_start:json_end].strip()
    elif "```" in text:
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
```

### 1.4 Null Bytes in Database Text
**Error**: PostgreSQL error with `\x00` characters in text fields.

**Root Cause**: PDF extraction sometimes includes null bytes.

**Solution**: Clean text before storing:
```python
def _clean_text(self, text: str) -> str:
    """Remove null bytes and other postgres-breaking characters."""
    return text.replace("\x00", "")
```

### 1.5 LLM Returning "NaN" or "Not Specified" Strings
**Error**: Frontend crashes when trying to do math on string values like `"NaN"`.

**Root Cause**: Claude returns varied string representations for missing values.

**Solution**: Validate and fallback to regex extraction:
```python
INVALID_VALUES = ["NAN", "N/A", "NULL", "NOT SPECIFIED", ""]

if str(value).upper() in INVALID_VALUES:
    # Fall back to regex pattern matching
    regex_results = llm_service.extract_section_l_patterns(document_text)
```

### 1.6 Duplicate Requirement IDs
**Error**: Visual display issues when multiple requirements share the same ID.

**Root Cause**: LLM extracts multiple requirements from same document section (e.g., C.1) without sub-numbering.

**Solution**: Explicit prompt instruction:
```
- **CRITICAL - UNIQUE IDs**: If multiple requirements come from the same section (e.g., multiple items under C.1), use sub-numbering:
  - C.1.1 - First requirement from C.1
  - C.1.2 - Second requirement from C.1
  Do NOT create duplicate IDs. Each requirement MUST have a unique ID.
```

---

## 2. Integration Issues

### 2.1 CORS Configuration
**Problem**: `Access-Control-Allow-Origin` errors when frontend calls backend.

**Solution**: Configure CORS in FastAPI main.py:
```python
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production URL from environment
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Key Points**:
- Include both `localhost` AND `127.0.0.1`
- Use environment variable for production frontend URL
- `allow_credentials=True` is required for cookies/auth

### 2.2 API Client Configuration
**Pattern**: Centralized axios instance with env-based URL:
```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
```

### 2.3 SSE (Server-Sent Events) Streaming
**Problem**: Standard fetch doesn't handle SSE properly for AI streaming.

**Backend Solution** (FastAPI):
```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def stream_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    async def generate():
        async for chunk in roxy_service.stream_chat(db, ...):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Important for nginx
        }
    )
```

**Claude Streaming Pattern**:
```python
async with self.anthropic_client.messages.stream(
    model=self.model,
    max_tokens=1200,
    temperature=0.2,
    system=system_prompt,
    messages=[{"role": "user", "content": user_prompt}]
) as stream:
    async for event in stream:
        if event.type == "content_block_delta":
            delta = event.delta.text or ""
            if delta:
                yield {"type": "text", "content": delta}
```

**Frontend SSE Consumption**:
```typescript
const response = await fetch(`${API_URL}/api/roxy/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
                // Append to message
            } else if (data.type === 'citation') {
                // Handle citation
            } else if (data.type === 'done') {
                // Complete
            }
        }
    }
}
```

### 2.4 Trailing Slashes in API Routes
**Problem**: FastAPI can be picky about trailing slashes.

**Solution**: Be consistent. If backend defines `/api/companies/`, frontend should call `/api/companies/` (not `/api/companies`), or configure FastAPI to handle both.

---

## 3. Build/Config Issues

### 3.1 PostgreSQL URL Conversion
**Problem**: Supabase provides `postgres://` URLs but SQLAlchemy needs `postgresql://`.

**Solution**: In pydantic-settings config:
```python
@property
def SQLALCHEMY_DATABASE_URL(self) -> str:
    if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
        return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
    return self.DATABASE_URL
```

### 3.2 Next.js Standalone Build
**Config** for deployment:
```javascript
// next.config.mjs
const nextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
};
```

### 3.3 Environment Variables
**Pattern**: Use `NEXT_PUBLIC_` prefix for client-side variables:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend .env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # For embeddings
```

### 3.4 Pydantic Settings Extra Fields
**Problem**: Environment file has extra variables not in Settings class.

**Solution**: Allow extra fields:
```python
class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in .env
```

### 3.5 Cache Corruption / Dev Server Issues
**Pre-UI Self-Check Protocol**:
Before asking user to test UI:
1. Restart frontend dev server, confirm no compile errors
2. curl key routes (`/login`, `/opportunities`, etc.) - confirm non-404
3. Backend: confirm `/api/health` returns 200
4. If any errors, fix before asking user to test

---

## 4. Database / Supabase

### 4.1 Alembic Migrations
**Pattern**: Use Alembic for schema migrations with async support.

**alembic/env.py key settings**:
```python
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base

target_metadata = Base.metadata

def run_migrations_online():
    # Use asyncpg driver
    connectable = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URL.replace(
            "postgresql://", "postgresql+asyncpg://"
        )
    )
```

**Migration commands**:
```bash
alembic revision --autogenerate -m "add_new_table"
alembic upgrade head
alembic downgrade -1  # Rollback one version
```

### 4.2 Docker Not Available
**Problem**: Local development environment restrictions.

**Solution**: Use managed services (Supabase/Neon) instead of local Docker containers.

### 4.3 UUID Primary Keys
**Pattern**: Use PostgreSQL UUID type with Python uuid4:
```python
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4

id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
```

### 4.4 Cascade Deletes
**Pattern**: Configure proper cascade for related tables:
```python
company_id = Column(
    UUID(as_uuid=True), 
    ForeignKey("companies.id", ondelete="CASCADE"), 
    nullable=False
)
documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
```

### 4.5 Soft Deletes
**Pattern**: Add `deleted_at` column instead of hard deletes:
```python
deleted_at = Column(DateTime, nullable=True)

# In queries, filter out deleted records
query = select(Document).where(Document.deleted_at.is_(None))
```

### 4.6 JSON/JSONB Columns
**Pattern**: Use JSONB for structured data:
```python
from sqlalchemy.dialects.postgresql import JSONB

metadata = Column(JSONB, nullable=True)
bounding_box = Column(JSONB, nullable=False)  # {"x": 0, "y": 0, "width": 100, "height": 20}
```

---

## 5. AI / Claude Integration

### 5.1 Prompt Formatting That Works
**Structure**:
```python
prompt = f"""
Extract and structure the requirements from this government solicitation document.

## DOCUMENT TEXT
{document_text[:50000]}  # Truncate to stay within limits

## EXTRACTION REQUIREMENTS
[Detailed instructions with examples]

## OUTPUT FORMAT
Return a JSON object:
```json
{{
  "field": "value"
}}
```
"""
```

**Key Tips**:
- Use clear section headers with `##`
- Provide explicit examples of expected output
- Specify EXACT format for IDs, values, etc.
- Use double braces `{{` in f-strings for literal braces

### 5.2 Token Limit Handling
**Pattern**: Truncate input and use appropriate max_tokens:
```python
document_text[:50000]  # ~12,500 tokens input
max_tokens = 8000      # For large extraction tasks
max_tokens = 4000      # For standard tasks
max_tokens = 1200      # For chat responses
```

### 5.3 Temperature Settings
```python
temperature=0.0  # For extraction tasks (deterministic)
temperature=0.2  # For chat (slightly creative)
temperature=0.3  # For analysis (balanced)
```

### 5.4 Fallback to Regex for Structured Data
**Pattern**: When LLM returns vague values, use regex extraction as backup:
```python
async def extract_requirements(self, document_text: str):
    # Try LLM first
    llm_result = await self.llm.extract(prompt)
    
    # Validate critical fields
    if not llm_result.get("references_required"):
        # Fallback to regex patterns
        regex_result = self.extract_section_l_patterns(document_text)
        if regex_result.get("references_required"):
            llm_result["references_required"] = regex_result["references_required"]
```

**Regex patterns for government documents**:
```python
# References: "minimum of 3 and maximum of 5"
r'minimum\s+of\s+(\d+)\s*\(?\d*\)?\s+and\s+(?:a\s+)?maximum\s+of\s+(\d+)'

# Contract value: "$500,000 to $20,000,000"
r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:to|-|and)\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)'

# Recency: "within 6 years" or "65% complete within 6-year period"
r'(\d+)%\s+complete\s+within\s+(?:a\s+)?(\d+)[-\s]*(?:year|yr)\s+period'
```

### 5.5 OpenAI for Embeddings (with Anthropic for Chat)
**Pattern**: Use OpenAI for embeddings, Claude for reasoning:
```python
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

class Service:
    def __init__(self):
        self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def get_embedding(self, text: str):
        response = await self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
```

---

## 6. PDF Processing

### 6.1 Libraries That Work
**PyMuPDF (fitz)** - Recommended for bounding boxes:
```python
import fitz  # PyMuPDF

def extract_text_positions(self, file_content: bytes) -> list[dict]:
    doc = fitz.open(stream=file_content, filetype="pdf")
    positions = []

    for page_index, page in enumerate(doc):
        blocks = page.get_text("dict").get("blocks", [])
        for block in blocks:
            if block.get("type") != 0:  # Skip non-text blocks
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = (span.get("text") or "").strip()
                    if not text:
                        continue
                    x0, y0, x1, y1 = span.get("bbox", [0, 0, 0, 0])
                    positions.append({
                        "page_number": page_index + 1,
                        "text_content": text,
                        "bounding_box": {
                            "x": x0,
                            "y": y0,
                            "width": x1 - x0,
                            "height": y1 - y0,
                        },
                    })
    return positions
```

**PyPDF2** - For basic text extraction:
```python
import PyPDF2
import io

def _extract_pdf_text(self, file_content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)
```

### 6.2 Text Position Matching for Citations
**Problem**: AI returns text snippets that need to link back to PDF locations.

**Solution**: Fuzzy matching with fallback:
```python
async def find_best_match(self, db, document_id, text_snippet, page_number=None):
    normalized = self._normalize_snippet(text_snippet)
    
    # Try full match first
    query = select(DocumentTextPosition).where(
        DocumentTextPosition.document_id == document_id
    )
    if page_number:
        query = query.where(DocumentTextPosition.page_number == page_number)
    
    # Full match with ILIKE
    result = await db.execute(
        query.where(DocumentTextPosition.text_content.ilike(f"%{normalized}%"))
    )
    record = result.scalars().first()
    if record:
        return record
    
    # Fallback: match first 6 tokens only
    tokens = normalized.split()[:6]
    short = " ".join(tokens)
    fallback = await db.execute(
        query.where(DocumentTextPosition.text_content.ilike(f"%{short}%"))
    )
    return fallback.scalars().first()
```

### 6.3 DOCX Extraction
```python
from docx import Document as DocxDocument
import io

def _extract_docx_text(self, file_content: bytes) -> str:
    doc = DocxDocument(io.BytesIO(file_content))
    return "\n".join([para.text for para in doc.paragraphs])
```

---

## 7. Code Patterns

### 7.1 Zustand Store with Persistence
**Pattern**: Persist only essential state, handle hydration:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCompanyStore = create<CompanyState>()(
    persist(
        (set, get) => ({
            companies: [],
            selectedCompanyId: null,
            _hasHydrated: false,
            
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            
            fetchCompanies: async () => {
                const response = await api.get('/api/companies');
                const companies = response.data;
                set({ companies });
                
                // Auto-select first if none selected
                const { selectedCompanyId } = get();
                if (companies.length > 0 && !selectedCompanyId) {
                    set({ selectedCompanyId: companies[0].id });
                }
            },
        }),
        {
            name: 'company-store',
            partialize: (state) => ({ selectedCompanyId: state.selectedCompanyId }),
            onRehydrateStorage: () => (state) => {
                if (state) state.setHasHydrated(true);
            }
        }
    )
);
```

### 7.2 FastAPI Dependency Injection
**Pattern**: Use dependencies for DB sessions and services:
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

### 7.3 File Structure
```
project/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI routers
│   │   ├── services/            # Business logic
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB setup
│   │   └── main.py              # FastAPI app
│   ├── alembic/                 # Migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── store/               # Zustand stores
│   │   ├── lib/                 # Utilities
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── next.config.mjs
└── docker-compose.yml
```

### 7.4 What to Avoid
- **Don't** hardcode URLs in components - use environment variables
- **Don't** store large objects in Zustand persist - only IDs and preferences
- **Don't** trust LLM output format - always validate and have fallbacks
- **Don't** use `postgres://` directly - convert to `postgresql://`
- **Don't** skip null byte cleaning for PDF text
- **Don't** use blocking database operations in async handlers

### 7.5 What Works Well
- **Do** use Pydantic for all API schemas with proper validation
- **Do** centralize API client configuration
- **Do** use async everywhere for database and HTTP operations
- **Do** store text positions at upload time for later PDF highlighting
- **Do** combine LLM extraction with regex fallbacks for critical data
- **Do** use SSE for AI streaming (not WebSockets for simple cases)
- **Do** implement soft deletes for user data
- **Do** use UUID primary keys for public-facing IDs

---

## 8. Testing Patterns

### 8.1 Test Structure for LLM Features
```python
def test_section_l_patterns():
    llm = LLMService()
    
    test_cases = [
        {
            "name": "References range",
            "text": "Submit minimum of 3 and maximum of 5 references.",
            "expected": {"references_required": {"min": 3, "max": 5}}
        },
        # More cases...
    ]
    
    for test in test_cases:
        result = llm.extract_section_l_patterns(test["text"])
        assert result == test["expected"], f"Failed: {test['name']}"
```

### 8.2 Async Test Setup
```python
import pytest
import asyncio

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

---

## 9. Deployment Notes

### 9.1 Railway Configuration
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### 9.2 Procfile (Heroku/Railway)
```
web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### 9.3 Required Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=...
FRONTEND_URL=https://your-frontend.com

# Frontend
NEXT_PUBLIC_API_URL=https://your-backend.com
```

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| `shadcn-ui` not found | Use `shadcn` instead |
| `postgres://` URL fails | Convert to `postgresql://` |
| CORS errors | Add both localhost and 127.0.0.1 |
| JSON parse fails from LLM | Strip markdown code blocks |
| Null bytes in text | Clean with `.replace("\x00", "")` |
| LLM returns "NaN" | Validate + fallback to regex |
| SSE buffering issues | Add `X-Accel-Buffering: no` header |
| Zustand hydration flicker | Track `_hasHydrated` state |
| PDF text positions | Use PyMuPDF for bounding boxes |
| Duplicate IDs from LLM | Explicit prompt for sub-numbering |
