from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from typing import Dict, Iterable, List, Optional

try:
    from redis.asyncio import Redis
except ImportError:
    try:
        from redis import asyncio as Redis
    except ImportError:
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
        self._redis = None
        self._ttl_seconds = config.ttl_seconds
        if Redis is not None:
            try:
                self._redis = Redis.from_url(config.redis_url)
            except Exception:
                pass

    async def ping(self) -> None:
        if self._redis:
            try:
                await self._redis.ping()
            except Exception:
                self._redis = None

    async def get_many(self, keys: Iterable[str]) -> Dict[str, Optional[List[float]]]:
        keys_list = list(keys)
        if not keys_list or not self._redis:
            return {k: None for k in keys_list}
        try:
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
        except Exception:
            return {k: None for k in keys_list}

    async def set_many(self, values: Dict[str, List[float]]) -> None:
        if not values or not self._redis:
            return
        try:
            pipeline = self._redis.pipeline()
            for key, vector in values.items():
                pipeline.set(key, json.dumps(vector), ex=self._ttl_seconds)
            await pipeline.execute()
        except Exception:
            pass
