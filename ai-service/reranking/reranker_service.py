import os
import httpx
from typing import List, Optional
from models.documents import Chunk
from .config import RerankerConfig

class RerankerService:
    def __init__(self, config: RerankerConfig):
        self.config = config
        self.api_key = os.getenv("CHAT_API_KEY") or os.getenv("NVIDIA_API_KEY")
        self.base_url = os.getenv("CHAT_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.endpoint = f"{self.base_url}/reranking"
        self._client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=10.0
        )

    async def rerank(self, query: str, chunks: List[Chunk], top_n: int = 5) -> List[tuple[Chunk, float]]:
        if not chunks:
            return []

        payload = {
            "model": self.config.model_name,
            "query": {"text": query},
            "documents": [{"text": c.content} for c in chunks],
            "top_n": top_n
        }

        try:
            response = await self._client.post(self.endpoint, json=payload)
            if response.status_code != 200:
                print(f"Reranking API error: {response.status_code} - {response.text}")
                return [(c, 1.0 - (i / len(chunks))) for i, c in enumerate(chunks)][:top_n]
                
            data = response.json()
            
            results = []
            for item in data.get("rankings", []):
                idx = item["index"]
                score = item.get("logit") or item.get("score")
                results.append((chunks[idx], float(score)))
            
            return results[:top_n]
        except Exception as e:
            print(f"Reranking Exception: {e}")
            return [(c, 1.0 - (i / len(chunks))) for i, c in enumerate(chunks)][:top_n]

    async def close(self):
        await self._client.aclose()
