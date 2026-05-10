from __future__ import annotations

from io import BytesIO
from typing import Set

from .base import BaseParser, ParsedContent, ParserError

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - dependency is optional at runtime
    PdfReader = None


class PdfParser(BaseParser):
    supported_types: Set[str] = {"pdf", "application/pdf"}

    def parse(self, content: bytes, filename: str) -> ParsedContent:
        if PdfReader is None:
            raise ParserError("pypdf is required to parse PDF files", status_code=500)

        reader = PdfReader(BytesIO(content))
        page_texts = []
        for page in reader.pages:
            page_texts.append(page.extract_text() or "")

        text = "\n\n".join(page_texts).strip()
        metadata = {"filename": filename}

        if reader.metadata:
            metadata["pdf_metadata"] = {
                key: str(value) for key, value in reader.metadata.items() if value is not None
            }

        words = text.split()

        return ParsedContent(
            text=text,
            content_type="application/pdf",
            metadata=metadata,
            page_count=len(reader.pages),
            word_count=len(words),
            char_count=len(text),
        )
