from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Set

from pydantic import BaseModel, Field


class ParserError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class ParsedContent(BaseModel):
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    content_type: str
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    char_count: Optional[int] = None


class BaseParser(ABC):
    supported_types: Set[str]

    @abstractmethod
    def parse(self, content: bytes, filename: str) -> ParsedContent:
        raise NotImplementedError
