from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from uuid import UUID

from app.dependencies import get_current_user, get_db
from app.models import User
from app.services.document_processor import DocumentProcessor
from app.services.storage_service import StorageService
from app.services.llm_service import LLMService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# Dependency factories
def get_storage_service():
    return StorageService()

def get_llm_service():
    return LLMService()

def get_document_processor(
    storage: StorageService = Depends(get_storage_service),
    llm: LLMService = Depends(get_llm_service)
):
    return DocumentProcessor(llm, storage)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    company_id: UUID = Form(...),
    document_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    processor: DocumentProcessor = Depends(get_document_processor)
):
    """
    Upload and process a document.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Read file content
    content = await file.read()
    
    try:
        print(f"Starting processing for file: {file.filename}, size: {len(content)} bytes")
        document = await processor.process_document(
            db=db,
            file_content=content,
            filename=file.filename,
            company_id=company_id,
            document_type=document_type,
            user_id=current_user.id
        )
        print(f"Successfully processed file: {file.filename}")
        return document
    except Exception as e:
        print(f"Upload failed for {file.filename}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.delete("/{id}")
async def delete_document(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a document."""
    from app.models import Document
    from datetime import datetime
    
    query = select(Document).where(Document.id == id)
    result = await db.execute(query)
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Soft delete
    document.deleted_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Document deleted successfully"}

@router.get("/", status_code=status.HTTP_200_OK)
async def list_documents(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List documents. If company_id is provided, filter by company. Otherwise return all.
    """
    from app.models import Document
    from sqlalchemy import select
    
    query = select(Document).where(Document.deleted_at.is_(None))
    
    if company_id:
        query = query.where(Document.company_id == company_id)
    
    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    documents = result.scalars().all()
    return documents
