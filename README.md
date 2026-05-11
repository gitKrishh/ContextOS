# ContextOS

<div align="center">

### Production-Style Retrieval Infrastructure for Grounded AI Systems

ContextOS is an observability-first Retrieval-Augmented Generation (RAG) platform focused on hybrid retrieval, grounded generation, retrieval transparency, and evaluation-driven AI pipelines.

<br/>

![ContextOS Banner](https://camo.githubusercontent.com/e2dc5d1da6268245e278bb05fb04a47ad8a0b82633ae208352eed25f677312f4/68747470733a2f2f696d616765732e756e73706c6173682e636f6d2f70686f746f2d313633393332323533373232382d6637313064383436333130613f6175746f3d666f726d6174266669743d63726f7026713d383026773d32303030)

<br/>

![React](https://img.shields.io/badge/Frontend-React-111111?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-111111?style=for-the-badge&logo=fastapi)
![Redis](https://img.shields.io/badge/Cache-Redis-111111?style=for-the-badge&logo=redis)
![Postgres](https://img.shields.io/badge/Database-PostgreSQL-111111?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Infra-Docker-111111?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-111111?style=for-the-badge)

<br/>
<br/>

[Architecture](#architecture) •
[Features](#core-features) •
[Pipeline](#retrieval-pipeline) •
[Screenshots](#screenshots) •
[Setup](#local-development)

</div>

---

# Overview

Most RAG projects stop at:
- PDF upload
- vector search
- chatbot wrappers

ContextOS focuses on the engineering side of retrieval systems:
- hybrid retrieval pipelines
- cross-encoder reranking
- grounded generation
- retrieval observability
- semantic chunking
- latency optimization
- evaluation-driven retrieval tuning

The platform is designed to make AI systems:
- measurable
- inspectable
- grounded
- retrieval-aware
- infrastructure-oriented

---

# Screenshots

## Landing Experience

<div align="center">
  <img src="./public/screenshots/Screenshot 2026-05-11 at 8.02.20 PM.png" width="100%" />
</div>

<br/>

## Document Ingestion Pipeline

<div align="center">
  <img src="./public/screenshots/Screenshot 2026-05-11 at 8.05.06 PM.png" width="100%" />
</div>

<br/>

## Intelligence Vault

<div align="center">
  <img src="./public/screenshots/Screenshot 2026-05-11 at 8.05.40 PM.png" width="100%" />
</div>

<br/>

## Retrieval Playground

<div align="center">
  <img src="./public/screenshots/Screenshot 2026-05-11 at 8.07.30 PM.png" width="100%" />
</div>

<br/>

## Observability & Analytics

<div align="center">
  <img src="./public/screenshots/Screenshot 2026-05-11 at 8.11.17 PM.png" width="100%" />
</div>

---

# Architecture

```text
Frontend (React)
        ↓
Gateway API (Node.js / Fastify)
        ↓
AI Service (FastAPI)
        ↓
Hybrid Retrieval Pipeline
(Dense + Sparse Search)
        ↓
Cross-Encoder Reranking
        ↓
LLM Generation
        ↓
Streaming Response + Citations
```

---

# Core Features

| System | Description |
|---|---|
| Hybrid Retrieval | Combines dense vector retrieval + BM25 sparse search |
| Cross-Encoder Reranking | Refines retrieval quality before generation |
| Semantic Chunking | Context-aware document segmentation |
| Streaming Responses | Real-time grounded answer streaming |
| Observability | Retrieval telemetry + latency tracking |
| Evaluation Pipeline | Precision, faithfulness, hallucination analysis |
| Citation Mapping | Source-linked grounded responses |
| Retrieval Debugging | Inspect retrieved chunks and rerank movement |

---

# Retrieval Pipeline

## 1. Document Ingestion

Documents are:
- parsed
- normalized
- chunked
- embedded
- indexed

Supported formats:
- PDF
- DOCX
- TXT

---

## 2. Embedding Generation

Embeddings are generated using:
- SentenceTransformers
- OpenAI embedding models

Stored in:
- FAISS vector indexes

---

## 3. Hybrid Retrieval

Queries execute through:
- dense semantic retrieval
- sparse lexical retrieval

Merged using:
- Reciprocal Rank Fusion (RRF)

---

## 4. Cross-Encoder Reranking

Retrieved chunks are reranked using cross-encoder models to improve contextual relevance and reduce noisy retrieval candidates.

---

## 5. Grounded Generation

The final response is generated using:
- retrieved context
- grounded prompting
- streaming generation
- citation mapping

---

# Observability Layer

ContextOS exposes retrieval internals through dedicated telemetry panels.

Tracked metrics include:
- retrieval latency
- reranking latency
- cache hit rate
- token usage
- retrieval scores
- grounded citations
- pipeline timings

---

# Evaluation System

The platform includes evaluation tooling for:
- retrieval precision
- faithfulness
- hallucination tracking
- latency benchmarking
- token efficiency

Built to support:
- benchmark datasets
- iterative retrieval tuning
- measurable RAG optimization

---

# Frontend System

The frontend is designed as:
> an AI infrastructure dashboard

Inspired by:
- Vercel
- Linear
- Datadog
- Grafana
- Perplexity

Core UI systems:
- retrieval visualization
- telemetry dashboards
- streaming playground
- benchmark analytics
- observability panels
- citation inspection

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TailwindCSS, Framer Motion |
| State Management | Zustand, React Query |
| Backend Gateway | Node.js, Fastify |
| AI Service | FastAPI, PyTorch |
| Retrieval | FAISS, BM25 |
| Reranking | Cross-Encoder (MS-MARCO MiniLM) |
| Database | PostgreSQL |
| Cache | Redis |
| Infrastructure | Docker, Docker Compose |
| Auth | Supabase Auth (WIP) |

---

# Example Metrics

| Metric | Target |
|---|---|
| Retrieval Latency | <500ms |
| End-to-End Response | <1.5s |
| Cache Hit Rate | >60% |
| Retrieval Precision | >85% |

> Metrics are currently measured on local benchmark datasets and are still being refined.

---

# Project Structure

```text
ContextOS/
├── frontend/
├── gateway/
├── ai-service/
├── infra/
├── benchmark_datasets/
└── public/screenshots/
```

---

# Local Development

## AI Service

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Gateway

```bash
cd gateway
npm install
npm run dev
```

---

# Roadmap

## Retrieval
- [ ] Multi-query retrieval
- [ ] Metadata filtering
- [ ] Adaptive top-k retrieval
- [ ] Context compression

---

## Evaluation
- [ ] Automated hallucination scoring
- [ ] Benchmark analytics dashboard
- [ ] Retrieval regression testing

---

## Frontend
- [ ] Retrieval trace visualization
- [ ] Live latency waterfall charts
- [ ] Advanced observability panels
- [ ] Streaming telemetry graphs

---

## Infrastructure
- [ ] Secure multi-user isolation
- [ ] Distributed vector indexing
- [ ] Retrieval worker scaling
- [ ] Production deployment pipelines

---

# Why ContextOS?

ContextOS is designed to explore:
- retrieval engineering
- grounded generation
- observability-first AI systems
- evaluation-driven RAG pipelines
- scalable AI infrastructure

rather than functioning as a basic chatbot wrapper.

---

# Author

Built by [gitKrishh](https://github.com/gitKrishh)

Focused on:
- AI infrastructure
- retrieval systems
- observability-first applications
- grounded AI pipelines
- scalable RAG architectures