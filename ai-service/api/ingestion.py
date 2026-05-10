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
    documents = _get_registry(request).list_documents()
    return ListResponse(request_id=_get_request_id(request), documents=documents)


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(request: Request, document_id: str) -> DeleteResponse:
    deleted = _get_registry(request).delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return DeleteResponse(
        request_id=_get_request_id(request),
        deleted=True,
        document_id=document_id,
    )
