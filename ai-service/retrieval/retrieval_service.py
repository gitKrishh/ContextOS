from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Tuple

from cache.retrieval_cache import RedisRetrievalCache, build_retrieval_cache_key
from embeddings import EmbeddingService
from models.documents import Chunk
from reranking import RerankerService
from retrieval.bm25_index import BM25Index
from retrieval.faiss_index import FaissIndex
from storage.sqlite_store import SqliteDocumentStore


class HybridRetrievalService:
    def __init__(
        self,
        *,
        embedding_service: EmbeddingService,
        faiss_index: FaissIndex,
        bm25_index: BM25Index,
        store: SqliteDocumentStore,
        reranker: Optional[RerankerService] = None,
        cache: Optional[RedisRetrievalCache] = None,
        rrf_k: int = 60,
    ) -> None:
        self._embedding_service = embedding_service
        self._faiss_index = faiss_index
        self._bm25_index = bm25_index
        self._store = store
        self._reranker = reranker
        self._cache = cache
        self._rrf_k = rrf_k

    async def search(
        self,
        query: str,
        top_k: int = 5,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0,
        use_reranker: bool = False,
    ) -> List[Tuple[Chunk, float]]:
        # 0. Check cache
        cache_key = None
        if self._cache is not None:
            cache_key = build_retrieval_cache_key(query, top_k, dense_weight, sparse_weight, use_reranker)
            cached_results = await self._cache.get(cache_key)
            if cached_results is not None:
                # Rehydrate chunks from cached IDs and scores
                chunk_ids = [res["chunk_id"] for res in cached_results]
                chunks = await self._store.load_chunks(chunk_ids)
                chunk_map = {chunk.id: chunk for chunk in chunks}
                return [
                    (chunk_map[res["chunk_id"]], res["score"])
                    for res in cached_results
                    if res["chunk_id"] in chunk_map
                ]

        # 1. Generate query embedding
        query_embeddings = await self._embedding_service.embed_texts([query])
        query_embedding = query_embeddings[0]

        # 2. Parallel Dense and Sparse retrieval
        import time
        start_retrieval = time.perf_counter()
        # If reranking, we fetch more results to rerank
        initial_top_k = top_k * 5 if use_reranker else top_k * 2
        
        dense_results_task = asyncio.to_thread(self._faiss_index.search, query_embedding, top_k=initial_top_k)
        sparse_results_task = asyncio.to_thread(self._bm25_index.search, query, top_k=initial_top_k)

        dense_results, sparse_results = await asyncio.gather(dense_results_task, sparse_results_task)
        print(f"DEBUG: Parallel retrieval took {(time.perf_counter() - start_retrieval)*1000:.2f}ms")

        # 3. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = {}

        # Dense ranking
        for rank, (chunk_id, _score) in enumerate(dense_results):
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + dense_weight / (self._rrf_k + rank + 1)

        # Sparse ranking
        for rank, (chunk_id, _score) in enumerate(sparse_results):
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + sparse_weight / (self._rrf_k + rank + 1)

        # 4. Sort and select top_k (or top_n for reranking)
        fusion_top_n = top_k * 2 if use_reranker else top_k
        sorted_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:fusion_top_n]
        
        if not sorted_results:
            return []

        # 5. Hydrate chunks from store
        chunk_ids = [chunk_id for chunk_id, _score in sorted_results]
        chunks = await self._store.load_chunks(chunk_ids)
        chunk_map = {chunk.id: chunk for chunk in chunks}
        
        results_to_process = [
            (chunk_map[chunk_id], score)
            for chunk_id, score in sorted_results
            if chunk_id in chunk_map
        ]
        # 6. Reranking (optional)
        if use_reranker and self._reranker is not None:
            start_rerank = time.perf_counter()
            print(f"DEBUG: Reranking {len(results_to_process)} chunks...")
            chunks_to_rerank = [c for c, s in results_to_process]
            results = await self._reranker.rerank(query, chunks_to_rerank, top_n=top_k)
            print(f"DEBUG: Reranking took {(time.perf_counter() - start_rerank)*1000:.2f}ms")
        else:
            results = results_to_process[:top_k]

        # 7. Cache results
        if self._cache is not None and cache_key is not None:
            cache_payload = [
                {"chunk_id": chunk.id, "score": float(score)}
                for chunk, score in results
            ]
            await self._cache.set(cache_key, cache_payload)

        return results
