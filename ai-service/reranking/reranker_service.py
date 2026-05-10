from __future__ import annotations

import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from sentence_transformers import CrossEncoder

from models.documents import Chunk
from utils.logging import logger as get_logger


@dataclass(frozen=True)
class RerankerConfig:
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    batch_size: int = 32
    max_length: int = 512


class RerankerService:
    def __init__(self, config: Optional[RerankerConfig] = None) -> None:
        self._config = config or RerankerConfig()
        self._model = None
        self._logger = get_logger("contextos.reranker")

    def _ensure_model(self) -> CrossEncoder:
        if self._model is None:
            self._logger.info(f"Loading reranker model: {self._config.model_name}")
            self._model = CrossEncoder(self._config.model_name, max_length=self._config.max_length)
        return self._model

    async def rerank(
        self, query: str, chunks: List[Chunk], top_n: Optional[int] = None
    ) -> List[Tuple[Chunk, float]]:
        if not chunks:
            return []

        model = self._ensure_model()
        
        # Prepare pairs for cross-encoder
        pairs = [[query, chunk.content] for chunk in chunks]
        
        start_time = time.perf_counter()
        # CrossEncoder.predict is blocking, run in thread
        import asyncio
        scores = await asyncio.to_thread(model.predict, pairs, batch_size=self._config.batch_size)
        duration = time.perf_counter() - start_time
        
        self._logger.info(f"Reranked {len(chunks)} chunks in {duration:.2f}s")

        # Combine chunks with scores and sort
        results = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)

        if top_n is not None:
            results = results[:top_n]

        return results
