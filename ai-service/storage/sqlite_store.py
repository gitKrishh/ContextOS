from __future__ import annotations

import asyncio
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

from models.documents import Chunk, ChunkMetadata, Document, DocumentMetadata


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

    async def load_chunk_texts(self, role: Optional[str] = None) -> List[Tuple[str, str]]:
        return await asyncio.to_thread(self._load_chunk_texts_sync, role)

    async def load_chunks(self, chunk_ids: List[str]) -> List[Chunk]:
        return await asyncio.to_thread(self._load_chunks_sync, chunk_ids)

    async def load_documents(self, document_ids: List[str]) -> List[Document]:
        return await asyncio.to_thread(self._load_documents_sync, document_ids)

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

    def _load_chunk_texts_sync(self, role: Optional[str]) -> List[Tuple[str, str]]:
        with self._connect() as conn:
            cursor = conn.execute("SELECT id, content, metadata_json FROM chunks")
            rows = cursor.fetchall()

        results: List[Tuple[str, str]] = []
        for chunk_id, content, metadata_json in rows:
            if role:
                metadata = json.loads(metadata_json)
                extra = metadata.get("extra", {})
                if extra.get("role") != role:
                    continue
            results.append((chunk_id, content))
        return results

    def _load_chunks_sync(self, chunk_ids: List[str]) -> List[Chunk]:
        if not chunk_ids:
            return []
        
        placeholders = ",".join(["?"] * len(chunk_ids))
        with self._connect() as conn:
            cursor = conn.execute(
                f"SELECT id, document_id, content, metadata_json, created_at FROM chunks WHERE id IN ({placeholders})",
                chunk_ids
            )
            rows = cursor.fetchall()
        
        chunks = []
        for row in rows:
            chunks.append(Chunk(
                id=row[0],
                document_id=row[1],
                content=row[2],
                metadata=ChunkMetadata.model_validate_json(row[3]),
                created_at=datetime.fromisoformat(row[4])
            ))
        return chunks

    def _load_documents_sync(self, document_ids: List[str]) -> List[Document]:
        if not document_ids:
            return []
        
        placeholders = ",".join(["?"] * len(document_ids))
        with self._connect() as conn:
            cursor = conn.execute(
                f"SELECT id, title, metadata_json, created_at, updated_at FROM documents WHERE id IN ({placeholders})",
                document_ids
            )
            rows = cursor.fetchall()
        
        documents = []
        for row in rows:
            documents.append(Document(
                id=row[0],
                title=row[1],
                metadata=DocumentMetadata.model_validate_json(row[2]),
                created_at=datetime.fromisoformat(row[3]),
                updated_at=datetime.fromisoformat(row[4])
            ))
        return documents

    def delete_document_sync(self, document_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))
            conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            conn.commit()

    async def delete_document(self, document_id: str) -> None:
        await asyncio.to_thread(self.delete_document_sync, document_id)
