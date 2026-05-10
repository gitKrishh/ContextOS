from __future__ import annotations

from typing import List


class SlidingWindowChunker:
    def __init__(self, max_tokens: int, overlap_tokens: int) -> None:
        self._max_tokens = max_tokens
        self._overlap_tokens = max(0, overlap_tokens)

    def chunk(self, text: str) -> List[str]:
        words = text.split()
        if not words:
            return []

        step = max(1, self._max_tokens - self._overlap_tokens)
        chunks: List[str] = []
        start = 0

        while start < len(words):
            end = min(len(words), start + self._max_tokens)
            chunk = " ".join(words[start:end]).strip()
            if chunk:
                chunks.append(chunk)
            if end == len(words):
                break
            start += step

        return chunks
