from __future__ import annotations

from typing import Optional

from .base import BaseParser, ParserError, ParsedContent
from .docx_parser import DocxParser
from .pdf_parser import PdfParser
from .txt_parser import TxtParser


class ParserFactory:
    def __init__(self) -> None:
        self._parsers = [PdfParser(), DocxParser(), TxtParser()]

    def get_parser(self, filename: str, content_type: Optional[str]) -> BaseParser:
        extension = ""
        if "." in filename:
            extension = filename.rsplit(".", 1)[1].lower()

        for parser in self._parsers:
            if extension in parser.supported_types:
                return parser
            if content_type and content_type in parser.supported_types:
                return parser

        raise ParserError("Unsupported file type", status_code=415)

    def parse(self, content: bytes, filename: str, content_type: Optional[str]) -> ParsedContent:
        parser = self.get_parser(filename, content_type)
        return parser.parse(content, filename)
