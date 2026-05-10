from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from api import ingestion_router
from chunking import ChunkingService
from embeddings import CacheConfig, EmbeddingConfig, EmbeddingService, RedisEmbeddingCache
from retrieval import FaissIndex, FaissIndexConfig
from services import IngestionRegistry, IngestionService, ParserFactory
from storage import SqliteDocumentStore, SqliteStoreConfig
from utils.logging import configure_logging

configure_logging()

app = FastAPI(title="ContextOS AI Service")


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


def _build_services() -> tuple[IngestionService, IngestionRegistry, RedisEmbeddingCache]:
    data_dir = Path(os.getenv("CONTEXTOS_DATA_DIR", Path(__file__).resolve().parent / "data"))
    embedding_config = EmbeddingConfig(
        model_name=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "384")),
        batch_size=int(os.getenv("EMBEDDING_BATCH_SIZE", "32")),
        cache_ttl_seconds=int(os.getenv("EMBEDDING_CACHE_TTL", "86400")),
        normalize=True,
    )
    cache = RedisEmbeddingCache(
        CacheConfig(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            ttl_seconds=embedding_config.cache_ttl_seconds,
        )
    )
    embedding_service = EmbeddingService(config=embedding_config, cache=cache)
    store = SqliteDocumentStore(SqliteStoreConfig(db_path=data_dir / "contextos.db"))
    index = FaissIndex(
        FaissIndexConfig(
            index_path=data_dir / "faiss.index",
            metadata_path=data_dir / "faiss_meta.json",
            embedding_dim=embedding_config.embedding_dim,
        )
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
        index=index,
        max_retries=int(os.getenv("INGESTION_MAX_RETRIES", "2")),
    )
    return ingestion_service, registry, cache


@app.on_event("startup")
async def startup() -> None:
    ingestion_service, registry, cache = _build_services()
    app.state.ingestion_service = ingestion_service
    app.state.ingestion_registry = registry
    await cache.ping()
    await ingestion_service.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    ingestion_service = getattr(app.state, "ingestion_service", None)
    if ingestion_service is not None:
        await ingestion_service.stop()
