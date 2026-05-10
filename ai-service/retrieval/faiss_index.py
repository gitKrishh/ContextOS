from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Sequence, Tuple

try:
    import faiss
except ImportError:  # pragma: no cover - optional dependency at runtime
    faiss = None

try:
    import numpy as np
except ImportError:  # pragma: no cover - optional dependency at runtime
    np = None


@dataclass(frozen=True)
class FaissIndexConfig:
    index_path: Path
    metadata_path: Path
    embedding_dim: int


class FaissIndex:
    def __init__(self, config: FaissIndexConfig) -> None:
        if faiss is None or np is None:
            raise RuntimeError("faiss-cpu and numpy are required for FAISS indexing")
        self._config = config
        self._config.index_path.parent.mkdir(parents=True, exist_ok=True)
        self._index = self._load_or_create()
        self._id_map: List[str] = self._load_metadata()

    def add_embeddings(self, embeddings: Sequence[Sequence[float]], ids: Sequence[str]) -> None:
        if len(embeddings) != len(ids):
            raise ValueError("Embeddings and IDs must have the same length")
        if not embeddings:
            return

        vectors = np.array(embeddings, dtype="float32")
        if vectors.shape[1] != self._config.embedding_dim:
            raise ValueError(
                "Embedding dimension mismatch: "
                f"expected {self._config.embedding_dim}, got {vectors.shape[1]}"
            )

        self._index.add(vectors)
        self._id_map.extend(ids)
        self.save()

    def save(self) -> None:
        faiss.write_index(self._index, str(self._config.index_path))
        self._config.metadata_path.write_text(json.dumps(self._id_map))

    def _load_or_create(self):
        if self._config.index_path.exists():
            return faiss.read_index(str(self._config.index_path))
        return faiss.IndexFlatIP(self._config.embedding_dim)

    def search(self, query_embedding: Sequence[float], top_k: int = 5) -> List[Tuple[str, float]]:
        if not self._id_map or not query_embedding:
            return []

        query_vector = np.array([query_embedding], dtype="float32")
        distances, indices = self._index.search(query_vector, top_k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self._id_map):
                continue
            results.append((self._id_map[idx], float(dist)))

        return results

    def _load_metadata(self) -> List[str]:
        if self._config.metadata_path.exists():
            return json.loads(self._config.metadata_path.read_text())
        return []
