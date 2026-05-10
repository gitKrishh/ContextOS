from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from evaluation import EvaluationService


router = APIRouter(prefix="/api/v1/evaluation", tags=["evaluation"])


class EvalStatsResponse(BaseModel):
    success: bool
    stats: dict


@router.get("/stats", response_model=EvalStatsResponse)
async def get_eval_stats(request: Request):
    service: EvaluationService = request.app.state.evaluation_service
    return {
        "success": True,
        "stats": service.get_stats()
    }
