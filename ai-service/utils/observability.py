from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4


@dataclass
class RequestLog:
    id: str
    timestamp: datetime
    query: str
    type: str  # "search" or "chat"
    latency_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    tokens: Optional[int] = None


class TelemetryService:
    def __init__(self) -> None:
        self._logs: List[RequestLog] = []
        self._max_logs = 100

    def log_request(
        self, 
        query: str, 
        req_type: str, 
        latency_ms: float, 
        tokens: Optional[int] = None, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> RequestLog:
        log = RequestLog(
            id=str(uuid4()),
            timestamp=datetime.utcnow(),
            query=query,
            type=req_type,
            latency_ms=latency_ms,
            tokens=tokens,
            metadata=metadata or {}
        )
        self._logs.insert(0, log)
        # Keep only last N logs
        if len(self._logs) > self._max_logs:
            self._logs = self._logs[:self._max_logs]
        return log

    def get_recent_logs(self, limit: int = 20) -> List[RequestLog]:
        return self._logs[:limit]

    def get_summary(self) -> Dict[str, Any]:
        if not self._logs:
            return {}
        
        total_latency = sum(l.latency_ms for l in self._logs)
        avg_latency = total_latency / len(self._logs)
        
        return {
            "total_requests": len(self._logs),
            "avg_latency_ms": round(avg_latency, 2),
            "last_updated": datetime.utcnow().isoformat()
        }


# Singleton instance
telemetry = TelemetryService()
