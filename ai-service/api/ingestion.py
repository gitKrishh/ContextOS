from __future__ import annotations

from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from models.documents import Document
from models.ingestion import DocumentStatus, IngestionJob
from services import IngestionRegistry, IngestionService

router = APIRouter(prefix="/api/v1/ingestion", tags=["ingestion"])


class UploadResponse(BaseModel):
    success: bool = True
    request_id: str
    document: Document
    job: IngestionJob


class StatusResponse(BaseModel):
    success: bool = True
    request_id: str
    document: Document
    job: IngestionJob


class ListResponse(BaseModel):
    success: bool = True
    request_id: str
    documents: List[DocumentStatus]


class DeleteResponse(BaseModel):
    success: bool = True
    request_id: str
    deleted: bool
    document_id: str


def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _parse_tags(tags: Optional[str]) -> List[str]:
    if not tags:
        return []
    return [tag.strip() for tag in tags.split(",") if tag.strip()]


def _infer_source_type(filename: str, content_type: Optional[str]) -> str:
    if "." in filename:
        ext = filename.rsplit(".", 1)[1].lower()
        if ext in {"pdf", "docx", "txt"}:
            return ext
    if content_type in {"application/pdf"}:
        return "pdf"
    if content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }:
        return "docx"
    if content_type in {"text/plain"}:
        return "txt"
    return content_type or "unknown"


def _get_registry(request: Request) -> IngestionRegistry:
    registry = getattr(request.app.state, "ingestion_registry", None)
    if registry is None:
        raise HTTPException(status_code=500, detail="Ingestion registry is not configured")
    return registry


def _get_service(request: Request) -> IngestionService:
    service = getattr(request.app.state, "ingestion_service", None)
    if service is None:
        raise HTTPException(status_code=500, detail="Ingestion service is not configured")
    return service


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=None),
    source_uri: Optional[str] = Form(default=None),
) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    content = await file.read()
    size_bytes = len(content)
    await file.close()

    service = _get_service(request)
    document = await service.enqueue_upload(
        file_name=file.filename,
        content_type=file.content_type,
        size_bytes=size_bytes,
        title=title,
        tags=_parse_tags(tags),
        source_uri=source_uri,
        source_path=file.filename,
        source_type=_infer_source_type(file.filename, file.content_type),
        content=content,
    )

    status_result = _get_registry(request).get_document_status(document.id)
    if status_result is None:
        raise HTTPException(status_code=500, detail="Failed to create ingestion job")

    return UploadResponse(
        request_id=_get_request_id(request),
        document=status_result.document,
        job=status_result.job,
    )


@router.get("/status/{document_id}", response_model=StatusResponse)
async def get_status(request: Request, document_id: str) -> StatusResponse:
    status_result = _get_registry(request).get_document_status(document_id)
    if status_result is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return StatusResponse(
        request_id=_get_request_id(request),
        document=status_result.document,
        job=status_result.job,
    )


@router.get("/documents", response_model=ListResponse)
async def list_documents(request: Request) -> ListResponse:
    registry = _get_registry(request)
    service = _get_service(request)
    
    # 1. Get in-memory documents (active or recent)
    registry_docs = registry.list_documents()
    registry_ids = {d.document.id for d in registry_docs}
    
    # 2. Get all documents from permanent store
    # We'll need a new method in PostgresStore to list all document IDs
    db_docs = await service._store.load_all_documents()
    
    # 3. Merge them
    results = list(registry_docs)
    from models.ingestion import IngestionJob, IngestionStatus
    from datetime import datetime
    
    for doc in db_docs:
        if doc.id not in registry_ids:
            # Create a synthetic "completed" job status for historical docs
            job = IngestionJob(
                id=f"job-{doc.id}",
                document_id=doc.id,
                status=IngestionStatus.completed,
                attempts=1,
                max_attempts=1,
                created_at=doc.created_at,
                updated_at=doc.updated_at
            )
            results.append(DocumentStatus(document=doc, job=job))
            
    return ListResponse(request_id=_get_request_id(request), documents=results)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(request: Request, document_id: str) -> DeleteResponse:
    # 1. Remove from in-memory registry (if present)
    _get_registry(request).delete_document(document_id)
        
    # 2. Delete from permanent store (this is the source of truth)
    service = _get_service(request)
    await service._store.delete_document(document_id)
    
    return DeleteResponse(
        request_id=_get_request_id(request),
        deleted=True,
        document_id=document_id,
    )
