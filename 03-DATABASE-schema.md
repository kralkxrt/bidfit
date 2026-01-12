# Database Schema
## Past Performance Gap Analysis Agent

---

## 1. Overview

**Database**: PostgreSQL 15+
**Extensions Required**: 
- `pgvector` - Vector similarity search for embeddings
- `uuid-ossp` - UUID generation

**Design Principles**:
- UUIDs for all primary keys (distributed-friendly)
- JSONB for flexible structured data
- Soft deletes with `deleted_at` timestamp
- Audit timestamps on all tables
- Foreign key constraints with appropriate cascade behavior

---

## 2. Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────────┐
│    users     │       │  companies   │       │      documents       │
├──────────────┤       ├──────────────┤       ├──────────────────────┤
│ id (PK)      │       │ id (PK)      │──────<│ id (PK)              │
│ email        │       │ name         │       │ company_id (FK)      │
│ name         │       │ cage_code    │       │ document_type        │
│ password_hash│       │ uei          │       │ filename             │
│ created_at   │       │ primary_naics│       │ contract_number      │
│ updated_at   │       │ size_standard│       │ customer_agency      │
└──────────────┘       │ created_at   │       │ contract_value       │
       │               │ updated_at   │       │ raw_text             │
       │               └──────────────┘       │ parsed_content       │
       │                      │               │ embedding            │
       │                      │               │ created_at           │
       ▼                      │               └──────────────────────┘
┌──────────────────┐          │                        │
│ user_companies   │          │                        │
├──────────────────┤          │                        │
│ user_id (FK)     │──────────┤                        │
│ company_id (FK)  │          │                        │
│ role             │          │                        │
└──────────────────┘          │                        │
                              │                        │
                              │               ┌────────┴───────────────┐
                              │               │                        │
                              ▼               ▼                        │
                    ┌──────────────────┐  ┌──────────────────────┐    │
                    │  opportunities   │  │ opportunity_documents │    │
                    ├──────────────────┤  ├──────────────────────┤    │
                    │ id (PK)          │──│ opportunity_id (FK)  │    │
                    │ company_id (FK)  │  │ document_type        │    │
                    │ solicitation_num │  │ raw_text             │    │
                    │ title            │  │ parsed_requirements  │    │
                    │ agency           │  │ embedding            │    │
                    │ estimated_value  │  └──────────────────────┘    │
                    │ status           │                              │
                    └──────────────────┘                              │
                              │                                       │
                              │                                       │
                              ▼                                       │
                    ┌──────────────────────────────────────────┐     │
                    │              analyses                     │     │
                    ├──────────────────────────────────────────┤     │
                    │ id (PK)                                  │     │
                    │ company_id (FK)                          │     │
                    │ opportunity_id (FK)                      │     │
                    │ overall_relevance_score                  │     │
                    │ scope_score                              │     │
                    │ magnitude_score                          │     │
                    │ complexity_score                         │     │
                    │ strengths (JSONB)                        │     │
                    │ weaknesses (JSONB)                       │     │
                    │ recommendations (JSONB)                  │     │
                    │ gap_matrix (JSONB)                       │     │
                    │ documents_analyzed (UUID[])              │─────┘
                    │ created_at                               │
                    └──────────────────────────────────────────┘
```

---

## 3. Table Definitions

### 3.1 Users Table

```sql
-- Users table for authentication and profile
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- NULL if using OAuth
    auth_provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google', 'microsoft'
    auth_provider_id VARCHAR(255), -- External auth ID
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- Soft delete
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
```

### 3.2 Companies Table

```sql
-- Companies table for multi-tenant organization
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    
    -- Government contracting identifiers
    cage_code VARCHAR(10),
    uei VARCHAR(12), -- Unique Entity ID (replaced DUNS)
    duns VARCHAR(9), -- Legacy, may still be referenced
    
    -- Business classification
    primary_naics VARCHAR(6)[], -- Array of NAICS codes
    size_standard VARCHAR(100), -- e.g., 'Small Business', 'SDVOSB', '8(a)'
    
    -- Additional profile info
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    website VARCHAR(255),
    
    -- Settings
    settings JSONB DEFAULT '{}', -- Company-specific settings
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_companies_name ON companies(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_cage ON companies(cage_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_uei ON companies(uei) WHERE deleted_at IS NULL;
```

### 3.3 User-Company Association Table

```sql
-- Many-to-many relationship between users and companies
CREATE TABLE user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Role within this company
    role VARCHAR(50) NOT NULL DEFAULT 'analyst', -- 'admin', 'analyst', 'viewer'
    
    -- User's selected/default company
    is_default BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, company_id)
);

-- Indexes
CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
```

### 3.4 Documents Table

```sql
-- Past performance and company documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Document classification
    document_type VARCHAR(50) NOT NULL, 
    -- Types: 'past_performance', 'contract', 'cpars', 'capability', 'other'
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- S3/R2 path
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    
    -- Extracted contract metadata
    contract_number VARCHAR(100),
    contract_title VARCHAR(500),
    customer_agency VARCHAR(255),
    customer_command VARCHAR(255), -- e.g., 'USCENTCOM', 'DLA', 'DISA'
    customer_office VARCHAR(255),
    
    -- Contract details
    contract_value DECIMAL(15,2),
    contract_type VARCHAR(50), -- 'FFP', 'T&M', 'CPFF', 'CPAF', 'IDIQ'
    period_of_performance_start DATE,
    period_of_performance_end DATE,
    
    -- Classification
    naics_code VARCHAR(6),
    psc_code VARCHAR(10), -- Product Service Code
    clearance_level VARCHAR(50), -- 'Unclassified', 'Secret', 'TS', 'TS/SCI'
    
    -- Scope indicators
    fte_count INTEGER,
    geographic_scope VARCHAR(255), -- 'Single site', 'Multi-CONUS', 'OCONUS'
    locations TEXT[], -- Array of location strings
    
    -- Performance ratings (if CPARS)
    cpars_quality_rating VARCHAR(20),
    cpars_schedule_rating VARCHAR(20),
    cpars_cost_rating VARCHAR(20),
    cpars_management_rating VARCHAR(20),
    cpars_overall_rating VARCHAR(20),
    
    -- Content storage
    raw_text TEXT, -- Extracted plain text
    parsed_content JSONB, -- Structured extraction from LLM
    
    -- Vector embedding for semantic search
    embedding vector(1536), -- OpenAI embedding dimension
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending', 
    -- Status: 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    processed_at TIMESTAMP,
    
    -- User-provided tags
    tags TEXT[],
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_documents_company ON documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_customer ON documents(customer_agency) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_naics ON documents(naics_code) WHERE deleted_at IS NULL;

-- Vector index for similarity search
CREATE INDEX idx_documents_embedding ON documents 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

### 3.5 Opportunities Table

```sql
-- Target opportunities/solicitations to analyze against
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Solicitation identifiers
    solicitation_number VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    
    -- Customer information
    agency VARCHAR(255),
    sub_agency VARCHAR(255),
    contracting_office VARCHAR(255),
    
    -- Opportunity details
    naics_code VARCHAR(6),
    psc_code VARCHAR(10),
    estimated_value DECIMAL(15,2),
    set_aside_type VARCHAR(100), -- 'Full and Open', 'Small Business', 'SDVOSB', etc.
    contract_type VARCHAR(50),
    
    -- Timeline
    response_due_date DATE,
    questions_due_date DATE,
    award_date DATE, -- Estimated
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active',
    -- Status: 'active', 'submitted', 'won', 'lost', 'no_bid', 'cancelled'
    
    -- Source
    source_url VARCHAR(500), -- SAM.gov link, etc.
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_opportunities_company ON opportunities(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_status ON opportunities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_due_date ON opportunities(response_due_date) WHERE deleted_at IS NULL;
```

### 3.6 Opportunity Documents Table

```sql
-- Documents associated with opportunities (SOW, PWS, Section L/M)
CREATE TABLE opportunity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    
    -- Document type
    document_type VARCHAR(50) NOT NULL,
    -- Types: 'sow', 'pws', 'section_l', 'section_m', 'full_rfp', 'amendment', 'other'
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    
    -- Content
    raw_text TEXT,
    
    -- Parsed requirements (extracted by LLM)
    parsed_requirements JSONB,
    -- Structure: { requirements: [{ id, text, category, priority }] }
    
    -- Vector embedding
    embedding vector(1536),
    
    -- Processing
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_error TEXT,
    processed_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_opp_docs_opportunity ON opportunity_documents(opportunity_id);
CREATE INDEX idx_opp_docs_type ON opportunity_documents(document_type);

-- Vector index
CREATE INDEX idx_opp_docs_embedding ON opportunity_documents 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
```

### 3.7 Analyses Table

```sql
-- Completed gap analyses
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    
    -- Overall assessment
    overall_relevance_score VARCHAR(20) NOT NULL,
    -- Values: 'very_relevant', 'relevant', 'somewhat_relevant', 'not_relevant'
    
    -- Dimensional scores
    scope_score VARCHAR(20),
    magnitude_score VARCHAR(20),
    complexity_score VARCHAR(20),
    recency_score VARCHAR(20),
    
    -- Detailed results (JSONB for flexibility)
    strengths JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{ title, description, evidence, impact_level }]
    
    weaknesses JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{ title, description, risk_level, mitigation_suggestion }]
    
    recommendations JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{ type, title, description, priority }]
    
    gap_matrix JSONB NOT NULL DEFAULT '{}',
    -- Structure: { requirements: [{ requirement_id, requirement_text, 
    --              supporting_docs: [{ doc_id, relevance, evidence }] }] }
    
    -- Per-document assessments
    document_assessments JSONB DEFAULT '[]',
    -- Structure: [{ document_id, relevance_score, strengths, weaknesses }]
    
    -- Metadata
    documents_analyzed UUID[] NOT NULL, -- Array of document IDs included
    agent_confidence DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Go/No-Go recommendation
    go_no_go_recommendation VARCHAR(20), -- 'go', 'no_go', 'conditional'
    go_no_go_reasoning TEXT,
    
    -- Notes
    analysis_notes TEXT,
    user_notes TEXT, -- User-added notes after analysis
    
    -- Raw LLM response (for debugging/audit)
    raw_llm_response TEXT,
    
    -- Processing info
    processing_time_seconds INTEGER,
    tokens_used INTEGER,
    model_version VARCHAR(100),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_analyses_company ON analyses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_analyses_opportunity ON analyses(opportunity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_analyses_score ON analyses(overall_relevance_score) WHERE deleted_at IS NULL;
CREATE INDEX idx_analyses_created ON analyses(created_at DESC) WHERE deleted_at IS NULL;
```

### 3.8 Audit Log Table

```sql
-- Audit log for tracking important actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    
    -- What
    action VARCHAR(100) NOT NULL,
    -- Actions: 'document.upload', 'document.delete', 'analysis.create', 
    --          'analysis.export', 'company.update', etc.
    
    entity_type VARCHAR(50), -- 'document', 'analysis', 'company', etc.
    entity_id UUID,
    
    -- Details
    details JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- When
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Partition by month for performance (optional for high-volume)
-- CREATE TABLE audit_logs ... PARTITION BY RANGE (created_at);
```

---

## 4. JSONB Structure Examples

### 4.1 Document parsed_content

```json
{
  "contract_summary": "IT support services for Defense Logistics Agency",
  "scope_summary": "Help desk operations, network administration, cybersecurity support",
  "key_capabilities": [
    "24/7 help desk operations",
    "Network infrastructure management",
    "Security monitoring and incident response"
  ],
  "technologies": ["ServiceNow", "Splunk", "Cisco networking"],
  "certifications_required": ["Security+", "ITIL"],
  "personnel_types": [
    {"role": "Help Desk Technician", "count": 15},
    {"role": "Network Engineer", "count": 5}
  ],
  "deliverables": [
    "Monthly performance reports",
    "Incident response within 4 hours"
  ],
  "extraction_confidence": 0.92
}
```

### 4.2 Analysis strengths

```json
[
  {
    "title": "Direct COCOM Experience",
    "description": "YSG's USINDOPACOM support contract demonstrates direct experience supporting Geographic Combatant Command strategic planning operations.",
    "evidence": "Contract demonstrates joint planning, JOPES expertise, and coalition coordination at the 4-star headquarters level.",
    "supporting_documents": ["doc-uuid-1"],
    "impact_level": "high"
  },
  {
    "title": "Magnitude Alignment",
    "description": "Combined team past performance totals $47M, demonstrating ability to execute contracts of similar scale to the $35M SPPS opportunity.",
    "evidence": "YSG ($28M) + Makwa ($12M) + Liberty ($7M)",
    "supporting_documents": ["doc-uuid-1", "doc-uuid-2", "doc-uuid-3"],
    "impact_level": "high"
  }
]
```

### 4.3 Analysis gap_matrix

```json
{
  "requirements": [
    {
      "requirement_id": "PWS-3.1",
      "requirement_text": "Provide Joint Operational Planning Process (JOPP) support",
      "category": "Core Planning",
      "supporting_docs": [
        {
          "document_id": "doc-uuid-1",
          "document_title": "YSG INDOPACOM Support",
          "relevance": "very_relevant",
          "evidence": "Direct JOPP execution experience supporting INDOPACOM J5"
        },
        {
          "document_id": "doc-uuid-3",
          "document_title": "Liberty SOCOM Planning",
          "relevance": "relevant",
          "evidence": "Operational planning at SOF component level"
        }
      ],
      "coverage_rating": "strong",
      "gap_notes": null
    },
    {
      "requirement_id": "PWS-3.5",
      "requirement_text": "WMD/Counter-proliferation planning expertise",
      "category": "Specialized Planning",
      "supporting_docs": [],
      "coverage_rating": "gap",
      "gap_notes": "No demonstrated WMD planning experience in past performance portfolio"
    }
  ]
}
```

---

## 5. Migration Scripts

### 5.1 Initial Migration

```sql
-- Migration: 001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create all tables (in order of dependencies)
-- [Include all CREATE TABLE statements from above]

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 Seed Data

```sql
-- Migration: 002_seed_data.sql

-- Insert default admin user (password should be set via application)
INSERT INTO users (id, email, name, auth_provider)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'local');

-- Insert sample company for testing
INSERT INTO companies (id, name, cage_code, size_standard, primary_naics)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Sample Company LLC',
    '12345',
    'Small Business',
    ARRAY['541611', '541330']
);

-- Associate admin with sample company
INSERT INTO user_companies (user_id, company_id, role, is_default)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'admin',
    true
);
```

---

## 6. Common Queries

### 6.1 Get all documents for a company

```sql
SELECT 
    d.*,
    u.name as uploaded_by_name
FROM documents d
LEFT JOIN users u ON d.created_by = u.id
WHERE d.company_id = $1
  AND d.deleted_at IS NULL
ORDER BY d.created_at DESC;
```

### 6.2 Get analyses with opportunity details

```sql
SELECT 
    a.*,
    o.solicitation_number,
    o.title as opportunity_title,
    o.agency,
    o.estimated_value,
    o.response_due_date
FROM analyses a
JOIN opportunities o ON a.opportunity_id = o.id
WHERE a.company_id = $1
  AND a.deleted_at IS NULL
ORDER BY a.created_at DESC
LIMIT 20;
```

### 6.3 Semantic search for similar documents

```sql
SELECT 
    id,
    contract_title,
    customer_agency,
    1 - (embedding <=> $1) as similarity
FROM documents
WHERE company_id = $2
  AND deleted_at IS NULL
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

### 6.4 Analysis statistics by company

```sql
SELECT 
    overall_relevance_score,
    COUNT(*) as count,
    AVG(agent_confidence) as avg_confidence
FROM analyses
WHERE company_id = $1
  AND deleted_at IS NULL
GROUP BY overall_relevance_score
ORDER BY 
    CASE overall_relevance_score
        WHEN 'very_relevant' THEN 1
        WHEN 'relevant' THEN 2
        WHEN 'somewhat_relevant' THEN 3
        WHEN 'not_relevant' THEN 4
    END;
```
