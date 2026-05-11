import json
import os
import time
from dataclasses import dataclass
from typing import AsyncGenerator, List, Optional

from openai import AsyncOpenAI

from models.documents import Chunk
from utils.logging import logger as get_logger
from utils.observability import telemetry

@dataclass(frozen=True)
class ChatConfig:
    model: str = os.getenv("CHAT_MODEL", "gpt-4o-mini")
    api_key: Optional[str] = os.getenv("CHAT_API_KEY")
    base_url: Optional[str] = os.getenv("CHAT_BASE_URL")
    temperature: float = 1.0
    max_tokens: int = 8192
    system_prompt: str = (
        "You are ContextOS, an expert AI assistant. "
        "Use the provided context to answer the user's question. "
        "If the context doesn't contain the answer, say you don't know based on the context. "
        "Do NOT include any citations, chunk IDs, or source references in your answer. "
        "Keep your answers concise and professional."
    )

class ChatService:
    def __init__(self, config: Optional[ChatConfig] = None) -> None:
        self._config = config or ChatConfig()
        self._client = AsyncOpenAI(
            api_key=self._config.api_key,
            base_url=self._config.base_url,
        )
        self._logger = get_logger("contextos.chat")

    @property
    def model_name(self) -> str:
        return self._config.model

    def _format_context(self, chunks: List[Chunk]) -> str:
        context_parts = []
        for chunk in chunks:
            part = f"--- CHUNK ID: {chunk.id} ---\n{chunk.content}"
            context_parts.append(part)
        return "\n\n".join(context_parts)

    async def stream_answer(
        self, query: str, chunks: List[Chunk]
    ) -> AsyncGenerator[str, None]:
        context_str = self._format_context(chunks)
        
        messages = [
            {"role": "system", "content": self._config.system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {query}"},
        ]

        try:
            stream = await self._client.chat.completions.create(
                model=self._config.model,
                messages=messages,
                temperature=self._config.temperature,
                max_tokens=self._config.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if not getattr(chunk, "choices", None):
                    continue
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            self._logger.error(f"Error during chat completion: {e}")
            yield f"Error: {str(e)}"
