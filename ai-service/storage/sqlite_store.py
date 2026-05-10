from __future__ import annotations

import asyncio
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from models.documents import Chunk, Document


@dataclass(frozen=True)
class SqliteStoreConfig:
    db_path: Path


class SqliteDocumentStore:
    def __init__(self, config: SqliteStoreConfig) -> None:
        self._config = config
        self._config.db_path.parent.mkdir(parents=True, exist_ok=True)

    async def initialize(self) -> None:
        await asyncio.to_thread(self._initialize_sync)

    async def save_document(self, document: Document, raw_text: str) -> None:
        await asyncio.to_thread(self._save_document_sync, document, raw_text)

    async def save_chunks(self, chunks: Iterable[Chunk]) -> None:
        await asyncio.to_thread(self._save_chunks_sync, list(chunks))

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._config.db_path, check_same_thread=False)

    def _initialize_sync(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    metadata_json TEXT,
                    raw_text TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT,
                    content TEXT,
                    metadata_json TEXT,
                    created_at TEXT
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id)")
            conn.commit()

    def _save_document_sync(self, document: Document, raw_text: str) -> None:
        payload = json.dumps(document.metadata.model_dump())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO documents (id, title, metadata_json, raw_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    document.id,
                    document.title,
                    payload,
                    raw_text,
                    document.created_at.isoformat(),
                    document.updated_at.isoformat(),
                ),
            )
            conn.commit()

    def _save_chunks_sync(self, chunks: List[Chunk]) -> None:
        if not chunks:
            return
        document_id = chunks[0].document_id
        with self._connect() as conn:
            conn.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))
            conn.executemany(
                """
                INSERT INTO chunks (id, document_id, content, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    (
                        chunk.id,
                        chunk.document_id,
                        chunk.content,
                        json.dumps(chunk.metadata.model_dump()),
                        chunk.created_at.isoformat(),
                    )
                    for chunk in chunks
                ],
            )
            conn.commit()
