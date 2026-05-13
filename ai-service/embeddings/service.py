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
            api_key=os.getenv("CHAT_API_KEY") or os.getenv("NVIDIA_API_KEY"),
            base_url=os.getenv("CHAT_BASE_URL", "https://integrate.api.nvidia.com/v1")
        )

    async def embed_texts(self, texts: Sequence[str], input_type: str = "passage") -> List[List[float]]:
        if not texts:
            return []

        cached: Dict[str, Optional[List[float]]] = {}
        keys: List[str] = []
        if self._cache is not None:
            # We include input_type in the cache key to be safe
            keys = [build_cache_key(f"{self._config.model_name}:{input_type}", text) for text in texts]
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
            computed = await self._compute_embeddings_batched(missing_texts, input_type=input_type)
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

    async def _compute_embeddings_batched(self, texts: Sequence[str], input_type: str = "passage") -> List[List[float]]:
        results: List[List[float]] = []
        batch_size = self._config.batch_size or 32
        
        # Split texts into batches to avoid API timeouts and payload limits
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_results = await self._compute_embeddings(batch, input_type=input_type)
            results.extend(batch_results)
            
        return results

    async def _compute_embeddings(self, texts: Sequence[str], input_type: str = "passage") -> List[List[float]]:
        response = await self._client.embeddings.create(
            input=list(texts),
            model=self._config.model_name,
            extra_body={"input_type": input_type}
        )
        
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]
