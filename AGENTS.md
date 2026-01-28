# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**PP Gap Analysis** (BidWin) is a government contractor tool that uses AI to analyze past performance against new contract opportunities. The system compares company documents with RFP requirements and generates gap analysis reports.

**Tech Stack:**
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand
- Backend: Python FastAPI, SQLAlchemy (async), Alembic
- Database: PostgreSQL with pgvector extension (hosted on Supabase)
- AI: Anthropic Claude (analysis), OpenAI (embeddings)
- Storage: Supabase Storage (S3-compatible)

## Common Commands

### Frontend (`/frontend`)
```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Add shadcn components
npx shadcn@latest add [component-name]
```

### Backend (`/backend`)
```bash
# Development
source venv/bin/activate       # Activate virtual environment
uvicorn app.main:app --reload  # Start dev server (localhost:8000)

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Testing
pytest                         # Run all tests
pytest test_roxy_citation_flow.py -v  # Run specific test with verbose output
```

### Full Stack
```bash
# Start both servers (run in separate terminals)
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Architecture

### High-Level Data Flow

1. **Organization Context**: User selects org → stored in Zustand → injected into API requests via axios interceptor
2. **Document Upload**: Frontend → FastAPI → Supabase Storage → Text extraction → LLM metadata extraction → pgvector embeddings
3. **Gap Analysis**: User triggers → FastAPI fetches PP docs + opportunity → Claude API analyzes → Results stored in JSONB → Frontend displays
4. **Roxy Chat**: SSE streaming from Claude → Citations linked to PDF text positions → Interactive UI

### Frontend Structure

```
src/
├── app/                         # Next.js App Router pages
│   ├── (routes)/               # Main application routes
│   ├── api/                    # API route handlers (auth)
│   └── layout.tsx              # Root layout with AppLayout wrapper
├── components/
│   ├── layout/                 # AppLayout, Sidebar, TopBar
│   ├── ui/                     # shadcn/ui components
│   ├── organizations/          # Org switcher, sheets
│   └── [feature]/              # Feature-specific components
├── lib/
│   ├── api.ts                  # Axios client with org interceptor
│   ├── roxyApi.ts              # SSE streaming for Roxy chat
│   ├── stores/                 # Zustand stores (orgStore)
│   └── utils.ts                # Utility functions
├── store/                      # Additional stores
└── types/                      # TypeScript type definitions
```

**Key Pattern**: `AppLayout` wraps all pages (except login), handles org loading, and provides Sidebar + TopBar.

### Backend Structure

```
app/
├── main.py                     # FastAPI app, CORS, router registration
├── config.py                   # Pydantic settings (env vars)
├── database.py                 # AsyncSession setup
├── dependencies.py             # FastAPI dependencies (get_db)
├── models.py                   # SQLAlchemy models (all in one file)
├── schemas.py                  # Pydantic request/response schemas
├── api/routes/                 # FastAPI routers
│   ├── companies.py
│   ├── documents.py
│   ├── opportunities.py
│   ├── analyses.py
│   ├── roxy.py
│   └── [other routes]
├── services/                   # Business logic
│   ├── analysis_engine.py     # Gap analysis orchestration
│   ├── document_processor.py  # PDF/DOCX extraction
│   ├── llm_service.py         # Claude API calls
│   ├── pdf_text_service.py    # Text position extraction
│   ├── roxy_service.py        # Roxy chat with citations
│   ├── export_service.py      # DOCX export
│   └── storage_service.py     # Supabase storage
└── prompts/                    # LLM prompt templates
```

**Key Pattern**: All database models in `models.py`, all schemas in `schemas.py`. Services are injected via dependencies.

## Critical Patterns & Gotchas

### 1. Organization Context Management

**Frontend**: Organization ID is automatically injected into API requests via axios interceptor:
```typescript
// lib/api.ts - DO NOT manually add org_id to request bodies
api.interceptors.request.use((config) => {
    const { currentOrg } = useOrgStore.getState();
    if (currentOrg?.id) {
        config.params = { ...(config.params || {}), org_id: currentOrg.id };
    }
    return config;
});
```

**Backend**: Extract org_id from query params, not request body:
```python
@router.get("/api/documents")
async def get_documents(org_id: str, db: AsyncSession = Depends(get_db)):
    # org_id comes from query param, injected by frontend interceptor
```

**IMPORTANT**: Do NOT add `org_id` to Pydantic request schemas unless explicitly required by the endpoint design. The interceptor adds it as a query param.

### 2. Database Operations

**Always use async**:
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_documents(db: AsyncSession, org_id: str):
    result = await db.execute(
        select(Document).where(Document.org_id == org_id)
    )
    return result.scalars().all()
```

**URL Conversion**: Supabase provides `postgres://` URLs, but SQLAlchemy needs `postgresql://`:
```python
# config.py
@property
def SQLALCHEMY_DATABASE_URL(self) -> str:
    if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
        return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
    return self.DATABASE_URL
```

### 3. LLM Integration Patterns

**JSON Response Parsing**: Claude often wraps JSON in markdown code blocks. Always strip them:
```python
def _parse_json(self, text: str) -> Dict[str, Any]:
    text = text.strip()
    if "```json" in text:
        json_start = text.index("```json") + 7
        json_end = text.index("```", json_start)
        json_str = text[json_start:json_end].strip()
    # ... additional fallbacks
    return json.loads(json_str)
```

**Streaming with SSE**: For Roxy chat, use Server-Sent Events:
```python
# Backend
from fastapi.responses import StreamingResponse

async def generate():
    async with anthropic_client.messages.stream(...) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                yield f"data: {json.dumps({'type': 'text', 'content': event.delta.text})}\n\n"

return StreamingResponse(generate(), media_type="text/event-stream")
```

```typescript
// Frontend
const response = await fetch(`${API_URL}/api/roxy/chat/stream`, {...});
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE data: lines
}
```

### 4. Document Processing

**Text Extraction**: Use PyMuPDF for PDF with bounding boxes, PyPDF2 for basic text:
```python
import fitz  # PyMuPDF

def extract_text_positions(file_content: bytes):
    doc = fitz.open(stream=file_content, filetype="pdf")
    for page in doc:
        blocks = page.get_text("dict").get("blocks", [])
        # Extract text with bounding boxes for PDF highlighting
```

**Clean Text**: Remove null bytes before storing in PostgreSQL:
```python
def _clean_text(self, text: str) -> str:
    return text.replace("\x00", "")
```

### 5. CORS Configuration

Allow both localhost and 127.0.0.1 for local dev:
```python
# main.py
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)
```

### 6. State Management

**Zustand with Persistence**:
```typescript
// Persist only essential state (selectedOrgId, not full org objects)
export const useOrgStore = create<OrgState>()(
    persist(
        (set, get) => ({
            organizations: [],
            currentOrg: null,
            // ... actions
        }),
        {
            name: 'org-store',
            partialize: (state) => ({ currentOrg: state.currentOrg }),
        }
    )
);
```

### 7. Design System Adherence

**CRITICAL**: This project has a strict design system (see `bidwin-design-system.md`):
- Sidebar: `bg-slate-800` with BidWin logo
- Background: `bg-slate-50` for app, `bg-white` for cards
- Cards: `rounded-xl border border-slate-200 shadow-card p-6`
- Tabs: Transparent background with `border-b-2 border-blue-500` for active state
- Spacing: `p-6` for pages, `p-4`/`p-5` for cards, `space-y-4` or `gap-4` for sections
- Roxy: Purple/violet gradient (`#8B5CF6` to `#7C3AED`)

**DO NOT improvise styling**. Follow the established patterns in existing components.

## Testing Patterns

### Backend Tests
```python
# Use pytest with async support
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/documents")
    assert response.status_code == 200
```

### Frontend (Manual Testing)
1. Check compile errors: `npm run build`
2. Test key routes: curl or browser
3. Verify no console errors in browser dev tools

## Environment Variables

### Backend (`.env`)
```bash
DATABASE_URL=postgresql://...           # Supabase PostgreSQL connection
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...               # For storage
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                  # For embeddings
FRONTEND_URL=https://...               # Production frontend URL (optional)
JWT_SECRET_KEY=...                     # For auth tokens
```

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Or production backend URL
```

## Key Files to Understand

1. **`frontend/src/lib/api.ts`**: Axios client with org_id interceptor
2. **`frontend/src/components/layout/AppLayout.tsx`**: Root layout wrapper
3. **`backend/app/main.py`**: FastAPI app with CORS and routers
4. **`backend/app/models.py`**: All SQLAlchemy models (single file)
5. **`backend/app/services/roxy_service.py`**: Roxy chat with SSE streaming
6. **`backend/app/services/analysis_engine.py`**: Gap analysis orchestration
7. **`backend/app/services/llm_service.py`**: Claude API integration

## Debugging Tips

### "422 Unprocessable Entity"
- Check if you're adding `org_id` to request body when it should be a query param
- Verify Pydantic schema matches request data exactly

### CORS Errors
- Ensure both `localhost` and `127.0.0.1` are in backend CORS origins
- Check `FRONTEND_URL` env var for production

### LLM JSON Parse Errors
- Claude wraps JSON in markdown. Use `_parse_json()` helper.
- For regex fallbacks on invalid values like "NaN", see `LESSONS-LEARNED-COMPREHENSIVE.md`

### PDF Text Not Found
- Use PyMuPDF (`fitz`) for bounding box extraction
- Fuzzy match with fallback to first 6 tokens when exact match fails

### Zustand Hydration Issues
- Track `_hasHydrated` state to prevent flicker on initial load
- Only persist essential state (IDs, not full objects)

## Deployment

### Backend (Railway/Heroku)
```json
// railway.json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT" }
}
```

### Frontend (Vercel)
```javascript
// next.config.mjs
const nextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
};
```

## Additional Documentation

For deeper context, reference these files in the project root:
- **`00-BUILD-INSTRUCTIONS.md`**: Complete build sequence
- **`02-ARCHITECTURE-system-design.md`**: System architecture, API design
- **`LESSONS-LEARNED-COMPREHENSIVE.md`**: Bugs, fixes, patterns from development
- **`bidwin-design-system.md`**: Complete UI/UX design system
- **`04-AI-PROMPTS-agent-instructions.md`**: LLM prompts (DO NOT MODIFY without approval)
