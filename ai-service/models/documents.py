from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SourceMetadata(BaseModel):
    source_type: str = Field(..., description="pdf, docx, txt, or other source types")
    source_name: str = Field(..., description="Original document name")
    source_uri: Optional[str] = Field(default=None, description="Canonical source URI")
    source_path: Optional[str] = Field(default=None, description="Original file path")


class DocumentMetadata(BaseModel):
    source: SourceMetadata
    tags: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class Document(BaseModel):
    id: str
    title: Optional[str] = None
    metadata: DocumentMetadata
    created_at: datetime
    updated_at: datetime


class ChunkLocation(BaseModel):
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    section: Optional[str] = None


class ChunkMetadata(BaseModel):
    document_id: str
    chunk_index: int
    source: SourceMetadata
    location: Optional[ChunkLocation] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class Chunk(BaseModel):
    id: str
    document_id: str
    content: str
    metadata: ChunkMetadata
    created_at: datetime
