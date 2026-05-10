from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from typing import Dict, Iterable, List, Optional

try:
    from redis.asyncio import Redis
except ImportError:  # pragma: no cover - optional dependency at runtime
    Redis = None


@dataclass(frozen=True)
class CacheConfig:
    redis_url: str
    ttl_seconds: int


def build_cache_key(model_name: str, text: str) -> str:
    digest = sha256(f"{model_name}:{text}".encode("utf-8")).hexdigest()
    return f"embeddings:{model_name}:{digest}"


class RedisEmbeddingCache:
    def __init__(self, config: CacheConfig) -> None:
        if Redis is None:
            raise RuntimeError("redis is required for embedding cache")
        self._redis = Redis.from_url(config.redis_url)
        self._ttl_seconds = config.ttl_seconds

    async def ping(self) -> None:
        await self._redis.ping()

    async def get_many(self, keys: Iterable[str]) -> Dict[str, Optional[List[float]]]:
        keys_list = list(keys)
        if not keys_list:
            return {}
        values = await self._redis.mget(keys_list)
        results: Dict[str, Optional[List[float]]] = {}
        for key, raw in zip(keys_list, values):
            if raw is None:
                results[key] = None
            else:
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                results[key] = json.loads(raw)
        return results

    async def set_many(self, values: Dict[str, List[float]]) -> None:
        if not values:
            return
        pipeline = self._redis.pipeline()
        for key, vector in values.items():
            pipeline.set(key, json.dumps(vector), ex=self._ttl_seconds)
        await pipeline.execute()
