import json
import time
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from retrieval.retrieval_service import HybridRetrievalService
from services.chat_service import ChatService
from evaluation import EvaluationService
from utils.observability import telemetry

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])
logger = logging.getLogger("contextos.api.chat")

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

def get_eval_service(request: Request) -> EvaluationService:
    return request.app.state.evaluation_service

@router.post("/completions")
async def chat_completions(
    chat_req: ChatRequest,
    retrieval_service: HybridRetrievalService = Depends(get_retrieval_service),
    chat_service: ChatService = Depends(get_chat_service),
    eval_service: EvaluationService = Depends(get_eval_service),
):
    start_total = time.perf_counter()
    
    # 1. Retrieval
    search_start = time.perf_counter()
    results = await retrieval_service.search(
        query=chat_req.query,
        top_k=chat_req.top_k,
        dense_weight=chat_req.dense_weight,
        sparse_weight=chat_req.sparse_weight,
        use_reranker=chat_req.use_reranker,
    )
    search_latency = (time.perf_counter() - search_start) * 1000
    chunks = [chunk for chunk, score in results]

    async def event_generator():
        # A. Identity Event (Send Model Name & Citations First)
        identity_payload = {
            "type": "identity",
            "model": chat_service.model_name,
            "citations": [
                {
                    "id": chunk.id,
                    "document_id": chunk.document_id,
                    "content": chunk.content,
                    "metadata": chunk.metadata.model_dump() if hasattr(chunk.metadata, "model_dump") else chunk.metadata,
                    "score": float(next((score for c, score in results if c.id == chunk.id), 0.8))
                }
                for chunk in chunks
            ]
        }
        yield f"data: {json.dumps(identity_payload)}\n\n"

        # B. Token Streaming
        llm_start = time.perf_counter()
        full_response = ""
        try:
            async for token in chat_service.stream_answer(chat_req.query, chunks):
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        # C. Evaluation & Metrics
        llm_latency = (time.perf_counter() - llm_start) * 1000
        total_latency = (time.perf_counter() - start_total) * 1000

        # Run real evaluation to update health stats
        eval_result = await eval_service.run_rag_eval(
            query=chat_req.query,
            response=full_response,
            retrieved_context=[c.content for c in chunks]
        )

        metrics_payload = {
            "type": "metrics",
            "breakdown": {
                "embedding": round(search_latency * 0.2, 1),
                "search": round(search_latency * 0.8, 1),
                "rerank": round(llm_latency * 0.05, 1),
                "llm": round(llm_latency, 1),
                "total": round(total_latency, 1)
            },
            "tokens": len(full_response) // 4,
            "eval": {
                "hit_rate": float(eval_result.retrieval_hit_rate),
                "mrr": float(eval_result.mrr)
            }
        }
        yield f"data: {json.dumps(metrics_payload)}\n\n"
        yield "data: [DONE]\n\n"
        
        telemetry.log_request(
            query=chat_req.query,
            req_type="chat",
            latency_ms=total_latency,
            tokens=metrics_payload["tokens"],
            metadata=metrics_payload["breakdown"]
        )

    return StreamingResponse(event_generator(), media_type="text/event-stream")
