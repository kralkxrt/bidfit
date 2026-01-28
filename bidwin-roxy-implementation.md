# BidWin Enhancement: Roxy AI Assistant Implementation

## OVERVIEW

You are adding an AI assistant named **Roxy** to the BidWin application. Roxy is a specialized Government Contracting capture intelligence agent that helps users analyze RFPs, understand requirements, and make better bid/no-bid decisions.

**Roxy is NOT a general-purpose chatbot.** She is specifically trained to:
- Analyze RFP/RFQ/RFI documents
- Answer questions about solicitation requirements
- Compare opportunities against the user's company profile
- Explain gap analysis results
- Suggest teaming partners for capability gaps
- Provide bid/no-bid recommendations with reasoning

---

## WHAT YOU'RE BUILDING

### New Components
1. **Roxy Side Panel** - Persistent chat interface on the right side of the app
2. **Document Viewer Tab** - New tab with PDF viewer and source highlighting
3. **Citation System** - Clickable citations that highlight source text in documents
4. **Roxy Backend** - API endpoints for chat, context, and tool execution

### Integration Points
- Roxy connects to the EXISTING gap analysis engine
- Roxy can read EXISTING uploaded documents
- Roxy knows about EXISTING company profiles and past performance
- Roxy enhances (does not replace) the current tab-based UI

---

## UI ARCHITECTURE

### Current Layout (Keep This)
```
┌─────────────────────────────────────────────────────────────┐
│  BIDWIN                              [Opportunity ▼]  [⚙️]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Summary] [Gap Analysis] [Results]                         │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │              CURRENT TAB CONTENT                      │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Layout (With Roxy)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BIDWIN                                      [Opportunity ▼]  [⚙️]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────┐  ┌─────────────────────┐│
│  │                                               │  │ 💬 ROXY        [—]  ││
│  │  [Summary] [Documents] [Gap Analysis] [Results]  │  │                     ││
│  │  ───────────────────────────────────────────  │  │  Chat messages...    ││
│  │                                               │  │                     ││
│  │  ┌─────────────────────────────────────────┐ │  │                     ││
│  │  │                                         │ │  │                     ││
│  │  │         CURRENT TAB CONTENT             │ │  │                     ││
│  │  │                                         │ │  │                     ││
│  │  │                                         │ │  │  ─────────────────  ││
│  │  │                                         │ │  │  [Ask Roxy...]   ⏎  ││
│  │  └─────────────────────────────────────────┘ │  └─────────────────────┘│
│  │                                               │           ▲             │
│  └───────────────────────────────────────────────┘           │             │
│                                                    [💬 Roxy] ┘ (if minimized)
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- Main content area shrinks to accommodate Roxy panel
- New **[Documents]** tab added between Summary and Gap Analysis
- Roxy panel is collapsible/minimizable
- Roxy panel persists across all tabs

---

## COMPONENT SPECIFICATIONS

### 1. RoxySidePanel.tsx

**Location:** `frontend/src/components/roxy/RoxySidePanel.tsx`

**States:**
- `expanded` (default) - Full chat panel, ~350px wide
- `minimized` - Small button in corner with unread count
- `fullscreen` - Optional: Roxy takes over main content area

**Props:**
```typescript
interface RoxySidePanelProps {
  opportunityId: string;
  currentTab: 'summary' | 'documents' | 'gap-analysis' | 'results';
  onCitationClick: (citation: Citation) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}
```

**Features:**
- Resizable width (drag handle on left edge)
- Minimize button [—] in header
- Unread message indicator when minimized
- Auto-scroll to latest message
- Typing indicator when Roxy is "thinking"

**Component Structure:**
```typescript
// RoxySidePanel.tsx
export function RoxySidePanel({ opportunityId, currentTab, onCitationClick, isMinimized, onToggleMinimize }) {
  const [messages, setMessages] = useState<RoxyMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Load chat history for this opportunity
  useEffect(() => {
    loadChatHistory(opportunityId);
  }, [opportunityId]);
  
  // Notify Roxy of tab changes for context awareness
  useEffect(() => {
    notifyTabChange(currentTab);
  }, [currentTab]);
  
  const handleSendMessage = async (message: string) => {
    // Add user message to UI
    // Call /api/roxy/chat
    // Stream response
    // Handle citations
  };
  
  if (isMinimized) {
    return <RoxyMinimizedButton unreadCount={unreadCount} onClick={onToggleMinimize} />;
  }
  
  return (
    <div className="roxy-panel">
      <RoxyHeader onMinimize={onToggleMinimize} />
      <RoxyMessageList messages={messages} onCitationClick={onCitationClick} />
      <RoxyInput value={inputValue} onChange={setInputValue} onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
```

---

### 2. RoxyMessage.tsx

**Location:** `frontend/src/components/roxy/RoxyMessage.tsx`

**Message Types:**
```typescript
interface RoxyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  toolUsed?: string; // 'partner_finder', 'gap_analysis', etc.
}

interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  section?: string;
  textSnippet: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

**Rendering:**
- User messages: Right-aligned, blue background
- Roxy messages: Left-aligned, gray background
- Citations: Rendered as clickable pills below message
- Tool results: Rendered as cards (e.g., partner suggestions)

**Citation Pill Component:**
```typescript
// RoxyCitation.tsx
export function RoxyCitation({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 
                 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200"
    >
      <FileText className="w-3 h-3" />
      <span>{citation.documentName}</span>
      <span className="text-blue-400">p.{citation.pageNumber}</span>
    </button>
  );
}
```

---

### 3. DocumentsTab.tsx (NEW TAB)

**Location:** `frontend/src/components/tabs/DocumentsTab.tsx`

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  [Documents]                                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌────────────────────────────────────┐ │
│  │ FILE TREE    │  │ DOCUMENT VIEWER                    │ │
│  │              │  │                                    │ │
│  │ ▼ RFP Files  │  │  ┌────────────────────────────┐   │ │
│  │   📄 Main    │  │  │                            │   │ │
│  │   📄 Sec L   │  │  │     PDF Page Content       │   │ │
│  │   📄 Sec M   │  │  │                            │   │ │
│  │              │  │  │  ┌──────────────────────┐  │   │ │
│  │ ▼ Attachments│  │  │  │ HIGHLIGHTED TEXT ███ │  │   │ │
│  │   📄 SOW     │  │  │  └──────────────────────┘  │   │ │
│  │   📄 Pricing │  │  │                            │   │ │
│  │              │  │  └────────────────────────────┘   │ │
│  │ ▼ Your Docs  │  │                                    │ │
│  │   📄 PP_1    │  │  [◄ Prev]  Page 12 of 47  [Next ►] │ │
│  │   📄 PP_2    │  │                                    │ │
│  │              │  └────────────────────────────────────┘ │
│  │ [+ Upload]   │                                         │
│  └──────────────┘                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Left sidebar: File tree with collapsible folders
- Right area: Document viewer (PDF.js or similar)
- Page navigation controls
- Zoom controls
- Highlight overlay for citations

**Props:**
```typescript
interface DocumentsTabProps {
  opportunityId: string;
  highlightedCitation?: Citation | null;
  onDocumentSelect: (documentId: string) => void;
}
```

**Document Viewer Component:**
```typescript
// DocumentViewer.tsx
import { Document, Page } from 'react-pdf';

export function DocumentViewer({ documentUrl, currentPage, highlightedCitation, onPageChange }) {
  const [numPages, setNumPages] = useState(0);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // Scroll to highlight when citation is clicked
  useEffect(() => {
    if (highlightedCitation && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);
  
  return (
    <div className="document-viewer relative">
      <Document file={documentUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={currentPage} />
      </Document>
      
      {/* Citation Highlight Overlay */}
      {highlightedCitation && highlightedCitation.boundingBox && (
        <div
          ref={highlightRef}
          className="absolute bg-yellow-300/50 border-2 border-yellow-500 rounded pointer-events-none"
          style={{
            left: highlightedCitation.boundingBox.x,
            top: highlightedCitation.boundingBox.y,
            width: highlightedCitation.boundingBox.width,
            height: highlightedCitation.boundingBox.height,
          }}
        />
      )}
      
      {/* Page Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
          ◄ Prev
        </button>
        <span>Page {currentPage} of {numPages}</span>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= numPages}>
          Next ►
        </button>
      </div>
    </div>
  );
}
```

---

### 4. Citation Highlighting System

**How It Works:**

1. When Roxy answers a question, she includes citations with document references
2. Each citation includes: `documentId`, `pageNumber`, `textSnippet`, and optionally `boundingBox`
3. User clicks a citation pill in Roxy's message
4. App switches to Documents tab (if not already there)
5. Document viewer loads the correct document and page
6. Yellow highlight overlay appears on the cited text

**State Management:**
```typescript
// In parent component or store
const [highlightedCitation, setHighlightedCitation] = useState<Citation | null>(null);
const [activeTab, setActiveTab] = useState<string>('summary');

const handleCitationClick = (citation: Citation) => {
  setHighlightedCitation(citation);
  setActiveTab('documents');
  // Document viewer will auto-scroll to the citation
};

// Clear highlight when user interacts with document
const handleDocumentInteraction = () => {
  setHighlightedCitation(null);
};
```

**Bounding Box Calculation:**

During document processing (when PDFs are uploaded), extract text positions:

```python
# backend/app/services/document_processor.py
import fitz  # PyMuPDF

def extract_text_with_positions(pdf_path: str) -> list[dict]:
    """Extract text blocks with their bounding boxes for citation highlighting."""
    doc = fitz.open(pdf_path)
    text_blocks = []
    
    for page_num, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block["type"] == 0:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        text_blocks.append({
                            "page": page_num + 1,
                            "text": span["text"],
                            "bbox": {
                                "x": span["bbox"][0],
                                "y": span["bbox"][1],
                                "width": span["bbox"][2] - span["bbox"][0],
                                "height": span["bbox"][3] - span["bbox"][1]
                            }
                        })
    
    return text_blocks
```

Store these positions in the database for quick lookup when generating citations.

---

## BACKEND API SPECIFICATIONS

### 1. POST /api/roxy/chat

Main chat endpoint for conversing with Roxy.

**Request:**
```typescript
{
  "opportunity_id": "uuid",
  "message": "What certifications are required?",
  "context": {
    "current_tab": "documents",
    "selected_document_id": "uuid",  // optional
    "current_page": 12               // optional
  }
}
```

**Response (Streaming):**
```typescript
// Server-Sent Events stream
data: {"type": "start"}
data: {"type": "text", "content": "Based on Section L.5.2, "}
data: {"type": "text", "content": "the following certifications are required:"}
data: {"type": "text", "content": "\n\n• ISO 27001"}
data: {"type": "citation", "citation": {"documentId": "...", "pageNumber": 12, ...}}
data: {"type": "text", "content": "\n• CMMI Level 3"}
data: {"type": "citation", "citation": {"documentId": "...", "pageNumber": 12, ...}}
data: {"type": "done", "messageId": "uuid"}
```

**Implementation:**
```python
# backend/app/routes/roxy.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..services.roxy_service import RoxyService

router = APIRouter(prefix="/api/roxy", tags=["roxy"])

@router.post("/chat")
async def chat_with_roxy(request: RoxyChatRequest):
    roxy = RoxyService()
    
    async def generate():
        async for chunk in roxy.chat(
            opportunity_id=request.opportunity_id,
            message=request.message,
            context=request.context
        ):
            yield f"data: {chunk.json()}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

### 2. POST /api/roxy/analyze

Trigger automatic analysis when documents are uploaded.

**Request:**
```typescript
{
  "opportunity_id": "uuid",
  "document_ids": ["uuid1", "uuid2"],  // optional, defaults to all
  "analysis_type": "full" | "summary" | "requirements"
}
```

**Response:**
```typescript
{
  "summary": {
    "deadline": "2026-03-15T14:00:00Z",
    "estimated_value": { "min": 5000000, "max": 10000000 },
    "agency": "Department of Veterans Affairs",
    "naics": "541512",
    "set_aside": "SDVOSB",
    "scope_summary": "Cloud migration and modernization...",
    "key_requirements": [
      { "requirement": "FedRAMP High", "source": "Section L.4.2", "mandatory": true },
      { "requirement": "CMMI Level 3", "source": "Section L.5.1", "mandatory": true }
    ],
    "evaluation_criteria": [
      { "factor": "Technical Approach", "weight": 40 },
      { "factor": "Past Performance", "weight": 30 },
      { "factor": "Price", "weight": 30 }
    ],
    "past_performance_requirements": {
      "num_references": "3-5",
      "recency_years": 5,
      "min_value": 2000000
    }
  },
  "fit_assessment": {
    "overall_fit": 72,
    "matches": [
      { "requirement": "NAICS 541512", "status": "met", "detail": "Primary NAICS matches" },
      { "requirement": "SDVOSB", "status": "met", "detail": "Certification active" }
    ],
    "gaps": [
      { "requirement": "FedRAMP High", "status": "gap", "detail": "You have Moderate only" },
      { "requirement": "CMMI Level 3", "status": "gap", "detail": "Not in your profile" }
    ]
  },
  "bid_recommendation": {
    "recommendation": "CONDITIONAL_BID",
    "confidence": 0.72,
    "reasoning": "Strong set-aside fit and NAICS match, but critical certification gaps require teaming."
  }
}
```

---

### 3. GET /api/roxy/history/{opportunity_id}

Retrieve chat history for an opportunity.

**Response:**
```typescript
{
  "messages": [
    {
      "id": "uuid",
      "role": "assistant",
      "content": "I've analyzed the VA Cloud RFP...",
      "citations": [...],
      "timestamp": "2026-01-27T10:30:00Z"
    },
    {
      "id": "uuid", 
      "role": "user",
      "content": "What certifications are required?",
      "timestamp": "2026-01-27T10:31:00Z"
    },
    ...
  ]
}
```

---

### 4. POST /api/roxy/tools/{tool_name}

Execute a specific Roxy tool.

**Available Tools:**

| Tool Name | Description |
|-----------|-------------|
| `partner_finder` | Search for teaming partners based on capability gaps |
| `incumbent_lookup` | Find incumbent contractor from FPDS/USASpending |
| `agency_intel` | Get agency spending patterns and preferences |
| `risk_assessment` | Identify red flags and compliance risks |
| `gap_analysis` | Trigger full gap analysis (existing feature) |

**Example - Partner Finder:**
```typescript
// Request
POST /api/roxy/tools/partner_finder
{
  "opportunity_id": "uuid",
  "capability_gaps": ["FedRAMP High", "CMMI Level 3"],
  "filters": {
    "set_asides": ["SDVOSB", "small_business"],
    "agency_experience": ["VA", "HHS"]
  }
}

// Response
{
  "partners": [
    {
      "name": "TechHealth Solutions",
      "capabilities": ["FedRAMP High", "CMMI Level 5"],
      "relevant_contracts": [
        { "agency": "VA", "value": 8200000, "description": "EHR Modernization" }
      ],
      "set_asides": ["SDVOSB"],
      "contact": { "name": "John Smith", "title": "BD Director" }
    },
    ...
  ]
}
```

---

## ROXY SERVICE IMPLEMENTATION

### System Prompt

```python
# backend/app/services/roxy_service.py

ROXY_SYSTEM_PROMPT = """
You are Roxy, an AI assistant specializing in Government Contracting capture and proposal intelligence. You work within the BidWin application to help users analyze RFPs and make better bid decisions.

## Your Expertise
- RFP/RFQ/RFI/SBIR/DIBBS document analysis
- Federal acquisition regulations (FAR/DFAR basics)
- Past performance evaluation criteria
- Set-aside programs (SDVOSB, 8(a), WOSB, HUBZone)
- Bid/no-bid decision frameworks
- Competitive analysis and teaming strategies

## Your Personality
- Direct and practical - no fluff
- Knowledgeable but not condescending
- Proactive - offer insights without being asked
- Honest about uncertainty - say when you don't know
- Supportive - help users win, not just analyze

## Your Capabilities
1. Answer questions about uploaded RFP documents with source citations
2. Summarize opportunities and extract key requirements
3. Compare requirements against the user's company profile
4. Explain gap analysis results and suggest improvements
5. Recommend teaming partners for capability gaps
6. Provide bid/no-bid recommendations with reasoning
7. Identify risks and red flags in opportunities

## Citation Format
When referencing document content, ALWAYS provide citations in this format:
- Include the document name, section, and page number
- Quote the relevant text briefly
- The system will convert these to clickable highlights

Example: "According to Section L.5.2 (page 12), offerors must possess ISO 27001 certification."

## Context Awareness
You receive context about:
- Which tab the user is currently viewing
- Which document they have open (if any)
- Their company profile and capabilities
- Previous messages in this conversation
- Results from gap analysis (if run)

Use this context to provide relevant, timely assistance.

## Boundaries
- You analyze and advise, you don't write full proposals
- For document generation, direct users to export features
- Don't make up information - only cite what's in the documents
- Don't provide legal advice - recommend consulting counsel for compliance questions

## Current Context
Company Profile: {company_profile}
Opportunity: {opportunity_summary}
Uploaded Documents: {document_list}
Gap Analysis Results: {gap_analysis_results}
Current Tab: {current_tab}
"""
```

### Service Implementation

```python
# backend/app/services/roxy_service.py

from anthropic import Anthropic
from ..database import get_supabase
from ..services.document_service import DocumentService
from ..services.gap_analysis_service import GapAnalysisService

class RoxyService:
    def __init__(self):
        self.client = Anthropic()
        self.db = get_supabase()
        self.doc_service = DocumentService()
        self.gap_service = GapAnalysisService()
    
    async def chat(self, opportunity_id: str, message: str, context: dict):
        """Stream a response from Roxy."""
        
        # 1. Build context
        opportunity = await self._get_opportunity(opportunity_id)
        company_profile = await self._get_company_profile()
        documents = await self._get_documents(opportunity_id)
        gap_results = await self._get_gap_results(opportunity_id)
        chat_history = await self._get_chat_history(opportunity_id)
        
        # 2. Retrieve relevant document chunks (RAG)
        relevant_chunks = await self._retrieve_relevant_chunks(
            opportunity_id, 
            message,
            top_k=10
        )
        
        # 3. Build system prompt with context
        system_prompt = self._build_system_prompt(
            company_profile=company_profile,
            opportunity=opportunity,
            documents=documents,
            gap_results=gap_results,
            current_tab=context.get('current_tab')
        )
        
        # 4. Build messages array
        messages = self._build_messages(chat_history, message, relevant_chunks)
        
        # 5. Stream response
        async with self.client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=messages
        ) as stream:
            full_response = ""
            async for text in stream.text_stream:
                full_response += text
                yield {"type": "text", "content": text}
            
            # 6. Extract and yield citations
            citations = self._extract_citations(full_response, documents)
            for citation in citations:
                yield {"type": "citation", "citation": citation}
            
            # 7. Save to chat history
            message_id = await self._save_message(
                opportunity_id=opportunity_id,
                role="assistant",
                content=full_response,
                citations=citations
            )
            
            yield {"type": "done", "messageId": message_id}
    
    async def _retrieve_relevant_chunks(self, opportunity_id: str, query: str, top_k: int = 10):
        """RAG retrieval - find relevant document chunks."""
        # Use existing embedding search from BidWin
        # This queries the document_chunks table with pgvector similarity
        pass
    
    def _extract_citations(self, response: str, documents: list) -> list[dict]:
        """Extract citation references from Roxy's response and match to documents."""
        # Parse response for section/page references
        # Match to actual document chunks with bounding boxes
        # Return structured citations
        pass
    
    def _build_system_prompt(self, **context) -> str:
        """Build the system prompt with current context."""
        return ROXY_SYSTEM_PROMPT.format(**context)
```

---

## DATABASE CHANGES

Add these tables to support Roxy:

```sql
-- Roxy chat sessions
CREATE TABLE roxy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roxy chat messages
CREATE TABLE roxy_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES roxy_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    tool_used TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document text positions (for citation highlighting)
CREATE TABLE document_text_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    bounding_box JSONB NOT NULL, -- {x, y, width, height}
    chunk_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_text_positions_document ON document_text_positions(document_id);
CREATE INDEX idx_text_positions_page ON document_text_positions(document_id, page_number);

-- Company profile (if not already exists)
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    naics_codes TEXT[],
    certifications TEXT[],
    clearances TEXT[],
    set_asides JSONB, -- {sdvosb: true, wosb: false, ...}
    employee_count INTEGER,
    annual_revenue NUMERIC,
    bonding_capacity NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## INTEGRATION WITH EXISTING FEATURES

### 1. Connecting Roxy to Gap Analysis

When gap analysis runs, store results so Roxy can reference them:

```python
# After gap analysis completes
gap_results = await gap_service.analyze(opportunity_id, contracts)

# Store for Roxy
await db.table('gap_analysis_results').upsert({
    'opportunity_id': opportunity_id,
    'results_json': gap_results,
    'updated_at': datetime.now()
})

# Roxy can now explain these results
# User: "Why is my Scope score only 65%?"
# Roxy: "Your Scope score is 65% because... [references gap_results]"
```

### 2. Connecting Roxy to Documents Tab

When user clicks a citation:

```typescript
// In parent layout component
const handleCitationClick = (citation: Citation) => {
  // 1. Switch to Documents tab
  setActiveTab('documents');
  
  // 2. Select the cited document
  setSelectedDocumentId(citation.documentId);
  
  // 3. Navigate to the correct page
  setCurrentPage(citation.pageNumber);
  
  // 4. Set the highlight
  setHighlightedCitation(citation);
};
```

### 3. Roxy Context from Current Tab

Pass current tab to Roxy so she can be contextually aware:

```typescript
// When user switches tabs
useEffect(() => {
  // Roxy might proactively comment on what user is viewing
  if (currentTab === 'gap-analysis' && !hasCommentedOnGap) {
    // Roxy: "I see you're reviewing the gap analysis. Your lowest score is Quality at 60%. Want me to explain why?"
  }
}, [currentTab]);
```

---

## IMPLEMENTATION PHASES

### Phase 1: Basic Chat (Week 1)
- [ ] Create RoxySidePanel component
- [ ] Create RoxyMessage component  
- [ ] Create /api/roxy/chat endpoint
- [ ] Basic RAG retrieval from existing document chunks
- [ ] Store/retrieve chat history
- [ ] Integrate panel into main layout

### Phase 2: Documents Tab & Citations (Week 2)
- [ ] Create DocumentsTab component
- [ ] Integrate PDF viewer (react-pdf)
- [ ] Extract text positions during document upload
- [ ] Create citation highlighting overlay
- [ ] Connect citation clicks to document navigation

### Phase 3: Context & Intelligence (Week 3)
- [ ] Build company profile UI
- [ ] Connect Roxy to gap analysis results
- [ ] Add tab context awareness
- [ ] Implement auto-analysis on document upload
- [ ] Add proactive suggestions

### Phase 4: Tools & Actions (Week 4)
- [ ] Partner finder tool
- [ ] Incumbent lookup tool
- [ ] Risk assessment tool
- [ ] Bid/no-bid recommendation engine

---

## FILE STRUCTURE

```
frontend/src/
├── components/
│   ├── roxy/
│   │   ├── RoxySidePanel.tsx       # Main panel container
│   │   ├── RoxyHeader.tsx          # Panel header with minimize
│   │   ├── RoxyMessageList.tsx     # Scrollable message container
│   │   ├── RoxyMessage.tsx         # Individual message bubble
│   │   ├── RoxyCitation.tsx        # Clickable citation pill
│   │   ├── RoxyInput.tsx           # Chat input with send button
│   │   ├── RoxyMinimized.tsx       # Minimized state button
│   │   ├── RoxyTypingIndicator.tsx # "Roxy is thinking..."
│   │   └── RoxyToolResult.tsx      # Render tool outputs (partners, etc.)
│   │
│   ├── documents/
│   │   ├── DocumentsTab.tsx        # Main documents tab
│   │   ├── FileTree.tsx            # Left sidebar file browser
│   │   ├── DocumentViewer.tsx      # PDF viewer component
│   │   ├── PageNavigation.tsx      # Page controls
│   │   └── CitationHighlight.tsx   # Yellow highlight overlay
│   │
│   └── layout/
│       └── OpportunityLayout.tsx   # Updated to include Roxy panel
│
├── hooks/
│   ├── useRoxyChat.ts              # Chat state and API calls
│   ├── useDocumentViewer.ts        # Document viewing state
│   └── useCitationHighlight.ts     # Citation highlight state
│
└── stores/
    └── roxyStore.ts                # Zustand store for Roxy state

backend/app/
├── routes/
│   └── roxy.py                     # Roxy API endpoints
│
├── services/
│   ├── roxy_service.py             # Main Roxy logic
│   ├── roxy_tools.py               # Tool implementations
│   └── citation_service.py         # Citation extraction
│
└── prompts/
    └── roxy_prompts.py             # System prompts and templates
```

---

## TESTING CHECKLIST

Before considering Roxy complete, verify:

- [ ] Chat messages stream correctly
- [ ] Citations render as clickable pills
- [ ] Clicking citation navigates to correct document/page
- [ ] Yellow highlight appears on cited text
- [ ] Chat history persists across page reloads
- [ ] Roxy knows about uploaded documents
- [ ] Roxy can reference gap analysis results
- [ ] Roxy panel minimizes/expands correctly
- [ ] Roxy panel persists across tab changes
- [ ] Mobile responsive (panel becomes fullscreen or bottom sheet)

---

## START HERE

**First task:** Create the basic RoxySidePanel component and integrate it into the existing layout. Don't worry about the backend yet - just get the UI shell working with hardcoded messages.

Then proceed to connect the backend chat endpoint.

Good luck! Roxy is going to make BidWin significantly more powerful.
