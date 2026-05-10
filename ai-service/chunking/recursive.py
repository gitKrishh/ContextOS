from __future__ import annotations

from typing import List

from .config import ChunkingConfig
from .utils import estimate_tokens


class RecursiveChunker:
    def __init__(self, config: ChunkingConfig) -> None:
        self._config = config
        self._separators = ["\n\n", "\n", ". ", " "]

    def chunk(self, text: str) -> List[str]:
        return self._recursive_split(text.strip())

    def _recursive_split(self, text: str) -> List[str]:
        if estimate_tokens(text) <= self._config.target_max_tokens:
            return [text]

        for separator in self._separators:
            parts = [p.strip() for p in text.split(separator) if p.strip()]
            if len(parts) <= 1:
                continue

            chunks: List[str] = []
            for part in parts:
                if estimate_tokens(part) > self._config.target_max_tokens:
                    chunks.extend(self._recursive_split(part))
                else:
                    chunks.append(part)

            if all(
                estimate_tokens(chunk) <= self._config.target_max_tokens for chunk in chunks
            ):
                return chunks

        return [text]
