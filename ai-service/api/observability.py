from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from utils.observability import telemetry


router = APIRouter(prefix="/api/v1/observability", tags=["observability"])


class ObservabilityResponse(BaseModel):
    success: bool
    summary: dict
    logs: list


@router.get("/logs", response_model=ObservabilityResponse)
async def get_logs():
    return {
        "success": True,
        "summary": telemetry.get_summary(),
        "logs": telemetry.get_recent_logs()
    }
