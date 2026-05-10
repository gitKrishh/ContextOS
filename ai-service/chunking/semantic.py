from __future__ import annotations

from typing import List

from .config import ChunkingConfig
from .utils import estimate_tokens, split_paragraphs, split_sentences


class SemanticChunker:
    def __init__(self, config: ChunkingConfig) -> None:
        self._config = config

    def chunk(self, text: str) -> List[str]:
        paragraphs = split_paragraphs(text)
        if not paragraphs:
            return []

        segments: List[str] = []
        for paragraph in paragraphs:
            if estimate_tokens(paragraph) > self._config.target_max_tokens:
                segments.extend(split_sentences(paragraph))
            else:
                segments.append(paragraph)

        chunks: List[str] = []
        current: List[str] = []
        current_tokens = 0

        for segment in segments:
            segment_tokens = estimate_tokens(segment)
            if current and current_tokens + segment_tokens > self._config.target_max_tokens:
                chunks.append(" ".join(current).strip())
                current = [segment]
                current_tokens = segment_tokens
            else:
                current.append(segment)
                current_tokens += segment_tokens

        if current:
            chunks.append(" ".join(current).strip())

        if len(chunks) > 1 and estimate_tokens(chunks[-1]) < self._config.target_min_tokens:
            chunks[-2] = f"{chunks[-2]} {chunks[-1]}".strip()
            chunks.pop()

        return [chunk for chunk in chunks if chunk]
