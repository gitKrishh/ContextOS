import os
import httpx
from typing import List, Optional
from models.documents import Chunk
from .config import RerankerConfig

class RerankerService:
    def __init__(self, config: RerankerConfig):
        self.config = config
        self.api_key = os.getenv("CHAT_API_KEY")
        self.base_url = os.getenv("CHAT_BASE_URL").replace("/v1", "") # NIM rerank is often outside /v1
        # Common NIM rerank path is /ranking
        self.endpoint = f"{self.base_url}/ranking"

    async def rerank(self, query: str, chunks: List[Chunk], top_n: int = 5) -> List[tuple[Chunk, float]]:
        if not chunks:
            return []

        payload = {
            "model": self.config.model_name,
            "query": {"text": query},
            "documents": [{"text": c.content} for c in chunks],
            "top_n": top_n
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                # NIM response format: {"rankings": [{"index": 0, "logit": 0.9}, ...]}
                results = []
                for item in data.get("rankings", []):
                    idx = item["index"]
                    score = item.get("logit") or item.get("score")
                    results.append((chunks[idx], float(score)))
                
                return results[:top_n]
            except Exception as e:
                print(f"Reranking API error: {e}")
                # Fallback to original order if API fails
                return [(c, 1.0 - (i / len(chunks))) for i, c in enumerate(chunks)][:top_n]
