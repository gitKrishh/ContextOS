from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Tuple
from uuid import uuid4

from models.documents import Chunk, ChunkMetadata, Document

from .config import ChunkingConfig
from .parent_child import ParentChildChunker
from .recursive import RecursiveChunker
from .semantic import SemanticChunker
from .sliding import SlidingWindowChunker
from .types import ChunkingResult
from .utils import estimate_tokens


class ChunkingService:
    def __init__(self, config: ChunkingConfig | None = None) -> None:
        self._config = config or ChunkingConfig()
        self._semantic = SemanticChunker(self._config)
        self._recursive = RecursiveChunker(self._config)
        self._sliding = SlidingWindowChunker(
            max_tokens=self._config.target_max_tokens, overlap_tokens=self._config.overlap_tokens
        )
        self._parent_child = ParentChildChunker(self._config)

    def chunk_document(self, document: Document, text: str) -> ChunkingResult:
        normalized = text.strip()
        if not normalized:
            return ChunkingResult(strategy="empty", chunks=[])

        chunks_text, strategy = self._choose_strategy(normalized)
        chunks = self._build_chunks(
            document=document,
            texts=chunks_text,
            role="primary",
            strategy=strategy,
        )

        parent_texts, child_map = self._parent_child.chunk(normalized)
        parent_chunks = self._build_chunks(
            document=document,
            texts=parent_texts,
            role="parent",
            strategy="parent",
        )
        child_chunks = self._build_child_chunks(
            document=document,
            parent_chunks=parent_chunks,
            child_map=child_map,
            strategy="parent_child",
        )

        return ChunkingResult(
            strategy=strategy,
            chunks=chunks,
            parent_chunks=parent_chunks,
            child_chunks=child_chunks,
        )

    def _choose_strategy(self, text: str) -> Tuple[List[str], str]:
        chunks = self._semantic.chunk(text)
        if self._is_valid(chunks):
            return chunks, "semantic"

        chunks = self._recursive.chunk(text)
        if self._is_valid(chunks):
            return chunks, "recursive"

        return self._sliding.chunk(text), "sliding"

    def _is_valid(self, chunks: List[str]) -> bool:
        if not chunks:
            return False
        if len(chunks) > self._config.max_chunk_count:
            return False
        for chunk in chunks:
            if estimate_tokens(chunk) > self._config.target_max_tokens * 1.5:
                return False
        return True

    def _build_chunks(
        self,
        *,
        document: Document,
        texts: List[str],
        role: str,
        strategy: str,
    ) -> List[Chunk]:
        now = datetime.now(timezone.utc)
        chunks: List[Chunk] = []
        for index, text in enumerate(texts):
            metadata = ChunkMetadata(
                document_id=document.id,
                chunk_index=index,
                source=document.metadata.source,
                extra={
                    "role": role,
                    "strategy": strategy,
                    "token_count": estimate_tokens(text),
                },
            )
            chunks.append(
                Chunk(
                    id=str(uuid4()),
                    document_id=document.id,
                    content=text,
                    metadata=metadata,
                    created_at=now,
                )
            )
        return chunks

    def _build_child_chunks(
        self,
        *,
        document: Document,
        parent_chunks: List[Chunk],
        child_map: List[List[str]],
        strategy: str,
    ) -> List[Chunk]:
        now = datetime.now(timezone.utc)
        chunks: List[Chunk] = []
        child_index = 0

        for parent_chunk, child_texts in zip(parent_chunks, child_map):
            for text in child_texts:
                metadata = ChunkMetadata(
                    document_id=document.id,
                    chunk_index=child_index,
                    source=document.metadata.source,
                    extra={
                        "role": "child",
                        "strategy": strategy,
                        "parent_id": parent_chunk.id,
                        "token_count": estimate_tokens(text),
                    },
                )
                chunks.append(
                    Chunk(
                        id=str(uuid4()),
                        document_id=document.id,
                        content=text,
                        metadata=metadata,
                        created_at=now,
                    )
                )
                child_index += 1

        return chunks
