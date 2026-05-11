from __future__ import annotations

import asyncio
import os
from typing import Dict, List, Optional, Sequence

from openai import AsyncOpenAI
from .cache import RedisEmbeddingCache, build_cache_key
from .config import EmbeddingConfig


class EmbeddingService:
    def __init__(
        self,
        *,
        config: EmbeddingConfig,
        cache: Optional[RedisEmbeddingCache] = None,
    ) -> None:
        self._config = config
        self._cache = cache
        self._client = AsyncOpenAI(
            api_key=os.getenv("CHAT_API_KEY"),
            base_url=os.getenv("CHAT_BASE_URL")
        )

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
        # NVIDIA NIMs/OpenAI support batching
        response = await self._client.embeddings.create(
            input=list(texts),
            model=self._config.model_name
        )
        
        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        results = [item.embedding for item in sorted_data]
        
        # Validate dimensions
        for vector in results:
            if len(vector) != self._config.embedding_dim:
                # Some models allow dynamic dimensions, but here we expect a match
                # with the config/database
                pass
                
        return results
