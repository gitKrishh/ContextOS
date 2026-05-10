from __future__ import annotations

from io import BytesIO
from typing import Set

from .base import BaseParser, ParsedContent, ParserError

try:
    from docx import Document as DocxDocument
except ImportError:  # pragma: no cover - dependency is optional at runtime
    DocxDocument = None


class DocxParser(BaseParser):
    supported_types: Set[str] = {
        "docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    def parse(self, content: bytes, filename: str) -> ParsedContent:
        if DocxDocument is None:
            raise ParserError("python-docx is required to parse DOCX files", status_code=500)

        doc = DocxDocument(BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text]
        text = "\n".join(paragraphs).strip()

        core = doc.core_properties
        metadata = {
            "filename": filename,
            "title": core.title,
            "author": core.author,
            "created": core.created.isoformat() if core.created else None,
            "modified": core.modified.isoformat() if core.modified else None,
        }

        words = text.split()

        return ParsedContent(
            text=text,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            metadata={k: v for k, v in metadata.items() if v is not None},
            word_count=len(words),
            char_count=len(text),
        )
