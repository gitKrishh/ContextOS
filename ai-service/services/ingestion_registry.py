from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from models.documents import Chunk, Document, DocumentMetadata, SourceMetadata
from models.ingestion import DocumentStatus, IngestionJob, IngestionStatus


class IngestionRegistry:
    def __init__(self) -> None:
        self._documents: Dict[str, Document] = {}
        self._jobs: Dict[str, IngestionJob] = {}
        self._raw_text: Dict[str, str] = {}
        self._chunks: Dict[str, List[Chunk]] = {}
        self._parent_chunks: Dict[str, List[Chunk]] = {}
        self._child_chunks: Dict[str, List[Chunk]] = {}

    def create_document(
        self,
        *,
        file_name: str,
        content_type: Optional[str],
        size_bytes: int,
        title: Optional[str],
        tags: List[str],
        source_uri: Optional[str],
        source_path: Optional[str],
        source_type: str,
        parsed_metadata: Optional[Dict[str, Any]] = None,
        raw_text: Optional[str] = None,
        max_attempts: int = 3,
    ) -> Tuple[Document, IngestionJob]:
        now = datetime.now(timezone.utc)
        document_id = str(uuid4())
        extra: Dict[str, Any] = {"content_type": content_type, "size_bytes": size_bytes}
        if parsed_metadata:
            extra["parsed"] = parsed_metadata

        metadata = DocumentMetadata(
            source=SourceMetadata(
                source_type=source_type,
                source_name=file_name,
                source_uri=source_uri,
                source_path=source_path,
            ),
            tags=tags,
            extra=extra,
        )
        document = Document(
            id=document_id,
            title=title or file_name,
            metadata=metadata,
            created_at=now,
            updated_at=now,
        )
        job = IngestionJob(
            id=str(uuid4()),
            document_id=document_id,
            status=IngestionStatus.uploaded,
            attempts=0,
            max_attempts=max_attempts,
            created_at=now,
            updated_at=now,
        )
        self._documents[document_id] = document
        self._jobs[document_id] = job
        if raw_text is not None:
            self._raw_text[document_id] = raw_text
        return document, job

    def list_documents(self) -> List[DocumentStatus]:
        results: List[DocumentStatus] = []
        for document_id, document in self._documents.items():
            job = self._jobs[document_id]
            results.append(DocumentStatus(document=document, job=job))
        return results

    def get_document(self, document_id: str) -> Optional[Document]:
        return self._documents.get(document_id)

    def get_document_status(self, document_id: str) -> Optional[DocumentStatus]:
        document = self._documents.get(document_id)
        job = self._jobs.get(document_id)
        if document is None or job is None:
            return None
        return DocumentStatus(document=document, job=job)

    def delete_document(self, document_id: str) -> bool:
        document = self._documents.pop(document_id, None)
        job = self._jobs.pop(document_id, None)
        self._raw_text.pop(document_id, None)
        self._chunks.pop(document_id, None)
        self._parent_chunks.pop(document_id, None)
        self._child_chunks.pop(document_id, None)
        return document is not None and job is not None

    def get_raw_text(self, document_id: str) -> Optional[str]:
        return self._raw_text.get(document_id)

    def set_parsed_content(
        self, document_id: str, *, raw_text: str, parsed_metadata: Dict[str, Any]
    ) -> None:
        document = self._documents.get(document_id)
        if document is None:
            return
        document.metadata.extra["parsed"] = parsed_metadata
        document.updated_at = datetime.now(timezone.utc)
        self._raw_text[document_id] = raw_text

    def update_job_status(
        self,
        document_id: str,
        status: IngestionStatus,
        error_message: Optional[str] = None,
    ) -> None:
        job = self._jobs.get(document_id)
        if job is None:
            return
        job.status = status
        job.error_message = error_message
        job.updated_at = datetime.now(timezone.utc)

    def increment_attempts(self, document_id: str) -> int:
        job = self._jobs.get(document_id)
        if job is None:
            return 0
        job.attempts += 1
        job.updated_at = datetime.now(timezone.utc)
        return job.attempts

    def set_chunks(
        self,
        document_id: str,
        *,
        chunks: List[Chunk],
        parent_chunks: List[Chunk],
        child_chunks: List[Chunk],
    ) -> None:
        self._chunks[document_id] = chunks
        self._parent_chunks[document_id] = parent_chunks
        self._child_chunks[document_id] = child_chunks

    def get_chunks(self, document_id: str) -> List[Chunk]:
        return self._chunks.get(document_id, [])

    def get_parent_chunks(self, document_id: str) -> List[Chunk]:
        return self._parent_chunks.get(document_id, [])

    def get_child_chunks(self, document_id: str) -> List[Chunk]:
        return self._child_chunks.get(document_id, [])
