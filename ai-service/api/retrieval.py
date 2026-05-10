from __future__ import annotations

from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from models.documents import Chunk
from retrieval.retrieval_service import HybridRetrievalService

router = APIRouter(prefix="/api/v1/retrieval", tags=["retrieval"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    dense_weight: float = 1.0
    sparse_weight: float = 1.0
    use_reranker: bool = False


class SearchResult(BaseModel):
    chunk: Chunk
    score: float


class SearchResponse(BaseModel):
    success: bool = True
    request_id: str
    query: str
    results: List[SearchResult]


def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _get_service(request: Request) -> HybridRetrievalService:
    service = getattr(request.app.state, "retrieval_service", None)
    if service is None:
        raise HTTPException(status_code=500, detail="Retrieval service is not configured")
    return service


@router.post("/search", response_model=SearchResponse)
async def search(
    request: Request,
    search_req: SearchRequest,
) -> SearchResponse:
    if not search_req.query:
        raise HTTPException(status_code=400, detail="Query is required")

    service = _get_service(request)
    results = await service.search(
        query=search_req.query,
        top_k=search_req.top_k,
        dense_weight=search_req.dense_weight,
        sparse_weight=search_req.sparse_weight,
        use_reranker=search_req.use_reranker,
    )

    return SearchResponse(
        request_id=_get_request_id(request),
        query=search_req.query,
        results=[SearchResult(chunk=chunk, score=score) for chunk, score in results],
    )
