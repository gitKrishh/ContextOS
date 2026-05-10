from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from typing import Any, Dict, Optional

try:
    from redis.asyncio import Redis
except ImportError:
    try:
        from redis import asyncio as Redis
    except ImportError:
        Redis = None


@dataclass(frozen=True)
class RetrievalCacheConfig:
    redis_url: str
    ttl_seconds: int


def build_retrieval_cache_key(query: str, top_k: int, dense_weight: float, sparse_weight: float, use_reranker: bool = False) -> str:
    payload = f"{query}:{top_k}:{dense_weight}:{sparse_weight}:{use_reranker}"
    digest = sha256(payload.encode("utf-8")).hexdigest()
    return f"retrieval:{digest}"


class RedisRetrievalCache:
    def __init__(self, config: RetrievalCacheConfig) -> None:
        self._redis = None
        self._ttl_seconds = config.ttl_seconds
        if Redis is not None:
            try:
                self._redis = Redis.from_url(config.redis_url)
            except Exception:
                pass

    async def get(self, key: str) -> Optional[Any]:
        if not self._redis:
            return None
        try:
            raw = await self._redis.get(key)
            if raw is None:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            return json.loads(raw)
        except Exception:
            return None

    async def set(self, key: str, value: Any) -> None:
        if not self._redis:
            return
        try:
            await self._redis.set(key, json.dumps(value), ex=self._ttl_seconds)
        except Exception:
            pass
