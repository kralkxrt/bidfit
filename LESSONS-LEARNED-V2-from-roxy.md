# Roxy & PP Gap Analysis - Lessons Learned

> **For AI Agents**: This document captures real bugs, integration issues, and patterns discovered while building a GovCon proposal assistant (Roxy) with RAG, streaming chat, and document processing.

---

## 1. Bugs Fixed

### Vector Dimension Mismatch
**Error**: `RPC function error: dimension mismatch`
```
ERROR: different vector sizes: expected 3072, got 1536
```
**Root Cause**: OpenAI embedding model produces 1536 dimensions, but database schema was created with 3072.

**Solution**: Ensure `EMBEDDING_DIMENSIONS` in config matches the actual model output:
```python
# config.py
EMBEDDING_MODEL: str = "text-embedding-3-small"
EMBEDDING_DIMENSIONS: int = 1536  # Match model, not arbitrary value
```

**Prevention**: Always check model spec before creating pgvector columns.

---

### 204 No Content JSON Parse Error
**Error**: `Unexpected end of JSON input`

**Root Cause**: DELETE endpoints return 204 No Content, but fetch wrapper tries to parse JSON.

**Solution**:
```typescript
// api.ts
if (res.status === 204) {
    return undefined as T;
}
return res.json();
```

---

### Race Condition: Messages Wiping During Stream
**Bug**: User sends message → optimistic UI shows it → `useEffect` triggers session reload → wipes messages.

**Solution**: Track sending state and guard the effect:
```tsx
useEffect(() => {
    if (sending && messages.length > 0 && messages[0].session_id === sessionId) {
        return; // Don't wipe during active stream
    }
    // ... load messages
}, [sessionId]);
```

---

### File Content Edit Tool Failures
**Problem**: `replace_file_content` fails if target context shifted due to previous edits.

**Solution**: Always re-read the file fresh before attempting edits when previous modifications may have changed line positions.

---

### Uvicorn Freeze on Rapid Reloads
**Symptom**: Backend stops responding, API timeouts, no errors in logs.

**Root Cause**: Hot-reload triggers stacking up, process gets stuck.

**Solution**: Kill and restart process completely:
```bash
pkill -f "uvicorn" && sleep 1 && uvicorn app.main:app --reload --port 8000
```

---

## 2. Integration Issues

### Frontend ↔ Backend Connection

**URL Mismatch Debugging**:
```typescript
// Include full URL in error messages
const fullUrl = `${API_URL}${endpoint}`;
throw new Error(`${errorMessage}\nFull URL: ${fullUrl}`);
```

This beats adding console.log everywhere - you always see what URL failed.

---

### CORS Issues

**Working CORS Config** (FastAPI):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Private Network Access** (Chrome security):
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    if request.method == "OPTIONS":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response
```

---

### API Format Mismatches

**Trailing Slashes**: FastAPI can be picky. Be consistent:
```typescript
// Pick one style and stick to it
list: () => fetchJson<Client[]>('/clients/'),  // WITH slash
```

**UUID vs String**: Pydantic expects UUID type if declared:
```python
# Route param
async def delete_session(client_id: UUID, session_id: UUID, ...):
```
Frontend must send valid UUID strings.

---

### Environment Variables

**Common Mistakes**:
1. Forgetting `NEXT_PUBLIC_` prefix for client-side vars
2. Not restarting Next.js after `.env` changes
3. Different `.env` files for different services

**Pattern**:
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
SUPABASE_URL=...
ANTHROPIC_API_KEY=...
```

---

## 3. Build/Config Issues

### Next.js Gotchas

**Dynamic Imports for Client Components**:
When using browser-only libraries (e.g., PDF viewer):
```tsx
const PDFViewer = dynamic(() => import('./PDFViewer'), { ssr: false });
```

**Hydration Mismatches**:
- Don't use `Date.now()` or random IDs during initial render
- Use `useEffect` for anything that depends on browser state

---

### Package Conflicts

**PDF Libraries**:
- `react-pdf` requires specific worker setup
- `pdfjs-dist` version must match `react-pdf`

**What Worked**:
```json
{
  "react-pdf": "^9.1.0",
  "pdfjs-dist": "^4.4.168"
}
```

---

### Import Path Problems

**Alias Configuration**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Common Error**: `Module not found: Can't resolve '@/components/...'`
**Fix**: Restart dev server after tsconfig changes.

---

### Cache Corruption

**Nuclear Reset**:
```bash
# Frontend
rm -rf .next node_modules/.cache
npm run dev

# Backend (Python)
find . -type d -name __pycache__ -exec rm -rf {} +
```

---

## 4. Database/Supabase

### Migration Issues

**Vector Column Creation**:
```sql
-- Must match embedding model dimensions
ALTER TABLE document_chunks 
ADD COLUMN embedding vector(1536);  -- NOT 3072
```

**RPC Function for Similarity Search**:
```sql
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_client_id uuid
)
RETURNS TABLE (
    id uuid,
    content text,
    document_id uuid,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.content,
        dc.document_id,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.client_id = filter_client_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

---

### Query Patterns

**What Worked**:
```python
# Pagination with count
result = supabase.table("chat_messages")\
    .select("id", count="exact")\
    .eq("session_id", session_id)\
    .execute()
# result.count = total count

# Chained filters
supabase.table("documents")\
    .select("id, searchable_name")\
    .eq("client_id", client_id)\
    .ilike("searchable_name", f"%{name}%")\
    .limit(1)\
    .execute()
```

**What Failed**:
```python
# DON'T: Empty strings in TEXT columns that have NOT NULL
supabase.table("chats").insert({"title": ""})  # May fail

# DO: Use meaningful default
supabase.table("chats").insert({"title": content[:30] + "..."})
```

---

## 5. AI/Claude Integration

### Prompt Formatting That Worked

**System Prompt Structure**:
```
[PERSONA/ROLE]
You are Roxy, an expert GovCon proposal writer...

[KNOWLEDGE CONTEXT]  
<retrieved_documents>
[Document chunks injected here]
</retrieved_documents>

[SPECIFIC RULES]
- Never use: "leverage", "utilize", "best-in-class"
- Always include: section references, discriminators

[OUTPUT FORMAT]
Format your response using markdown...
```

**XML Tags for Context**:
```python
context_block = "<retrieved_documents>\n"
for chunk in chunks:
    context_block += f"[{chunk['name']}]\n{chunk['content']}\n\n"
context_block += "</retrieved_documents>\n\n"
```

---

### Token Limit Handling

**Tiered Retrieval**:
```python
RETRIEVAL_CONFIG = {
    'total_chunks': 100,
    'high_relevance_chunks': 25,    # sim > 0.7
    'medium_relevance_chunks': 35,  # sim > 0.5
    'background_chunks': 40,        # sim > 0.3
}
```

**Truncate Before Embedding Search**:
```python
# Don't search on attached content, only the question
if "\n\n--- ATTACHED CONTEXT ---" in message_content:
    retrieval_query = message_content.split("\n\n--- ATTACHED CONTEXT ---")[0]
```

---

### Streaming SSE Implementation

**Backend (FastAPI)**:
```python
async def generate_chat_stream(...) -> AsyncGenerator[str, None]:
    yield f"data: {json.dumps({'type': 'start'})}\n\n"
    
    with anthropic.messages.stream(...) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'type': 'content', 'delta': text})}\n\n"
    
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

@router.post("/messages/stream")
async def stream_message(...):
    return StreamingResponse(
        generate_chat_stream(...),
        media_type="text/event-stream"
    )
```

**Frontend (React)**:
```typescript
const response = await fetch(url, { 
    method: 'POST',
    body: JSON.stringify({ content }),
    signal: abortController.signal  // For stop button
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';  // Keep incomplete chunk

    for (const part of parts) {
        if (part.startsWith('data: ')) {
            const event = JSON.parse(part.replace('data: ', ''));
            if (event.type === 'content') {
                accumulatedContent += event.delta;
                setMessages(prev => prev.map(m => 
                    m.id === msgId ? { ...m, content: accumulatedContent } : m
                ));
            }
        }
    }
}
```

---

### Response Parsing Gotchas

**Stop Button Implementation**:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
};

// In stream function:
try {
    // ... stream logic
} catch (error: any) {
    if (error.name === 'AbortError') {
        console.log('Stopped by user');
    } else {
        throw error;
    }
}
```

---

## 6. PDF Processing

### Libraries That Worked

**Backend (Python)**: `pypdf` (formerly PyPDF2)
```python
from pypdf import PdfReader
import io

async def extract_text(file) -> str:
    content = await file.read()
    await file.seek(0)
    
    reader = PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        extract = page.extract_text()
        if extract:
            text += extract + "\n\n"
    
    await file.seek(0)  # Reset for potential re-use
    return text
```

**Frontend**: `react-pdf` for rendering
```tsx
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

---

### Text Extraction Issues

**Problem**: Some PDFs return empty text (scanned images)
**Solution**: Fall back gracefully:
```python
text = page.extract_text()
if not text or len(text.strip()) < 50:
    text = "[Page appears to be an image or scan - OCR not available]"
```

**Problem**: Garbled text from complex layouts
**Solution**: PyMuPDF (fitz) handles these better:
```python
import fitz  # PyMuPDF
doc = fitz.open(stream=content, filetype="pdf")
text = ""
for page in doc:
    text += page.get_text() + "\n\n"
```

---

## 7. Code Patterns

### What Worked Well

**Centralized API Client**:
```typescript
// lib/api.ts - Single source of truth for all API calls
export const api = {
    clients: {
        list: () => fetchJson<Client[]>('/clients/'),
        create: (data) => fetchJson<Client>('/clients/', { method: 'POST', body: JSON.stringify(data) }),
    },
    documents: { ... },
    chat: { ... }
};
```

**Optimistic UI Updates**:
```typescript
// Add message immediately, update when response comes
const tempMsg = { id: Date.now().toString(), content, role: 'user' };
setMessages(prev => [...prev, tempMsg]);
// Then stream real response...
```

**Zustand for Global State**:
```typescript
// stores/app-store.ts
export const useAppStore = create<AppState>((set) => ({
    selectedClient: null,
    setSelectedClient: (client) => set({ selectedClient: client }),
}));
```

---

### What to Avoid

**❌ Multiple API clients**:
```typescript
// DON'T: Scattered fetch calls with different error handling
const res = await fetch('/api/clients');  // In component A
const data = await axios.get('/clients'); // In component B
```

**❌ Inline styles for theming**:
```tsx
// DON'T
<div style={{ background: isDark ? '#1C1C1E' : '#FAFAFA' }}>

// DO: Use CSS variables or Tailwind dark mode
<div className="bg-[#FAFAFA] dark:bg-[#1C1C1E]">
```

**❌ Storing derived state**:
```typescript
// DON'T
const [filteredDocs, setFilteredDocs] = useState(docs.filter(...));

// DO: Compute on render
const filteredDocs = useMemo(() => docs.filter(...), [docs, filter]);
```

---

### File Structure That Worked

```
backend/
  app/
    routes/         # FastAPI routers
    services/       # Business logic
    processors/     # File processing
    schemas/        # Pydantic models
    prompts/        # AI prompt templates
    config.py       # Settings
    main.py         # App entry point

frontend/
  src/
    app/            # Next.js App Router pages
    components/
      chat/         # Feature-specific components
      ui/           # Reusable UI components
    lib/
      api.ts        # API client
      utils.ts      # Helpers
    stores/         # Zustand stores
    types/          # TypeScript types
```

---

## Quick Reference: Error → Solution

| Error | Solution |
|-------|----------|
| `dimension mismatch` | Check EMBEDDING_DIMENSIONS matches model |
| `Unexpected end of JSON` | Handle 204 No Content responses |
| `CORS blocked` | Add origin to allow_origins list |
| `Module not found: @/` | Restart dev server after tsconfig change |
| `Hydration mismatch` | Use dynamic import with `ssr: false` |
| `API timeout` | Kill and restart uvicorn |
| `Not Found on delete` | Check trailing slashes in URL |
| `Stream not updating` | Check SSE format: `data: {...}\n\n` |

---

*Last Updated: January 2026*
