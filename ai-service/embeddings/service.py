from __future__ import annotations

import asyncio
import math
from typing import Dict, List, Optional, Sequence

from .cache import RedisEmbeddingCache, build_cache_key
from .config import EmbeddingConfig

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - optional dependency at runtime
    SentenceTransformer = None


class EmbeddingService:
    def __init__(
        self,
        *,
        config: EmbeddingConfig,
        cache: Optional[RedisEmbeddingCache] = None,
    ) -> None:
        self._config = config
        self._cache = cache
        self._model: Optional[SentenceTransformer] = None

    async def embed_texts(self, texts: Sequence[str]) -> List[List[float]]:
        if not texts:
            return []

        cached: Dict[str, Optional[List[float]]] = {}
        keys: List[str] = []
        if self._cache is not None:
            keys = [build_cache_key(self._config.model_name, text) for text in texts]
            cached = await self._cache.get_many(keys)

        embeddings: List[Optional[List[float]]] = [None] * len(texts)
        missing_texts: List[str] = []
        missing_indices: List[int] = []

        for index, text in enumerate(texts):
            key = keys[index] if keys else ""
            vector = cached.get(key)
            if vector is not None:
                embeddings[index] = vector
            else:
                missing_texts.append(text)
                missing_indices.append(index)

        if missing_texts:
            computed = await self._compute_embeddings(missing_texts)
            for idx, vector in zip(missing_indices, computed):
                embeddings[idx] = vector

            if self._cache is not None and keys:
                to_cache = {
                    keys[idx]: embeddings[idx]  # type: ignore[index]
                    for idx in missing_indices
                    if embeddings[idx] is not None
                }
                await self._cache.set_many(to_cache)  # type: ignore[arg-type]

        if any(vector is None for vector in embeddings):
            raise RuntimeError("Embedding generation failed for one or more inputs")
        return [vector for vector in embeddings if vector is not None]

    async def _compute_embeddings(self, texts: Sequence[str]) -> List[List[float]]:
        model = self._get_model()
        embeddings = await asyncio.to_thread(
            model.encode,
            list(texts),
            batch_size=self._config.batch_size,
            convert_to_numpy=True,
            normalize_embeddings=False,
        )

        results: List[List[float]] = []
        for vector in embeddings:
            vector_list = vector.tolist()
            if len(vector_list) != self._config.embedding_dim:
                raise ValueError(
                    "Embedding dimension mismatch: "
                    f"expected {self._config.embedding_dim}, got {len(vector_list)}"
                )
            if self._config.normalize:
                vector_list = self._normalize(vector_list)
            results.append(vector_list)
        return results

    def _get_model(self) -> SentenceTransformer:
        if SentenceTransformer is None:
            raise RuntimeError("sentence-transformers is required for embeddings")
        if self._model is None:
            self._model = SentenceTransformer(self._config.model_name)
        return self._model

    def _normalize(self, vector: List[float]) -> List[float]:
        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]
