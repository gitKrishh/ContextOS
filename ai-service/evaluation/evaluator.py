from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from utils.logging import logger as get_logger


@dataclass(frozen=True)
class EvalResult:
    query: str
    retrieval_hit_rate: float
    mrr: float
    faithfulness: Optional[float] = None
    relevance: Optional[float] = None
    latency_ms: float = 0.0


class EvaluationService:
    def __init__(self) -> None:
        self._logger = get_logger("contextos.evaluation")
        self._history: List[EvalResult] = []

    def compute_retrieval_metrics(
        self, query: str, retrieved_ids: List[str], ground_truth_ids: List[str]
    ) -> Dict[str, float]:
        """
        Computes basic retrieval metrics like Hit Rate and MRR.
        """
        if not ground_truth_ids:
            return {"hit_rate": 0.0, "mrr": 0.0}

        hits = 0
        mrr_sum = 0.0
        
        gt_set = set(ground_truth_ids)
        for rank, rid in enumerate(retrieved_ids):
            if rid in gt_set:
                hits += 1
                mrr_sum += 1.0 / (rank + 1)
        
        hit_rate = 1.0 if hits > 0 else 0.0
        mrr = mrr_sum / len(ground_truth_ids) if ground_truth_ids else 0.0
        
        return {"hit_rate": hit_rate, "mrr": mrr}

    async def run_rag_eval(
        self, query: str, response: str, retrieved_context: List[str], ground_truth: Optional[str] = None
    ) -> EvalResult:
        """
        Runs a full RAG evaluation (Faithfulness, Relevance).
        This would typically call RAGAS or a similar framework.
        For now, we'll scaffold it.
        """
        start_time = time.perf_counter()
        
        # Placeholder for RAGAS/DeepEval integration
        # In a real implementation, we would use the LLM to score the response
        
        result = EvalResult(
            query=query,
            retrieval_hit_rate=1.0,  # Placeholder
            mrr=1.0,                # Placeholder
            faithfulness=0.9,       # Placeholder
            relevance=0.85,         # Placeholder
            latency_ms=(time.perf_counter() - start_time) * 1000
        )
        
        self._history.append(result)
        return result

    def get_stats(self) -> Dict[str, Any]:
        if not self._history:
            return {}
            
        avg_hit_rate = sum(r.retrieval_hit_rate for r in self._history) / len(self._history)
        avg_mrr = sum(r.mrr for r in self._history) / len(self._history)
        
        return {
            "total_evals": len(self._history),
            "avg_hit_rate": round(avg_hit_rate, 4),
            "avg_mrr": round(avg_mrr, 4),
        }
