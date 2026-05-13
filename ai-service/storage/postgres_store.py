import json
from datetime import datetime
from typing import List

from sqlalchemy import Column, String, DateTime, Text, select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from pgvector.sqlalchemy import Vector

Base = declarative_base()

class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    
    id = Column(String, primary_key=True)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    role = Column(String)
    content = Column(Text)
    citations_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentModel(Base):
    __tablename__ = 'documents'
    
    id = Column(String, primary_key=True)
    title = Column(String)
    metadata_json = Column(Text)
    raw_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChunkModel(Base):
    __tablename__ = 'chunks'
    
    id = Column(String, primary_key=True)
    document_id = Column(String, index=True)
    content = Column(Text)
    metadata_json = Column(Text)
    embedding = Column(Vector(2048)) # Match Llama Nemotron dimension
    created_at = Column(DateTime, default=datetime.utcnow)


from typing import Iterable, Optional, Tuple
from models.documents import Chunk, ChunkMetadata, Document, DocumentMetadata
from sqlalchemy import text

class PostgresStore:
    def __init__(self, db_url: str):
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        connect_args = {}
        if any(cloud in db_url for cloud in ["supabase", "railway", "render"]):
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            # Disable prepared statements for pgbouncer compatibility
            connect_args = {
                "ssl": ctx,
                "prepared_statement_cache_size": 0,
                "statement_cache_size": 0
            }
            
        self.engine = create_async_engine(db_url, echo=False, connect_args=connect_args)
        self.async_session = sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)

    async def initialize(self):
        async with self.engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)

    async def search_dense(self, query_embedding: List[float], top_k: int = 5) -> List[Tuple[str, float]]:
        async with self.async_session() as session:
            # Using L2 distance (<->) or Cosine distance (<=>)
            # 1 - (embedding <=> query) gives cosine similarity
            stmt = select(
                ChunkModel.id,
                (1 - ChunkModel.embedding.cosine_distance(query_embedding)).label("similarity")
            ).where(ChunkModel.embedding.is_not(None)).order_by(text("similarity DESC")).limit(top_k)
            
            result = await session.execute(stmt)
            return [(row[0], float(row[1])) for row in result.all()]

    async def create_session(self, session_id: str, title: str) -> None:
        async with self.async_session() as session:
            new_session = ChatSession(id=session_id, title=title)
            session.add(new_session)
            await session.commit()

    async def update_session_title(self, session_id: str, title: str) -> None:
        async with self.async_session() as session:
            result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
            chat_session = result.scalar_one_or_none()
            if chat_session:
                chat_session.title = title
                chat_session.updated_at = datetime.utcnow()
                await session.commit()

    async def get_sessions(self) -> List[dict]:
        async with self.async_session() as session:
            result = await session.execute(select(ChatSession).order_by(ChatSession.created_at.desc()))
            sessions = result.scalars().all()
            return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]

    async def get_messages(self, session_id: str) -> List[dict]:
        async with self.async_session() as session:
            result = await session.execute(
                select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
            )
            messages = result.scalars().all()
            return [{
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": json.loads(m.citations_json) if m.citations_json else []
            } for m in messages]

    async def add_message(self, session_id: str, message_id: str, role: str, content: str, citations: list = None) -> None:
        async with self.async_session() as session:
            cit_json = json.dumps(citations) if citations else None
            new_message = ChatMessage(
                id=message_id,
                session_id=session_id,
                role=role,
                content=content,
                citations_json=cit_json
            )
            session.add(new_message)
            
            # Update session timestamp
            result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
            chat_session = result.scalar_one_or_none()
            if chat_session:
                chat_session.updated_at = datetime.utcnow()
                
            await session.commit()

    async def delete_session(self, session_id: str) -> None:
        async with self.async_session() as session:
            await session.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
            await session.execute(delete(ChatSession).where(ChatSession.id == session_id))
            await session.commit()

    # --- Document Methods ---
    async def save_document(self, document: Document, raw_text: str) -> None:
        async with self.async_session() as session:
            # Upsert logic
            result = await session.execute(select(DocumentModel).where(DocumentModel.id == document.id))
            existing = result.scalar_one_or_none()
            if existing:
                existing.title = document.title
                existing.metadata_json = json.dumps(document.metadata.model_dump())
                existing.raw_text = raw_text
                existing.updated_at = document.updated_at
            else:
                new_doc = DocumentModel(
                    id=document.id,
                    title=document.title,
                    metadata_json=json.dumps(document.metadata.model_dump()),
                    raw_text=raw_text,
                    created_at=document.created_at,
                    updated_at=document.updated_at
                )
                session.add(new_doc)
            await session.commit()

    async def save_chunks(self, chunks: Iterable[Chunk]) -> None:
        chunk_list = list(chunks)
        if not chunk_list:
            return
        document_id = chunk_list[0].document_id
        
        async with self.async_session() as session:
            await session.execute(delete(ChunkModel).where(ChunkModel.document_id == document_id))
            
            for chunk in chunk_list:
                new_chunk = ChunkModel(
                    id=chunk.id,
                    document_id=chunk.document_id,
                    content=chunk.content,
                    metadata_json=json.dumps(chunk.metadata.model_dump()),
                    embedding=chunk.embedding,
                    created_at=chunk.created_at
                )
                session.add(new_chunk)
            await session.commit()

    async def load_chunk_texts(self, role: Optional[str] = None) -> List[Tuple[str, str]]:
        async with self.async_session() as session:
            result = await session.execute(select(ChunkModel))
            db_chunks = result.scalars().all()
            
            results = []
            for chunk in db_chunks:
                if role:
                    metadata = json.loads(chunk.metadata_json)
                    extra = metadata.get("extra", {})
                    if extra.get("role") != role:
                        continue
                results.append((chunk.id, chunk.content))
            return results

    async def load_chunks(self, chunk_ids: List[str]) -> List[Chunk]:
        if not chunk_ids:
            return []
        
        async with self.async_session() as session:
            result = await session.execute(select(ChunkModel).where(ChunkModel.id.in_(chunk_ids)))
            db_chunks = result.scalars().all()
            
            chunks = []
            for c in db_chunks:
                chunks.append(Chunk(
                    id=c.id,
                    document_id=c.document_id,
                    content=c.content,
                    metadata=ChunkMetadata.model_validate_json(c.metadata_json),
                    created_at=c.created_at
                ))
            return chunks

    async def load_documents(self, document_ids: List[str]) -> List[Document]:
        if not document_ids:
            return []
        
        async with self.async_session() as session:
            result = await session.execute(select(DocumentModel).where(DocumentModel.id.in_(document_ids)))
            db_docs = result.scalars().all()
            
            documents = []
            for d in db_docs:
                documents.append(Document(
                    id=d.id,
                    title=d.title,
                    metadata=DocumentMetadata.model_validate_json(d.metadata_json),
                    created_at=d.created_at,
                    updated_at=d.updated_at
                ))
            return documents

    async def load_all_documents(self) -> List[Document]:
        async with self.async_session() as session:
            result = await session.execute(select(DocumentModel).order_by(DocumentModel.created_at.desc()))
            db_docs = result.scalars().all()
            
            documents = []
            for d in db_docs:
                documents.append(Document(
                    id=d.id,
                    title=d.title,
                    metadata=DocumentMetadata.model_validate_json(d.metadata_json),
                    created_at=d.created_at,
                    updated_at=d.updated_at
                ))
            return documents

    async def delete_document(self, document_id: str) -> None:
        async with self.async_session() as session:
            await session.execute(delete(ChunkModel).where(ChunkModel.document_id == document_id))
            await session.execute(delete(DocumentModel).where(DocumentModel.id == document_id))
            await session.commit()
