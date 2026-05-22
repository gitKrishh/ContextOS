from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


@dataclass(frozen=True)
class BM25IndexConfig:
    index_path: Path
    k1: float = 1.5
    b: float = 0.75


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


class BM25Index:
    def __init__(self, config: BM25IndexConfig) -> None:
        self._config = config
        self._config.index_path.parent.mkdir(parents=True, exist_ok=True)
        self._doc_term_freqs: Dict[str, Dict[str, int]] = {}
        self._doc_lengths: Dict[str, int] = {}
        self._doc_freq: Dict[str, int] = {}
        self._doc_count = 0
        self._total_doc_len = 0
        self._load()

    @property
    def doc_count(self) -> int:
        return self._doc_count

    @property
    def average_doc_length(self) -> float:
        if self._doc_count == 0:
            return 0.0
        return self._total_doc_len / self._doc_count

    def is_empty(self) -> bool:
        return self._doc_count == 0

    def build(self, documents: Sequence[Tuple[str, str]]) -> None:
        self._doc_term_freqs = {}
        self._doc_lengths = {}
        self._doc_freq = {}
        self._doc_count = 0
        self._total_doc_len = 0
        self.add_documents(documents, save=False)
        self.save()

    def add_documents(self, documents: Sequence[Tuple[str, str]], save: bool = True) -> None:
        for doc_id, text in documents:
            doc_id = str(doc_id)
            if doc_id in self._doc_term_freqs:
                self._remove_document(doc_id)
            tokens = _tokenize(text)
            term_freqs: Dict[str, int] = {}
            for token in tokens:
                term_freqs[token] = term_freqs.get(token, 0) + 1

            doc_length = sum(term_freqs.values())
            self._doc_term_freqs[doc_id] = term_freqs
            self._doc_lengths[doc_id] = doc_length
            self._doc_count += 1
            self._total_doc_len += doc_length
            for term in term_freqs:
                self._doc_freq[term] = self._doc_freq.get(term, 0) + 1

        if save:
            self.save()

    def search(self, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
        terms = _tokenize(query)
        if not terms:
            return []

        avgdl = self.average_doc_length or 1.0
        scores: Dict[str, float] = {}

        for doc_id, term_freqs in self._doc_term_freqs.items():
            dl = self._doc_lengths.get(doc_id, 0)
            score = 0.0
            for term in terms:
                tf = term_freqs.get(term)
                if not tf:
                    continue
                df = self._doc_freq.get(term, 0)
                if df == 0:
                    continue
                idf = math.log(1 + (self._doc_count - df + 0.5) / (df + 0.5))
                denom = tf + self._config.k1 * (1 - self._config.b + self._config.b * dl / avgdl)
                score += idf * (tf * (self._config.k1 + 1) / denom)
            if score > 0:
                scores[doc_id] = score

        return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]

    def save(self) -> None:
        payload = {
            "doc_term_freqs": {str(k): v for k, v in self._doc_term_freqs.items()},
            "doc_lengths": {str(k): v for k, v in self._doc_lengths.items()},
            "doc_freq": self._doc_freq,
            "doc_count": self._doc_count,
            "total_doc_len": self._total_doc_len,
        }
        self._config.index_path.write_text(json.dumps(payload))

    def _load(self) -> None:
        if not self._config.index_path.exists():
            return
        payload = json.loads(self._config.index_path.read_text())
        self._doc_term_freqs = {
            doc_id: {term: int(count) for term, count in terms.items()}
            for doc_id, terms in payload.get("doc_term_freqs", {}).items()
        }
        self._doc_lengths = {doc_id: int(length) for doc_id, length in payload.get("doc_lengths", {}).items()}
        self._doc_freq = {term: int(count) for term, count in payload.get("doc_freq", {}).items()}
        self._doc_count = int(payload.get("doc_count", 0))
        self._total_doc_len = int(payload.get("total_doc_len", 0))

    def _remove_document(self, doc_id: str) -> None:
        term_freqs = self._doc_term_freqs.pop(doc_id, None)
        if term_freqs is None:
            return
        doc_length = self._doc_lengths.pop(doc_id, 0)
        self._doc_count = max(0, self._doc_count - 1)
        self._total_doc_len = max(0, self._total_doc_len - doc_length)
        for term in term_freqs:
            current = self._doc_freq.get(term, 0)
            if current <= 1:
                self._doc_freq.pop(term, None)
            else:
                self._doc_freq[term] = current - 1
