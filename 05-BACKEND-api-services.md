# Backend API Services
## Past Performance Gap Analysis Agent

---

## 1. Project Structure

```
/backend
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Configuration management
│   ├── dependencies.py         # Dependency injection
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── companies.py
│   │   │   ├── documents.py
│   │   │   ├── opportunities.py
│   │   │   ├── analyses.py
│   │   │   └── health.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       └── logging.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── company.py
│   │   ├── document.py
│   │   ├── opportunity.py
│   │   └── analysis.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── company.py
│   │   ├── document.py
│   │   ├── opportunity.py
│   │   └── analysis.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py
│   │   ├── analysis_engine.py
│   │   ├── llm_service.py
│   │   ├── embedding_service.py
│   │   ├── storage_service.py
│   │   └── export_service.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── text_extraction.py
│       └── validators.py
│
├── tests/
│   └── ...
│
├── alembic/
│   └── ...
│
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 2. Main Application (main.py)

```python
"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.routes import auth, companies, documents, opportunities, analyses, health
from app.api.middleware.logging import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    print("Starting up...")
    # Initialize database connections, background workers, etc.
    yield
    # Shutdown
    print("Shutting down...")
    # Cleanup resources


app = FastAPI(
    title="PP Gap Analysis API",
    description="Past Performance Gap Analysis Agent API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(opportunities.router, prefix="/api/opportunities", tags=["Opportunities"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["Analyses"])


@app.get("/")
async def root():
    return {"message": "PP Gap Analysis API", "version": "1.0.0"}
```

---

## 3. Configuration (config.py)

```python
"""
Application configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "PP Gap Analysis"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Claude API
    ANTHROPIC_API_KEY: str
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    CLAUDE_MAX_TOKENS: int = 8000
    
    # OpenAI (for embeddings)
    OPENAI_API_KEY: str
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Storage
    S3_BUCKET_NAME: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_ENDPOINT_URL: str = None  # For R2 or LocalStack
    S3_REGION: str = "us-east-1"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Background Tasks
    REDIS_URL: str = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
```

---

## 4. Document Processor Service

```python
"""
Document processing service for ingestion and parsing.
"""
import io
from typing import Optional, Dict, Any
from uuid import UUID
import PyPDF2
from docx import Document as DocxDocument

from app.services.llm_service import LLMService
from app.services.embedding_service import EmbeddingService
from app.services.storage_service import StorageService
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentProcessor:
    """
    Handles document upload, text extraction, metadata parsing, and embedding generation.
    """
    
    def __init__(
        self,
        llm_service: LLMService,
        embedding_service: EmbeddingService,
        storage_service: StorageService
    ):
        self.llm = llm_service
        self.embeddings = embedding_service
        self.storage = storage_service
    
    async def process_document(
        self,
        file_content: bytes,
        filename: str,
        company_id: UUID,
        document_type: str,
        user_id: UUID
    ) -> Document:
        """
        Process an uploaded document through the full pipeline.
        
        Steps:
        1. Upload file to storage
        2. Extract raw text
        3. Extract metadata using LLM
        4. Generate embeddings
        5. Create database record
        """
        
        # 1. Upload to storage
        file_path = await self.storage.upload_file(
            file_content=file_content,
            filename=filename,
            company_id=company_id
        )
        
        # 2. Extract raw text
        mime_type = self._detect_mime_type(filename)
        raw_text = await self._extract_text(file_content, mime_type)
        
        # 3. Create initial document record (pending status)
        document = await Document.create(
            company_id=company_id,
            document_type=document_type,
            filename=filename,
            file_path=file_path,
            file_size_bytes=len(file_content),
            mime_type=mime_type,
            raw_text=raw_text,
            processing_status="processing",
            created_by=user_id
        )
        
        try:
            # 4. Extract metadata using LLM
            parsed_content = await self._extract_metadata(raw_text, document_type)
            
            # 5. Generate embedding
            embedding = await self.embeddings.generate_embedding(raw_text)
            
            # 6. Update document with parsed data
            await document.update(
                parsed_content=parsed_content,
                embedding=embedding,
                contract_number=parsed_content.get("contract_number"),
                contract_title=parsed_content.get("contract_title"),
                customer_agency=parsed_content.get("customer_agency"),
                customer_command=parsed_content.get("customer_command"),
                contract_value=parsed_content.get("contract_value"),
                period_of_performance_start=parsed_content.get("pop_start"),
                period_of_performance_end=parsed_content.get("pop_end"),
                naics_code=parsed_content.get("naics_code"),
                clearance_level=parsed_content.get("clearance_level"),
                fte_count=parsed_content.get("fte_count"),
                geographic_scope=parsed_content.get("geographic_scope"),
                processing_status="completed",
                processed_at=datetime.utcnow()
            )
            
        except Exception as e:
            await document.update(
                processing_status="failed",
                processing_error=str(e)
            )
            raise
        
        return document
    
    async def _extract_text(self, file_content: bytes, mime_type: str) -> str:
        """Extract plain text from document based on mime type."""
        
        if mime_type == "application/pdf":
            return self._extract_pdf_text(file_content)
        elif mime_type in [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
        ]:
            return self._extract_docx_text(file_content)
        elif mime_type == "text/plain":
            return file_content.decode("utf-8")
        else:
            raise ValueError(f"Unsupported mime type: {mime_type}")
    
    def _extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF file."""
        reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text_parts = []
        for page in reader.pages:
            text_parts.append(page.extract_text())
        return "\n\n".join(text_parts)
    
    def _extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(io.BytesIO(file_content))
        text_parts = []
        for paragraph in doc.paragraphs:
            text_parts.append(paragraph.text)
        return "\n\n".join(text_parts)
    
    async def _extract_metadata(
        self, 
        raw_text: str, 
        document_type: str
    ) -> Dict[str, Any]:
        """Use LLM to extract structured metadata from document text."""
        
        # Truncate text if too long
        max_chars = 50000
        text_for_analysis = raw_text[:max_chars]
        
        # Build prompt based on document type
        if document_type in ["past_performance", "contract"]:
            prompt = self._build_pp_extraction_prompt(text_for_analysis)
        else:
            prompt = self._build_generic_extraction_prompt(text_for_analysis)
        
        # Call LLM
        response = await self.llm.extract_metadata(prompt)
        
        return response
    
    def _build_pp_extraction_prompt(self, text: str) -> str:
        """Build prompt for past performance document extraction."""
        # Reference the prompt from 04-AI-PROMPTS document
        return f"""
        Extract structured metadata from this government contract document.
        
        DOCUMENT TEXT:
        {text}
        
        [Include full extraction prompt from prompts document]
        """
    
    def _detect_mime_type(self, filename: str) -> str:
        """Detect mime type from filename."""
        ext = filename.lower().split(".")[-1]
        mime_types = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword",
            "txt": "text/plain"
        }
        return mime_types.get(ext, "application/octet-stream")
```

---

## 5. Analysis Engine Service

```python
"""
Core analysis engine for gap analysis.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import json

from app.services.llm_service import LLMService
from app.models.document import Document
from app.models.opportunity import Opportunity
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisCreate


class AnalysisEngine:
    """
    Performs gap analysis comparing past performance against opportunity requirements.
    """
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    async def run_analysis(
        self,
        company_id: UUID,
        opportunity_id: UUID,
        document_ids: Optional[List[UUID]] = None,
        user_id: UUID = None
    ) -> Analysis:
        """
        Execute full gap analysis.
        
        Args:
            company_id: Company to analyze
            opportunity_id: Target opportunity
            document_ids: Specific documents to include (None = all)
            user_id: User requesting analysis
            
        Returns:
            Completed Analysis object
        """
        start_time = datetime.utcnow()
        
        # 1. Retrieve documents
        if document_ids:
            documents = await Document.get_by_ids(document_ids)
        else:
            documents = await Document.get_by_company(
                company_id=company_id,
                document_types=["past_performance", "contract"]
            )
        
        if not documents:
            raise ValueError("No past performance documents found for analysis")
        
        # 2. Retrieve opportunity and its documents
        opportunity = await Opportunity.get(opportunity_id)
        opp_docs = await opportunity.get_documents()
        
        if not opp_docs:
            raise ValueError("No opportunity documents found for analysis")
        
        # 3. Build analysis prompt
        prompt = self._build_analysis_prompt(
            opportunity=opportunity,
            opp_docs=opp_docs,
            pp_docs=documents
        )
        
        # 4. Execute LLM analysis
        raw_response = await self.llm.analyze(prompt)
        
        # 5. Parse structured response
        parsed_result = self._parse_analysis_response(raw_response)
        
        # 6. Calculate processing time
        processing_time = (datetime.utcnow() - start_time).seconds
        
        # 7. Create analysis record
        analysis = await Analysis.create(
            company_id=company_id,
            opportunity_id=opportunity_id,
            overall_relevance_score=parsed_result["overall_score"],
            scope_score=parsed_result["scope_score"],
            magnitude_score=parsed_result["magnitude_score"],
            complexity_score=parsed_result["complexity_score"],
            recency_score=parsed_result.get("recency_score"),
            strengths=parsed_result["strengths"],
            weaknesses=parsed_result["weaknesses"],
            recommendations=parsed_result["recommendations"],
            gap_matrix=parsed_result["gap_matrix"],
            document_assessments=parsed_result.get("document_assessments", []),
            documents_analyzed=[d.id for d in documents],
            agent_confidence=parsed_result.get("confidence", 0.85),
            go_no_go_recommendation=parsed_result.get("go_no_go"),
            go_no_go_reasoning=parsed_result.get("go_no_go_reasoning"),
            raw_llm_response=raw_response,
            processing_time_seconds=processing_time,
            model_version=self.llm.model,
            created_by=user_id
        )
        
        return analysis
    
    def _build_analysis_prompt(
        self,
        opportunity: Opportunity,
        opp_docs: List,
        pp_docs: List[Document]
    ) -> str:
        """Build the full analysis prompt with all context."""
        
        # Format opportunity details
        opp_section = f"""
## TARGET OPPORTUNITY

**Solicitation**: {opportunity.solicitation_number or 'Not specified'}
**Title**: {opportunity.title}
**Agency**: {opportunity.agency or 'Not specified'}
**Estimated Value**: ${opportunity.estimated_value:,.2f if opportunity.estimated_value else 'TBD'}
**NAICS Code**: {opportunity.naics_code or 'Not specified'}
**Response Due**: {opportunity.response_due_date or 'Not specified'}

### Requirements
"""
        
        # Add parsed requirements from opportunity documents
        for doc in opp_docs:
            if doc.parsed_requirements:
                opp_section += f"\n**From {doc.document_type.upper()}:**\n"
                for req in doc.parsed_requirements.get("requirements", []):
                    opp_section += f"- [{req.get('id', 'N/A')}] {req.get('text', '')}\n"
            else:
                opp_section += f"\n**Raw {doc.document_type.upper()}:**\n{doc.raw_text[:5000]}\n"
        
        # Format past performance documents
        pp_section = "\n## COMPANY PAST PERFORMANCE PORTFOLIO\n"
        
        for i, doc in enumerate(pp_docs, 1):
            pp_section += f"""
### Reference {i}: {doc.contract_title or doc.filename}

**Contract Details**:
- Customer: {doc.customer_agency or 'Not specified'} / {doc.customer_command or 'N/A'}
- Contract Number: {doc.contract_number or 'Not specified'}
- Contract Value: ${doc.contract_value:,.2f if doc.contract_value else 'Not specified'}
- Period of Performance: {doc.period_of_performance_start or 'N/A'} to {doc.period_of_performance_end or 'N/A'}

**Scope & Complexity**:
- Clearance Level: {doc.clearance_level or 'Not specified'}
- FTE Count: {doc.fte_count or 'Not specified'}
- Geographic Scope: {doc.geographic_scope or 'Not specified'}

**Work Performed**:
{doc.parsed_content.get('scope_summary', 'See raw text') if doc.parsed_content else 'Not parsed'}

**Key Capabilities**:
{', '.join(doc.parsed_content.get('key_capabilities', [])) if doc.parsed_content else 'Not parsed'}

---
"""
        
        # Combine with system prompt
        full_prompt = f"""
{opp_section}

{pp_section}

## ANALYSIS INSTRUCTIONS

Perform a comprehensive gap analysis and provide your assessment in the following JSON structure:

```json
{{
    "overall_score": "very_relevant|relevant|somewhat_relevant|not_relevant",
    "overall_justification": "2-3 paragraph explanation",
    "scope_score": "very_relevant|relevant|somewhat_relevant|not_relevant",
    "scope_justification": "brief explanation",
    "magnitude_score": "very_relevant|relevant|somewhat_relevant|not_relevant",
    "magnitude_justification": "brief explanation",
    "complexity_score": "very_relevant|relevant|somewhat_relevant|not_relevant",
    "complexity_justification": "brief explanation",
    "recency_score": "very_relevant|relevant|somewhat_relevant|not_relevant",
    "recency_justification": "brief explanation",
    "strengths": [
        {{
            "title": "Strength title",
            "description": "Detailed explanation",
            "evidence": "Specific citations from documents",
            "impact_level": "high|medium|low"
        }}
    ],
    "weaknesses": [
        {{
            "title": "Gap/weakness title",
            "description": "Detailed explanation",
            "risk_level": "high|medium|low",
            "affected_requirements": ["req-1", "req-2"],
            "mitigation_suggestion": "How to address"
        }}
    ],
    "gap_matrix": {{
        "requirements": [
            {{
                "requirement_id": "PWS-3.1",
                "requirement_text": "requirement description",
                "coverage_rating": "strong|moderate|weak|gap",
                "supporting_docs": [
                    {{
                        "document_index": 1,
                        "relevance": "direct|partial|tangential",
                        "evidence": "specific evidence"
                    }}
                ]
            }}
        ]
    }},
    "recommendations": [
        {{
            "type": "narrative|mitigation|personnel|teaming",
            "title": "Recommendation title",
            "description": "Detailed recommendation",
            "priority": "high|medium|low"
        }}
    ],
    "go_no_go": "go|no_go|conditional",
    "go_no_go_reasoning": "explanation of recommendation",
    "confidence": 0.85
}}
```

Provide thorough analysis with specific evidence from the documents.
"""
        
        return full_prompt
    
    def _parse_analysis_response(self, raw_response: str) -> Dict[str, Any]:
        """Parse LLM response into structured data."""
        
        # Extract JSON from response
        try:
            # Try to find JSON block in response
            if "```json" in raw_response:
                json_start = raw_response.index("```json") + 7
                json_end = raw_response.index("```", json_start)
                json_str = raw_response[json_start:json_end].strip()
            elif "{" in raw_response:
                # Find first { and last }
                json_start = raw_response.index("{")
                json_end = raw_response.rindex("}") + 1
                json_str = raw_response[json_start:json_end]
            else:
                raise ValueError("No JSON found in response")
            
            parsed = json.loads(json_str)
            return parsed
            
        except (json.JSONDecodeError, ValueError) as e:
            # Fallback: create minimal structure
            return {
                "overall_score": "not_relevant",
                "scope_score": "not_relevant",
                "magnitude_score": "not_relevant",
                "complexity_score": "not_relevant",
                "strengths": [],
                "weaknesses": [{
                    "title": "Analysis Error",
                    "description": f"Failed to parse analysis: {str(e)}",
                    "risk_level": "high"
                }],
                "recommendations": [],
                "gap_matrix": {"requirements": []},
                "confidence": 0.0
            }
```

---

## 6. LLM Service

```python
"""
Service for interacting with Claude API.
"""
from anthropic import AsyncAnthropic
from typing import Dict, Any

from app.config import settings


class LLMService:
    """
    Wrapper service for Claude API interactions.
    """
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL
        self.max_tokens = settings.CLAUDE_MAX_TOKENS
    
    async def analyze(self, prompt: str) -> str:
        """
        Send analysis prompt to Claude and get response.
        """
        # Load system prompt
        system_prompt = self._get_system_prompt()
        
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=0.3,  # Lower temperature for consistency
            system=system_prompt,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.content[0].text
    
    async def extract_metadata(self, prompt: str) -> Dict[str, Any]:
        """
        Extract structured metadata from document.
        """
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            temperature=0.1,  # Very low for extraction
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse JSON response
        import json
        text = response.content[0].text
        
        # Extract JSON from response
        if "```json" in text:
            json_start = text.index("```json") + 7
            json_end = text.index("```", json_start)
            json_str = text[json_start:json_end].strip()
        else:
            json_str = text
        
        return json.loads(json_str)
    
    def _get_system_prompt(self) -> str:
        """Load the analysis system prompt."""
        # This would load from the prompts file
        return """
You are an expert Government Contract Proposal Analyst specializing in past 
performance evaluation. Your role is to assess whether a contractor's past 
performance references demonstrate the ability to successfully execute a 
new contract opportunity.

[Full system prompt from 04-AI-PROMPTS document]
"""
```

---

## 7. API Routes Example (analyses.py)

```python
"""
Analysis API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID

from app.dependencies import get_current_user, get_analysis_engine
from app.schemas.analysis import (
    AnalysisCreate, 
    AnalysisResponse, 
    AnalysisListResponse
)
from app.services.analysis_engine import AnalysisEngine
from app.models.analysis import Analysis


router = APIRouter()


@router.post("/", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    analysis_data: AnalysisCreate,
    current_user = Depends(get_current_user),
    analysis_engine: AnalysisEngine = Depends(get_analysis_engine)
):
    """
    Run a new gap analysis.
    
    - **company_id**: Company whose documents to analyze
    - **opportunity_id**: Target opportunity to analyze against
    - **document_ids**: Optional list of specific documents to include
    """
    try:
        analysis = await analysis_engine.run_analysis(
            company_id=analysis_data.company_id,
            opportunity_id=analysis_data.opportunity_id,
            document_ids=analysis_data.document_ids,
            user_id=current_user.id
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/", response_model=List[AnalysisListResponse])
async def list_analyses(
    company_id: Optional[UUID] = None,
    opportunity_id: Optional[UUID] = None,
    limit: int = 20,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """
    List analyses with optional filtering.
    """
    analyses = await Analysis.list(
        company_id=company_id,
        opportunity_id=opportunity_id,
        limit=limit,
        offset=offset
    )
    return analyses


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Get a specific analysis by ID.
    """
    analysis = await Analysis.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Delete an analysis (soft delete).
    """
    analysis = await Analysis.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    await analysis.soft_delete()
    return None


@router.post("/{analysis_id}/export")
async def export_analysis(
    analysis_id: UUID,
    format: str = "docx",
    current_user = Depends(get_current_user)
):
    """
    Export analysis to document format.
    
    - **format**: 'docx' or 'pdf'
    """
    analysis = await Analysis.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Generate export (implementation in export service)
    from app.services.export_service import ExportService
    export_service = ExportService()
    
    if format == "docx":
        file_path = await export_service.export_to_docx(analysis)
    elif format == "pdf":
        file_path = await export_service.export_to_pdf(analysis)
    else:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    return {"download_url": file_path}
```

---

## 8. Requirements (requirements.txt)

```
# FastAPI and server
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pgvector==0.2.4

# Pydantic
pydantic==2.5.3
pydantic-settings==2.1.0

# AI/ML
anthropic==0.18.0
openai==1.10.0
tiktoken==0.5.2

# Document processing
PyPDF2==3.0.1
python-docx==1.1.0
mammoth==1.6.0

# Storage
boto3==1.34.25
aioboto3==12.3.0

# Export
python-docx==1.1.0
reportlab==4.0.8

# Utilities
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.26.0

# Background tasks
celery==5.3.4
redis==5.0.1

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
```
