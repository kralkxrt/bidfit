# System Architecture
## Past Performance Gap Analysis Agent

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                             │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Company    │  │  Document   │  │  Analysis   │  │  Reports &          │ │
│  │  Manager    │  │  Library    │  │  Builder    │  │  History            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Shared Components                                 │   │
│  │  • Navigation  • Auth Context  • File Upload  • Data Tables         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (Python FastAPI)                        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Auth       │  │  Document   │  │  Analysis   │  │  Export             │ │
│  │  Service    │  │  Service    │  │  Service    │  │  Service            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Shared Services                                   │   │
│  │  • Database ORM  • File Storage  • Background Tasks  • Logging      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────┐
│     PostgreSQL       │ │    Vector Store      │ │      LLM Service         │
│     (Primary DB)     │ │    (pgvector)        │ │      (Claude API)        │
│                      │ │                      │ │                          │
│ • Companies          │ │ • Doc embeddings     │ │ • Document parsing       │
│ • Documents metadata │ │ • Semantic search    │ │ • Metadata extraction    │
│ • Opportunities      │ │ • RAG retrieval      │ │ • Gap analysis           │
│ • Analyses           │ │                      │ │ • Recommendations        │
│ • Users & Auth       │ │                      │ │                          │
└──────────────────────┘ └──────────────────────┘ └──────────────────────────┘
              │
              ▼
┌──────────────────────┐
│    File Storage      │
│    (S3 / R2)         │
│                      │
│ • Original documents │
│ • Generated reports  │
│ • Exports            │
└──────────────────────┘
```

---

## 2. Component Details

### 2.1 Frontend Layer

**Technology**: Next.js 14 with App Router, TypeScript, Tailwind CSS, shadcn/ui

**Key Components**:

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| Company Manager | CRUD for companies | Profile forms, company switcher |
| Document Library | Document management | Upload, browse, filter, search |
| Analysis Builder | Create new analyses | Multi-step wizard, document selection |
| Results Viewer | Display analysis results | Scores, gap matrix, recommendations |
| Reports & History | Historical analyses | List, filter, compare, export |

**State Management**: 
- React Query for server state
- Zustand for client state (selected company, UI state)

**Authentication**:
- Clerk or NextAuth.js for auth flows
- JWT tokens for API authentication

### 2.2 API Layer

**Technology**: Python FastAPI with async support

**Service Architecture**:

```
/api
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /logout
│   └── GET  /me
│
├── /companies
│   ├── GET    /                    # List user's companies
│   ├── POST   /                    # Create company
│   ├── GET    /{id}                # Get company details
│   ├── PUT    /{id}                # Update company
│   └── DELETE /{id}                # Delete company
│
├── /documents
│   ├── GET    /                    # List documents (filtered by company)
│   ├── POST   /upload              # Upload new document
│   ├── GET    /{id}                # Get document details
│   ├── PUT    /{id}                # Update document metadata
│   ├── DELETE /{id}                # Delete document
│   └── POST   /{id}/reprocess      # Re-run parsing
│
├── /opportunities
│   ├── GET    /                    # List opportunities
│   ├── POST   /                    # Create opportunity
│   ├── GET    /{id}                # Get opportunity details
│   ├── PUT    /{id}                # Update opportunity
│   ├── DELETE /{id}                # Delete opportunity
│   └── POST   /{id}/documents      # Add document to opportunity
│
├── /analyses
│   ├── GET    /                    # List analyses
│   ├── POST   /                    # Create/run new analysis
│   ├── GET    /{id}                # Get analysis results
│   ├── DELETE /{id}                # Delete analysis
│   └── POST   /{id}/export         # Export to DOCX/PDF
│
└── /health
    └── GET /                       # Health check
```

### 2.3 Database Layer

**Technology**: PostgreSQL 15+ with pgvector extension

**Key Design Decisions**:
- UUIDs for all primary keys (distributed-friendly)
- JSONB for flexible structured data (parsed content, analysis results)
- pgvector for embedding storage (eliminates separate vector DB)
- Soft deletes for audit trail (deleted_at timestamp)

### 2.4 Vector Store

**Technology**: pgvector (PostgreSQL extension)

**Purpose**:
- Store document embeddings for semantic search
- Enable RAG (Retrieval Augmented Generation) for analysis
- Find similar past performance across documents

**Embedding Model**: OpenAI text-embedding-3-small or similar

### 2.5 LLM Service

**Technology**: Anthropic Claude API (claude-sonnet-4-20250514)

**Use Cases**:

| Use Case | Model | Est. Tokens | Notes |
|----------|-------|-------------|-------|
| Document metadata extraction | Sonnet | 2-3K | Structured extraction |
| Requirement parsing | Sonnet | 3-5K | Extract requirements list |
| Gap analysis | Sonnet | 10-15K | Full analysis with reasoning |
| Recommendation generation | Sonnet | 2-3K | Actionable recommendations |

### 2.6 File Storage

**Technology**: AWS S3 or Cloudflare R2

**Structure**:
```
/bucket
├── /companies/{company_id}
│   ├── /documents/{document_id}/
│   │   ├── original.pdf
│   │   └── extracted.txt
│   └── /exports/{analysis_id}/
│       ├── report.docx
│       └── report.pdf
└── /temp/
    └── /uploads/
```

---

## 3. Data Flow Diagrams

### 3.1 Document Upload Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Frontend │     │   API    │     │  Storage │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  Select file   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │  POST /upload  │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │  Store file    │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │  Create record │
     │                │                │───────────────>│ (DB)
     │                │                │                │
     │                │                │  Queue processing
     │                │                │───────────────>│ (Background)
     │                │                │                │
     │                │  Upload success│                │
     │                │<───────────────│                │
     │                │                │                │
     │  Show progress │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

### 3.2 Document Processing Flow (Background)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Queue   │     │ Processor│     │   LLM    │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  New job       │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │  Extract text  │                │
     │                │  (PDF/DOCX)    │                │
     │                │                │                │
     │                │  Extract metadata               │
     │                │───────────────>│                │
     │                │                │                │
     │                │  Structured data               │
     │                │<───────────────│                │
     │                │                │                │
     │                │  Generate embedding             │
     │                │───────────────>│                │
     │                │                │                │
     │                │  Vector        │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │  Update record │                │
     │                │───────────────────────────────>│
     │                │                │                │
     │  Job complete  │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

### 3.3 Analysis Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │   API    │     │   LLM    │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  Request       │                │                │
     │  analysis      │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │  Fetch PP docs │                │
     │                │───────────────────────────────>│
     │                │                │                │
     │                │  Fetch opportunity docs        │
     │                │───────────────────────────────>│
     │                │                │                │
     │                │  Build prompt  │                │
     │                │  + Send        │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │  Analysis      │                │
     │                │  response      │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │  Parse + store │                │
     │                │───────────────────────────────>│
     │                │                │                │
     │  Analysis      │                │                │
     │  results       │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

---

## 4. Security Architecture

### 4.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User ──> Login ──> Auth Provider ──> JWT Token             │
│                         │                                   │
│                         ▼                                   │
│                   User record in DB                         │
│                         │                                   │
│                         ▼                                   │
│              Company associations                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Authorization Model

| Role | Companies | Documents | Analyses | Users |
|------|-----------|-----------|----------|-------|
| Admin | CRUD | CRUD | CRUD | CRUD |
| Analyst | Read | CRUD | CRUD | - |
| Viewer | Read | Read | Read | - |

### 4.3 Data Protection

- **At Rest**: AES-256 encryption for database and file storage
- **In Transit**: TLS 1.3 for all connections
- **API Keys**: Encrypted storage, never logged
- **PII**: Minimized collection, encrypted fields

---

## 5. Scalability Considerations

### 5.1 Horizontal Scaling Points

| Component | Scaling Strategy |
|-----------|------------------|
| Frontend | Vercel auto-scaling |
| API | Container replicas behind load balancer |
| Database | Read replicas for queries, connection pooling |
| Background Jobs | Worker pool scaling |
| File Storage | S3/R2 inherently scalable |

### 5.2 Caching Strategy

| Cache Layer | Technology | Purpose |
|-------------|------------|---------|
| API Response | Redis | Frequent queries |
| Document Metadata | Redis | Quick lookups |
| LLM Responses | PostgreSQL | Avoid re-analysis |
| Static Assets | CDN | Frontend performance |

### 5.3 Rate Limiting

| Endpoint | Limit | Notes |
|----------|-------|-------|
| Document upload | 50/hour | Per user |
| Analysis creation | 20/hour | Per user |
| Exports | 100/hour | Per user |
| General API | 1000/hour | Per user |

---

## 6. Deployment Architecture

### 6.1 Development Environment

```
┌─────────────────────────────────────────┐
│            Local Development            │
├─────────────────────────────────────────┤
│  Frontend: localhost:3000 (Next.js)     │
│  API: localhost:8000 (FastAPI)          │
│  Database: localhost:5432 (PostgreSQL)  │
│  Storage: LocalStack S3                 │
└─────────────────────────────────────────┘
```

### 6.2 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                         Production                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Vercel    │    │  Railway    │    │  Supabase/Neon      │ │
│  │  (Frontend) │───>│   (API)     │───>│   (PostgreSQL)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│                     ┌─────────────┐                             │
│                     │ Cloudflare  │                             │
│                     │    R2       │                             │
│                     └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Monitoring & Observability

### 7.1 Logging

| Level | Content | Retention |
|-------|---------|-----------|
| Error | Exceptions, failures | 90 days |
| Warn | Degraded performance | 30 days |
| Info | API requests, key actions | 14 days |
| Debug | Detailed flow (dev only) | 1 day |

### 7.2 Metrics

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| API latency | Performance | p95 > 2s |
| Error rate | Reliability | > 1% |
| LLM latency | AI performance | p95 > 30s |
| Queue depth | Processing backlog | > 100 |

### 7.3 Health Checks

| Endpoint | Checks | Frequency |
|----------|--------|-----------|
| /health | API alive | 30s |
| /health/db | Database connection | 60s |
| /health/llm | Claude API accessible | 300s |
| /health/storage | S3 accessible | 300s |
