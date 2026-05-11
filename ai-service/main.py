from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import ingestion_router, retrieval_router, chat_router, evaluation_router, observability_router
from cache.retrieval_cache import RedisRetrievalCache, RetrievalCacheConfig
from chunking import ChunkingService
from embeddings import CacheConfig, EmbeddingConfig, EmbeddingService, RedisEmbeddingCache
from evaluation import EvaluationService
from reranking import RerankerConfig, RerankerService
from retrieval import BM25Index, BM25IndexConfig, HybridRetrievalService
from services import ChatService, IngestionRegistry, IngestionService, ParserFactory
from storage.postgres_store import PostgresStore
from utils.logging import configure_logging

configure_logging()

app = FastAPI(title="ContextOS AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "request_id": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "request_id": request_id},
    )


app.include_router(ingestion_router)
app.include_router(retrieval_router)
app.include_router(chat_router)
app.include_router(evaluation_router)
app.include_router(observability_router)


def _build_services(store: PostgresStore):
    data_dir = Path(os.getenv("CONTEXTOS_DATA_DIR", Path(__file__).resolve().parent / "data"))
    embedding_config = EmbeddingConfig(
        model_name=os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5"),
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "2048")),
        batch_size=int(os.getenv("EMBEDDING_BATCH_SIZE", "32")),
        cache_ttl_seconds=int(os.getenv("EMBEDDING_CACHE_TTL", "86400")),
        normalize=True,
    )
    embedding_cache = RedisEmbeddingCache(
        CacheConfig(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            ttl_seconds=embedding_config.cache_ttl_seconds,
        )
    )
    embedding_service = EmbeddingService(config=embedding_config, cache=embedding_cache)
    bm25_index = BM25Index(
        BM25IndexConfig(index_path=data_dir / "bm25.json")
    )
    reranker = RerankerService(
        RerankerConfig(model_name=os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"))
    )
    retrieval_cache = RedisRetrievalCache(
        RetrievalCacheConfig(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            ttl_seconds=int(os.getenv("RETRIEVAL_CACHE_TTL", "3600")),
        )
    )
    retrieval_service = HybridRetrievalService(
        embedding_service=embedding_service,
        bm25_index=bm25_index,
        store=store,
        reranker=reranker,
        cache=retrieval_cache,
    )
    registry = IngestionRegistry()
    parser_factory = ParserFactory()
    chunking_service = ChunkingService()

    ingestion_service = IngestionService(
        registry=registry,
        parser_factory=parser_factory,
        chunking_service=chunking_service,
        embedding_service=embedding_service,
        store=store,
        bm25_index=bm25_index,
        max_retries=int(os.getenv("INGESTION_MAX_RETRIES", "2")),
    )
    chat_service = ChatService()
    evaluation_service = EvaluationService()
    return ingestion_service, retrieval_service, registry, embedding_cache, retrieval_cache, chat_service, evaluation_service


@app.on_event("startup")
async def startup() -> None:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL must be set to use PostgreSQL")
        
    store = PostgresStore(db_url)
    await store.initialize()
    
    ingestion_service, retrieval_service, registry, embedding_cache, retrieval_cache, chat_service, evaluation_service = _build_services(store)
    
    app.state.ingestion_service = ingestion_service
    app.state.retrieval_service = retrieval_service
    app.state.chat_service = chat_service
    app.state.evaluation_service = evaluation_service
    app.state.ingestion_registry = registry
    app.state.document_store = store
    app.state.chat_store = store
    
    await ingestion_service.start()

@app.on_event("shutdown")
async def shutdown() -> None:
    ingestion_service = getattr(app.state, "ingestion_service", None)
    if ingestion_service is not None:
        await ingestion_service.stop()
