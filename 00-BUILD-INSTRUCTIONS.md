# PP Gap Analysis Agent - Build Instructions
## Master Development Guide for AI Agent

---

## CRITICAL: READ THIS ENTIRE FILE BEFORE WRITING ANY CODE

This document provides step-by-step instructions for building the Past Performance Gap Analysis web application. You have access to 8 detailed specification documents. Follow these instructions precisely and reference the appropriate documentation for each task.

---

## 1. PROJECT OVERVIEW

### What You're Building
A web application that helps government contractors analyze their past performance against new contract opportunities. Users upload company documents (past performance narratives, contracts) and opportunity documents (SOW/PWS), then the system uses AI to generate a gap analysis with relevance scoring.

### Core User Flow
1. User creates a company profile
2. User uploads past performance documents (PDFs, DOCX)
3. System extracts and parses document metadata using Claude API
4. User creates an opportunity and uploads SOW/PWS
5. User triggers gap analysis
6. System compares PP docs against requirements using Claude API
7. System displays relevance scores, gap matrix, strengths, weaknesses, recommendations
8. User can export analysis to DOCX

### Key Technologies
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI
- **Database**: PostgreSQL with pgvector extension
- **AI**: Claude API (Anthropic) for analysis, OpenAI for embeddings
- **Storage**: S3-compatible (Cloudflare R2 or MinIO for local)

---

## 2. DOCUMENTATION REFERENCE GUIDE

You have these specification documents available. Reference them as indicated:

| Document | When to Reference |
|----------|-------------------|
| `01-PRD-product-requirements.md` | Understanding features, user stories, acceptance criteria |
| `02-ARCHITECTURE-system-design.md` | System design, API structure, data flows, security |
| `03-DATABASE-schema.md` | Database tables, relationships, JSONB structures, queries |
| `04-AI-PROMPTS-agent-instructions.md` | All LLM prompts for document parsing and analysis |
| `05-BACKEND-api-services.md` | FastAPI code, services, routes, processing logic |
| `06-FRONTEND-specifications.md` | React components, types, state management, UI |
| `07-DEVELOPMENT-phases-timeline.md` | Build sequence, task breakdown, milestones |
| `08-TECH-STACK-infrastructure.md` | Dependencies, Docker setup, environment config |

---

## 3. BUILD SEQUENCE

### IMPORTANT: Follow this exact order

```
Phase 1: Foundation
├── Step 1.1: Project scaffolding
├── Step 1.2: Database setup
├── Step 1.3: Authentication
├── Step 1.4: Company management
└── Step 1.5: Core UI shell

Phase 2: Document Intelligence
├── Step 2.1: File storage setup
├── Step 2.2: Document upload API
├── Step 2.3: Text extraction
├── Step 2.4: LLM metadata extraction
├── Step 2.5: Embedding generation
└── Step 2.6: Document library UI

Phase 3: Analysis Engine
├── Step 3.1: Opportunity management
├── Step 3.2: Requirement extraction
├── Step 3.3: Analysis prompt implementation
├── Step 3.4: Scoring logic
├── Step 3.5: Gap matrix generation
└── Step 3.6: Recommendations

Phase 4: Results & Export
├── Step 4.1: Analysis results UI
├── Step 4.2: Gap matrix component
├── Step 4.3: Export to DOCX
└── Step 4.4: Analysis history

Phase 5: Integration & Polish
├── Step 5.1: End-to-end testing
├── Step 5.2: Error handling
├── Step 5.3: Loading states
└── Step 5.4: Final cleanup
```

---

## 4. DETAILED BUILD INSTRUCTIONS

### PHASE 1: Foundation

#### Step 1.1: Project Scaffolding

**Create the monorepo structure:**

```
/pp-gap-analysis
├── /frontend          # Next.js application
├── /backend           # FastAPI application
├── /docker            # Docker configurations
├── docker-compose.yml
└── README.md
```

**Frontend Setup:**
```bash
npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
npx shadcn-ui@latest init
```

**Backend Setup:**
```bash
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install fastapi uvicorn sqlalchemy asyncpg alembic
```

**Reference**: `08-TECH-STACK-infrastructure.md` for complete dependency lists

---

#### Step 1.2: Database Setup

**Actions:**
1. Create `docker-compose.yml` with PostgreSQL + pgvector
2. Create database initialization script
3. Set up Alembic for migrations
4. Create initial migration with all tables

**Reference**: 
- `08-TECH-STACK-infrastructure.md` Section 4 for Docker Compose
- `03-DATABASE-schema.md` for complete table definitions

**Tables to create (in order):**
1. `users`
2. `companies`
3. `user_companies`
4. `documents`
5. `opportunities`
6. `opportunity_documents`
7. `analyses`
8. `audit_logs`

**Verify**: Run `docker-compose up -d` and connect to database to confirm tables exist.

---

#### Step 1.3: Authentication

**Actions:**
1. Set up Clerk in frontend (or implement JWT auth if preferred)
2. Create auth middleware in backend
3. Implement protected routes

**For Clerk:**
```bash
cd frontend
npm install @clerk/nextjs
```

**For custom JWT (backend):**
- Reference `05-BACKEND-api-services.md` Section 2 (config.py) for JWT settings
- Implement token generation and validation

**Verify**: User can register, login, and access protected pages.

---

#### Step 1.4: Company Management

**Backend Tasks:**
1. Create Company SQLAlchemy model
2. Create Company Pydantic schemas
3. Implement CRUD endpoints:
   - `GET /api/companies` - List user's companies
   - `POST /api/companies` - Create company
   - `GET /api/companies/{id}` - Get company
   - `PUT /api/companies/{id}` - Update company
   - `DELETE /api/companies/{id}` - Delete company

**Frontend Tasks:**
1. Create company list page (`/companies`)
2. Create company form component
3. Create company detail page (`/companies/[id]`)
4. Implement API client functions

**Reference**:
- `03-DATABASE-schema.md` Section 3.2 for companies table
- `05-BACKEND-api-services.md` Section 2 for API structure
- `06-FRONTEND-specifications.md` Section 3 for TypeScript types

**Verify**: User can create, view, edit, and delete companies.

---

#### Step 1.5: Core UI Shell

**Frontend Tasks:**
1. Create layout with sidebar navigation
2. Implement company switcher dropdown
3. Create dashboard page with placeholder stats
4. Set up Zustand store for selected company

**Components to build:**
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `components/layout/company-switcher.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/page.tsx`

**Reference**: `06-FRONTEND-specifications.md` Section 2 for project structure

**Verify**: User can navigate between sections, switch companies, see dashboard.

---

### PHASE 2: Document Intelligence

#### Step 2.1: File Storage Setup

**Actions:**
1. Set up MinIO container for local development (or configure R2)
2. Create storage service in backend
3. Implement file upload/download functions

**Reference**: `08-TECH-STACK-infrastructure.md` Section 4 for MinIO config

**Verify**: Can upload a file and retrieve it via presigned URL.

---

#### Step 2.2: Document Upload API

**Backend Tasks:**
1. Create Document model and schemas
2. Implement upload endpoint: `POST /api/documents/upload`
3. Store file in S3, create database record
4. Return document metadata

**Reference**: 
- `03-DATABASE-schema.md` Section 3.4 for documents table
- `05-BACKEND-api-services.md` Section 4 for DocumentProcessor

**Verify**: File uploads successfully, record created in database.

---

#### Step 2.3: Text Extraction

**Backend Tasks:**
1. Install PyPDF2 and python-docx
2. Implement text extraction in DocumentProcessor
3. Handle PDF, DOCX, TXT file types
4. Store raw_text in document record

**Reference**: `05-BACKEND-api-services.md` Section 4 `_extract_text` method

**Verify**: Upload PDF and DOCX, verify text is extracted correctly.

---

#### Step 2.4: LLM Metadata Extraction

**Backend Tasks:**
1. Create LLM service for Claude API
2. Implement metadata extraction prompt
3. Parse structured JSON response
4. Update document with parsed_content

**CRITICAL**: Use the exact prompts from `04-AI-PROMPTS-agent-instructions.md` Section 3

**Reference**:
- `04-AI-PROMPTS-agent-instructions.md` Section 3 for extraction prompt
- `05-BACKEND-api-services.md` Section 6 for LLMService

**Verify**: Upload a past performance document, verify metadata fields populated.

---

#### Step 2.5: Embedding Generation

**Backend Tasks:**
1. Create embedding service using OpenAI API
2. Generate embeddings for document text
3. Store in pgvector column
4. Implement semantic search function

**Reference**: `05-BACKEND-api-services.md` mentions EmbeddingService

**Verify**: Documents have embeddings, similarity search returns results.

---

#### Step 2.6: Document Library UI

**Frontend Tasks:**
1. Create document upload component with drag-and-drop
2. Create document list with filtering
3. Create document detail view showing parsed metadata
4. Allow manual metadata editing

**Components:**
- `components/documents/document-upload.tsx`
- `components/documents/document-list.tsx`
- `components/documents/document-card.tsx`
- `components/documents/document-detail.tsx`

**Reference**: `06-FRONTEND-specifications.md` Section 4.4 for DocumentUpload component

**Verify**: Full document management workflow working.

---

### PHASE 3: Analysis Engine

#### Step 3.1: Opportunity Management

**Backend Tasks:**
1. Create Opportunity model and schemas
2. Create OpportunityDocument model
3. Implement CRUD endpoints for opportunities
4. Implement document attachment to opportunities

**Frontend Tasks:**
1. Create opportunity list page
2. Create opportunity form with SOW upload
3. Create opportunity detail page

**Reference**: `03-DATABASE-schema.md` Sections 3.5 and 3.6

**Verify**: Can create opportunity, attach SOW/PWS documents.

---

#### Step 3.2: Requirement Extraction

**Backend Tasks:**
1. Implement requirement extraction prompt for SOW/PWS
2. Parse requirements into structured format
3. Store in opportunity_documents.parsed_requirements

**CRITICAL**: Use the exact prompt from `04-AI-PROMPTS-agent-instructions.md` Section 4

**Verify**: Upload SOW, verify requirements extracted as structured list.

---

#### Step 3.3: Analysis Prompt Implementation

**Backend Tasks:**
1. Create AnalysisEngine service
2. Build analysis prompt with opportunity + PP docs
3. Send to Claude API
4. Parse JSON response

**CRITICAL**: 
- Use system prompt from `04-AI-PROMPTS-agent-instructions.md` Section 2
- Use analysis prompt from `04-AI-PROMPTS-agent-instructions.md` Section 5

**Reference**: `05-BACKEND-api-services.md` Section 5 for AnalysisEngine

**Verify**: Analysis runs without errors, returns structured results.

---

#### Step 3.4: Scoring Logic

**Backend Tasks:**
1. Parse relevance scores from LLM response
2. Calculate dimensional scores (scope, magnitude, complexity, recency)
3. Determine overall relevance rating
4. Calculate confidence score

**Scoring values:** `very_relevant`, `relevant`, `somewhat_relevant`, `not_relevant`

**Reference**: `04-AI-PROMPTS-agent-instructions.md` Section 2 for scoring framework

**Verify**: Scores populate correctly in analysis record.

---

#### Step 3.5: Gap Matrix Generation

**Backend Tasks:**
1. Parse gap_matrix from LLM response
2. Map requirements to supporting documents
3. Calculate coverage rating per requirement
4. Store structured gap matrix in JSONB

**Reference**: 
- `03-DATABASE-schema.md` Section 4.3 for gap_matrix structure
- `04-AI-PROMPTS-agent-instructions.md` for output format

**Verify**: Gap matrix shows requirements mapped to documents with coverage indicators.

---

#### Step 3.6: Recommendations

**Backend Tasks:**
1. Parse strengths, weaknesses, recommendations from response
2. Include go/no-go recommendation
3. Store all in analysis record

**Reference**: `03-DATABASE-schema.md` Sections 4.1, 4.2 for JSONB structures

**Verify**: All analysis fields populated, recommendations are actionable.

---

### PHASE 4: Results & Export

#### Step 4.1: Analysis Results UI

**Frontend Tasks:**
1. Create analysis results page (`/analysis/[id]`)
2. Display overall relevance score prominently
3. Show dimensional score breakdown
4. Display go/no-go recommendation

**Reference**: `06-FRONTEND-specifications.md` Section 4.1 for AnalysisResults component

**Verify**: Results page displays all analysis data clearly.

---

#### Step 4.2: Gap Matrix Component

**Frontend Tasks:**
1. Create interactive gap matrix table
2. Show requirements in rows, documents in columns
3. Display coverage indicators with tooltips
4. Add legend for icons

**Reference**: `06-FRONTEND-specifications.md` Section 4.3 for GapMatrix component

**Verify**: Gap matrix is readable, tooltips show evidence.

---

#### Step 4.3: Export to DOCX

**Backend Tasks:**
1. Create export service using python-docx
2. Build document template with all analysis sections
3. Implement export endpoint: `POST /api/analyses/{id}/export`
4. Return download URL

**Document sections:**
1. Executive Summary
2. Overall Relevance Assessment
3. Dimensional Scores
4. Gap Matrix Table
5. Strengths
6. Weaknesses
7. Recommendations
8. Appendix

**Reference**: `04-AI-PROMPTS-agent-instructions.md` Section 7 for formatting prompt

**Verify**: Export produces well-formatted Word document.

---

#### Step 4.4: Analysis History

**Frontend Tasks:**
1. Create analysis list page (`/analysis`)
2. Filter by company, opportunity, date
3. Show key metrics in list view
4. Link to full analysis

**Verify**: User can browse past analyses, filter effectively.

---

### PHASE 5: Integration & Polish

#### Step 5.1: End-to-End Testing

**Test the complete workflow:**
1. Register new user
2. Create company
3. Upload 2-3 past performance documents
4. Verify metadata extraction
5. Create opportunity
6. Upload SOW
7. Run analysis
8. View results
9. Export to DOCX

**Fix any issues discovered.**

---

#### Step 5.2: Error Handling

**Backend:**
- Add try/catch to all endpoints
- Return meaningful error messages
- Log errors appropriately

**Frontend:**
- Add error boundaries
- Show toast notifications for errors
- Handle API failures gracefully

---

#### Step 5.3: Loading States

**Frontend:**
- Add loading spinners during API calls
- Show skeleton screens for data loading
- Display progress for document processing
- Show analysis progress indicator

---

#### Step 5.4: Final Cleanup

- Remove console.logs
- Add code comments where helpful
- Verify all environment variables documented
- Test with production API keys
- Verify mobile responsiveness

---

## 5. CRITICAL IMPLEMENTATION NOTES

### API Keys Required
- `ANTHROPIC_API_KEY` - For Claude API (analysis and extraction)
- `OPENAI_API_KEY` - For embeddings (text-embedding-3-small)
- `DATABASE_URL` - PostgreSQL connection string
- `S3_*` variables - For file storage

### Database Considerations
- Always use UUID for primary keys
- Use JSONB for flexible structured data
- Enable pgvector extension before creating tables
- Use soft deletes (deleted_at) not hard deletes

### LLM Prompt Usage
- **NEVER modify the prompts** from `04-AI-PROMPTS-agent-instructions.md` without explicit approval
- These prompts have been carefully crafted for government contracting context
- Temperature: 0.3 for analysis (consistency), 0.1 for extraction

### Frontend State
- Use Zustand for selected company state (persisted)
- Use React Query for all API data
- Never store sensitive data in localStorage

### File Processing
- Process documents asynchronously (background job or queue)
- Show processing status to user
- Handle large files (up to 50MB)
- Support PDF, DOCX, DOC, TXT

---

## 6. ASKING FOR CLARIFICATION

If you encounter ambiguity or need decisions:

1. **Check the documentation first** - The answer is likely in one of the 8 spec files
2. **State your assumption** - Tell the user what you plan to do
3. **Ask specific questions** - "Should the gap matrix show all requirements or only gaps?"
4. **Provide options** - "I can implement this as A or B. Which do you prefer?"

---

## 7. SELF-ANNEALING PROTOCOL

You are expected to self-heal when things break. This is critical for autonomous development.

### When Errors Occur

1. **Read the full error** - Don't skim. Parse the complete stack trace.
2. **Diagnose root cause** - Ask "why did this actually fail?" not "how do I suppress this?"
3. **Research if needed** - Check API docs, library documentation, common patterns
4. **Implement fix** - Make the actual correction
5. **Test again** - Verify the fix works (unless it costs API credits - then ask first)
6. **Document learning** - Update LESSONS-LEARNED.md

### Self-Annealing Loop

```
ERROR → READ → DIAGNOSE → RESEARCH → FIX → TEST → DOCUMENT
                                              ↓
                                         STILL FAILS?
                                              ↓
                                         LOOP BACK
```

### Maintain LESSONS-LEARNED.md

Create this file in the project root. Update it when you discover:

- API rate limits, token limits, batch endpoints
- Timeout values, retry strategies
- Edge cases in input validation
- Better approaches than originally planned
- Environment-specific quirks
- Common error patterns and solutions

**Entry format:**
```markdown
## [Date] - [Category]
**Issue**: What went wrong
**Root Cause**: Why it happened  
**Solution**: How you fixed it
**Prevention**: How to avoid it next time
```

### Autonomous vs. Ask First

**DO autonomously:**
- Fix bugs, syntax errors, typos
- Retry failed operations (if free)
- Add missing error handling
- Install dependencies
- Refactor broken code

**ASK first before:**
- Running paid API calls for testing
- Architectural changes not in spec
- Modifying LLM prompts in 04-AI-PROMPTS
- Deleting user files
- Skipping build phases

### Error Reporting (When Stuck)

If you cannot self-heal, report:

```
## ❌ BLOCKED

**Step**: [Current step]
**Error**: [Message]
**Tried**: [What you attempted]
**Need**: [What you need from user]
```

### Progress Reporting

After each step:

```
## ✅ STEP [X.X] COMPLETE

**Built**: [What was created]
**Files**: [Created/modified]
**Tested**: [Yes/No]
**Issues**: [None or resolved issues]
**Lessons**: [Any new LESSONS-LEARNED entries]
```

---

## 8. SUCCESS CRITERIA

The application is complete when:

- [ ] User can register and login
- [ ] User can create and manage companies
- [ ] User can upload documents (PDF, DOCX) 
- [ ] Documents are parsed and metadata extracted automatically
- [ ] User can create opportunities and upload SOW/PWS
- [ ] User can run gap analysis
- [ ] Analysis shows relevance scores with government evaluation framework
- [ ] Gap matrix displays requirement coverage
- [ ] Strengths, weaknesses, and recommendations are shown
- [ ] User can export analysis to DOCX
- [ ] User can view analysis history
- [ ] Application handles errors gracefully
- [ ] UI is responsive and professional

---

## 9. FILE CHECKLIST

When complete, the project should have these key files:

### Backend
- [ ] `app/main.py` - FastAPI application
- [ ] `app/config.py` - Settings and configuration
- [ ] `app/models/*.py` - SQLAlchemy models
- [ ] `app/schemas/*.py` - Pydantic schemas
- [ ] `app/api/routes/*.py` - API endpoints
- [ ] `app/services/document_processor.py`
- [ ] `app/services/analysis_engine.py`
- [ ] `app/services/llm_service.py`
- [ ] `app/services/embedding_service.py`
- [ ] `app/services/storage_service.py`
- [ ] `app/services/export_service.py`
- [ ] `alembic/versions/*.py` - Database migrations

### Frontend
- [ ] `app/(dashboard)/layout.tsx`
- [ ] `app/(dashboard)/page.tsx`
- [ ] `app/(dashboard)/companies/page.tsx`
- [ ] `app/(dashboard)/documents/page.tsx`
- [ ] `app/(dashboard)/opportunities/page.tsx`
- [ ] `app/(dashboard)/analysis/page.tsx`
- [ ] `app/(dashboard)/analysis/[id]/page.tsx`
- [ ] `components/layout/sidebar.tsx`
- [ ] `components/documents/document-upload.tsx`
- [ ] `components/analysis/analysis-results.tsx`
- [ ] `components/analysis/gap-matrix.tsx`
- [ ] `lib/api/client.ts`
- [ ] `lib/stores/company-store.ts`
- [ ] `lib/types/*.ts`

---

## BEGIN DEVELOPMENT

Start with Phase 1, Step 1.1: Project Scaffolding.

Reference `08-TECH-STACK-infrastructure.md` for the complete dependency list and Docker configuration.

Report progress after completing each step. Ask questions if anything is unclear.
