from __future__ import annotations

from typing import List, Tuple

from .config import ChunkingConfig
from .semantic import SemanticChunker
from .sliding import SlidingWindowChunker


class ParentChildChunker:
    def __init__(self, config: ChunkingConfig) -> None:
        self._config = config
        self._parent_window = SlidingWindowChunker(
            max_tokens=config.parent_max_tokens, overlap_tokens=config.parent_overlap_tokens
        )
        self._semantic = SemanticChunker(config)
        self._child_window = SlidingWindowChunker(
            max_tokens=config.target_max_tokens, overlap_tokens=config.overlap_tokens
        )

    def chunk(self, text: str) -> Tuple[List[str], List[List[str]]]:
        parent_chunks = self._parent_window.chunk(text)
        if not parent_chunks and text.strip():
            parent_chunks = [text.strip()]

        child_chunks_per_parent: List[List[str]] = []
        for parent in parent_chunks:
            children = self._semantic.chunk(parent)
            if not children:
                children = self._child_window.chunk(parent)
            child_chunks_per_parent.append(children)

        return parent_chunks, child_chunks_per_parent
