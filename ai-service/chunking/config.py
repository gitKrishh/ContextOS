from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ChunkingConfig:
    target_min_tokens: int = 150
    target_max_tokens: int = 500
    overlap_tokens: int = 100
    parent_min_tokens: int = 1500
    parent_max_tokens: int = 2500
    parent_overlap_tokens: int = 200
    max_chunk_count: int = 2000
