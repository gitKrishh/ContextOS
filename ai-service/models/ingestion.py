from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from .documents import Document


class IngestionStatus(str, Enum):
    uploaded = "uploaded"
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class IngestionJob(BaseModel):
    id: str
    document_id: str
    status: IngestionStatus
    attempts: int = 0
    max_attempts: int = 3
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None


class DocumentStatus(BaseModel):
    document: Document
    job: IngestionJob
