from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from app.dependencies import get_current_user, get_db, require_org_id
from app.models import User, UserCompany
from app.services.document_processor import DocumentProcessor
from app.services.storage_service import StorageService
from app.services.llm_service import LLMService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

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
    org_id: UUID = Form(...),
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
    access_res = await db.execute(
        select(UserCompany)
        .where(UserCompany.user_id == current_user.id)
        .where(UserCompany.company_id == org_id)
    )
    if not access_res.scalars().first():
        raise HTTPException(status_code=403, detail="Invalid org_id")
    content = await file.read()
    
    try:
        print(f"Starting processing for file: {file.filename}, size: {len(content)} bytes")
        document = await processor.process_document(
            db=db,
            file_content=content,
            filename=file.filename,
            company_id=org_id,
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
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a document."""
    from app.models import Document
    from datetime import datetime
    
    query = select(Document).where(Document.id == id).where(Document.company_id == org_id)
    result = await db.execute(query)
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Soft delete
    document.deleted_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Document deleted successfully"}

class BulkDeleteRequest(BaseModel):
    ids: List[UUID]

@router.post("/bulk-delete")
async def bulk_delete_documents(
    payload: BulkDeleteRequest,
    org_id: UUID = Depends(require_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk soft delete documents."""
    from app.models import Document
    from datetime import datetime
    from sqlalchemy import update
    
    if not payload.ids:
        return {"message": "No IDs provided"}
        
    query = (
        update(Document)
        .where(Document.id.in_(payload.ids))
        .where(Document.company_id == org_id)
        .values(deleted_at=datetime.utcnow())
    )
    await db.execute(query)
    await db.commit()
    
    return {"message": f"Successfully deleted {len(payload.ids)} documents"}

@router.get("/", status_code=status.HTTP_200_OK)
async def list_documents(
    org_id: UUID = Depends(require_org_id),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service)
):
    """
    List documents. If company_id is provided, filter by company. Otherwise return all.
    """
    from app.models import Document
    from sqlalchemy import select
    
    query = select(Document).where(Document.deleted_at.is_(None))
    
    query = query.where(Document.company_id == org_id)
    
    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Generate signed URLs for each document
    response_docs = []
    for doc in documents:
        doc_dict = {
            "id": str(doc.id),
            "filename": doc.filename,
            "document_type": doc.document_type,
            "file_path": doc.file_path,
            "file_url": None,
            "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        # Generate signed URL if file_path exists
        if doc.file_path and not doc.file_path.startswith("manual://"):
            try:
                doc_dict["file_url"] = await storage.get_signed_url(doc.file_path)
            except Exception as e:
                print(f"Failed to generate signed URL for {doc.file_path}: {e}")
        response_docs.append(doc_dict)
    
    return response_docs
