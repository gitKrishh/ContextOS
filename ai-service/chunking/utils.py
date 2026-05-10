from __future__ import annotations

import re
from typing import List


def estimate_tokens(text: str) -> int:
    tokens = re.findall(r"\S+", text)
    return max(1, len(tokens)) if text.strip() else 0


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_paragraphs(text: str) -> List[str]:
    paragraphs = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragraphs if p.strip()]


def split_sentences(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if s.strip()]
