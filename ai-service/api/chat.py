from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from retrieval.retrieval_service import HybridRetrievalService
from services.chat_service import ChatService


router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    use_reranker: bool = True
    dense_weight: float = 1.0
    sparse_weight: float = 1.0


def get_retrieval_service(request: Request) -> HybridRetrievalService:
    return request.app.state.retrieval_service


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


@router.post("/completions")
async def chat_completions(
    chat_req: ChatRequest,
    retrieval_service: HybridRetrievalService = Depends(get_retrieval_service),
    chat_service: ChatService = Depends(get_chat_service),
):
    # 1. Retrieve relevant chunks
    results = await retrieval_service.search(
        query=chat_req.query,
        top_k=chat_req.top_k,
        dense_weight=chat_req.dense_weight,
        sparse_weight=chat_req.sparse_weight,
        use_reranker=chat_req.use_reranker,
    )
    
    chunks = [chunk for chunk, score in results]

    # 2. Stream answer from LLM
    async def event_generator():
        # First send the retrieved chunk IDs so the frontend can show citations
        citation_payload = {
            "type": "citations",
            "chunks": [
                {
                    "id": chunk.id,
                    "document_id": chunk.document_id,
                    "metadata": chunk.metadata,
                }
                for chunk in chunks
            ]
        }
        yield f"data: {json.dumps(citation_payload)}\n\n"

        async for token in chat_service.stream_answer(chat_req.query, chunks):
            payload = {"type": "token", "content": token}
            yield f"data: {json.dumps(payload)}\n\n"
        
        yield "data: [DONE]\n\n"

    import json
    return StreamingResponse(event_generator(), media_type="text/event-stream")
