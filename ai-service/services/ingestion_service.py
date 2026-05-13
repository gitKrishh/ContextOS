from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import List, Optional

from chunking import ChunkingService
from embeddings import EmbeddingService
from models.documents import Chunk, Document
from models.ingestion import IngestionStatus
from retrieval import BM25Index
from services.ingestion_registry import IngestionRegistry
from services.parsers import ParserError, ParserFactory
from storage.postgres_store import PostgresStore
from utils.logging import info as log_info
from utils.logging import logger as get_logger


@dataclass(frozen=True)
class IngestionTask:
    document_id: str
    file_name: str
    content_type: Optional[str]
    content: bytes


class IngestionService:
    def __init__(
        self,
        *,
        registry: IngestionRegistry,
        parser_factory: ParserFactory,
        chunking_service: ChunkingService,
        embedding_service: EmbeddingService,
        store: PostgresStore,
        bm25_index: BM25Index,
        max_retries: int = 2,
    ) -> None:
        self._registry = registry
        self._parser_factory = parser_factory
        self._chunking_service = chunking_service
        self._embedding_service = embedding_service
        self._store = store
        self._bm25_index = bm25_index
        self._max_retries = max_retries
        self._queue: asyncio.Queue[IngestionTask] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task[None]] = None
        self._logger = get_logger("contextos.ingestion")

    async def start(self) -> None:
        await self._store.initialize()
        if self._bm25_index.is_empty():
            existing_chunks = await self._store.load_chunk_texts(role="primary")
            if existing_chunks:
                await asyncio.to_thread(self._bm25_index.build, existing_chunks)
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._worker())

    async def stop(self) -> None:
        if self._worker_task is not None:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        self._worker_task = None

    async def enqueue_upload(
        self,
        *,
        file_name: str,
        content_type: Optional[str],
        size_bytes: int,
        title: Optional[str],
        tags: List[str],
        source_uri: Optional[str],
        source_path: Optional[str],
        source_type: str,
        content: bytes,
    ) -> Document:
        document, _job = self._registry.create_document(
            file_name=file_name,
            content_type=content_type,
            size_bytes=size_bytes,
            title=title,
            tags=tags,
            source_uri=source_uri,
            source_path=source_path,
            source_type=source_type,
            max_attempts=self._max_retries + 1,
        )
        self._registry.update_job_status(document.id, IngestionStatus.queued)
        await self._queue.put(
            IngestionTask(
                document_id=document.id,
                file_name=file_name,
                content_type=content_type,
                content=content,
            )
        )
        log_info(
            self._logger,
            "ingestion_enqueued",
            document_id=document.id,
            queue_depth=self._queue.qsize(),
        )
        return document

    async def _worker(self) -> None:
        while True:
            task = await self._queue.get()
            try:
                await self._process_task(task)
            finally:
                self._queue.task_done()

    async def _process_task(self, task: IngestionTask) -> None:
        self._registry.update_job_status(task.document_id, IngestionStatus.processing)

        try:
            parse_start = time.perf_counter()
            parsed = await asyncio.to_thread(
                self._parser_factory.parse,
                task.content,
                task.file_name,
                task.content_type,
            )
            parse_duration = time.perf_counter() - parse_start

            parsed_metadata = dict(parsed.metadata)
            if parsed.page_count is not None:
                parsed_metadata["page_count"] = parsed.page_count
            if parsed.word_count is not None:
                parsed_metadata["word_count"] = parsed.word_count
            if parsed.char_count is not None:
                parsed_metadata["char_count"] = parsed.char_count

            self._registry.set_parsed_content(
                task.document_id, raw_text=parsed.text, parsed_metadata=parsed_metadata
            )

            chunk_start = time.perf_counter()
            document = self._registry.get_document(task.document_id)
            if document is None:
                raise RuntimeError("Document not found during ingestion")
            chunking_result = await asyncio.to_thread(
                self._chunking_service.chunk_document,
                document,
                parsed.text,
            )
            chunk_duration = time.perf_counter() - chunk_start

            self._registry.set_chunks(
                document.id,
                chunks=chunking_result.chunks,
                parent_chunks=chunking_result.parent_chunks,
                child_chunks=chunking_result.child_chunks,
            )

            embed_start = time.perf_counter()
            embeddings = await self._embedding_service.embed_texts(
                [chunk.content for chunk in chunking_result.chunks]
            )
            embed_duration = time.perf_counter() - embed_start
            print(f"DEBUG: Embedding took {embed_duration:.2f}s")

            # Map embeddings back to primary chunks
            for i, chunk in enumerate(chunking_result.chunks):
                chunk.embedding = embeddings[i]

            await self._store.save_document(document, parsed.text)
            await self._store.save_chunks(
                [*chunking_result.chunks, *chunking_result.parent_chunks, *chunking_result.child_chunks]
            )
            await asyncio.to_thread(
                self._bm25_index.add_documents,
                [(chunk.id, chunk.content) for chunk in chunking_result.chunks],
            )

            self._registry.update_job_status(task.document_id, IngestionStatus.completed)
            log_info(
                self._logger,
                "ingestion_completed",
                document_id=task.document_id,
                parse_ms=round(parse_duration * 1000, 2),
                chunk_ms=round(chunk_duration * 1000, 2),
                embed_ms=round(embed_duration * 1000, 2),
            )
        except ParserError as exc:
            await self._handle_failure(task, str(exc), retry=False)
        except Exception as exc:
            import traceback
            error_trace = traceback.format_exc()
            self._logger.error(f"Ingestion Exception for {task.document_id}:\n{error_trace}")
            await self._handle_failure(task, str(exc))

    async def _handle_failure(
        self, task: IngestionTask, error_message: str, retry: bool = True
    ) -> None:
        attempts = self._registry.increment_attempts(task.document_id)
        if retry and attempts <= self._max_retries:
            self._registry.update_job_status(task.document_id, IngestionStatus.queued, error_message)
            await asyncio.sleep(0.5 * attempts)
            await self._queue.put(task)
            log_info(
                self._logger,
                "ingestion_retry",
                document_id=task.document_id,
                attempts=attempts,
                queue_depth=self._queue.qsize(),
            )
        else:
            self._registry.update_job_status(task.document_id, IngestionStatus.failed, error_message)
            log_info(
                self._logger,
                "ingestion_failed",
                document_id=task.document_id,
                attempts=attempts,
            )
