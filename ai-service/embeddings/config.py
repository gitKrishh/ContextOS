from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EmbeddingConfig:
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    batch_size: int = 32
    cache_ttl_seconds: int = 86400
    normalize: bool = True
