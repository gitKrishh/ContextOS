from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from models.documents import Chunk


class ChunkingResult(BaseModel):
    strategy: str
    chunks: List[Chunk]
    parent_chunks: List[Chunk] = Field(default_factory=list)
    child_chunks: List[Chunk] = Field(default_factory=list)
