from __future__ import annotations

from typing import Set

from .base import BaseParser, ParsedContent, ParserError


class TxtParser(BaseParser):
    supported_types: Set[str] = {"txt", "text/plain"}

    def parse(self, content: bytes, filename: str) -> ParsedContent:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ParserError("TXT files must be UTF-8 encoded") from exc

        lines = text.splitlines()
        words = text.split()

        return ParsedContent(
            text=text,
            content_type="text/plain",
            metadata={"filename": filename, "line_count": len(lines)},
            word_count=len(words),
            char_count=len(text),
        )
