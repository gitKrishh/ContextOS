# ContextOS // Master Deployment Guide

This document provides a comprehensive roadmap for deploying the ContextOS RAG infrastructure in production, including cloud hosting, manual setup, and containerized orchestration.

---

## 🛠️ Architecture Overview
ContextOS is a 3-tier system:
1.  **Frontend**: React (Vite) + Framer Motion.
2.  **Backend**: FastAPI + Python (Llama 4 / NVIDIA NIM).
3.  **Data Layer**: PostgreSQL (pgvector) + Redis (Cache).

---

## 🐳 Docker Deployment (Recommended)

The fastest way to run the entire stack is using Docker Compose.

### 1. Prerequisites
- Docker & Docker Compose installed.
- Your `NVIDIA_API_KEY` ready.

### 2. Launching the Stack
From the project root, run:
```bash
# Set your API key for the session
export NVIDIA_API_KEY=your_key_here

# Build and start all services
docker-compose up --build
```
The system will be available at:
- **Frontend Console**: `http://localhost`
- **AI Service API**: `http://localhost:8000`

---

## ☁️ Cloud Deployment (Step-by-Step)

### 1. Database: Supabase / Managed Postgres
1.  **Create Project**: Start a new project on [Supabase.com](https://supabase.com).
2.  **Enable Vector**: Run `CREATE EXTENSION IF NOT EXISTS vector;` in the SQL Editor.
3.  **Connection URI**: Copy the connection string for the next step.

### 2. Backend: Vercel (Serverless) / Railway
#### Option A: Vercel (New!)
1.  **Import**: Select the `ContextOS` repo and set the Root Directory to `ai-service`.
2.  **Configuration**: Vercel will detect the `vercel.json` I created.
3.  **Env Variables**:
    - `DATABASE_URL`: Your Supabase connection string.
    - `NVIDIA_API_KEY`: Your model API key.
    - `CHAT_MODEL`: `meta/llama-4-maverick-17b-128e-instruct`
4.  **Important**: Vercel Hobby plan has a **10s timeout**. If the LLM takes longer than 10s to start streaming, the request will fail. For long-form RAG, Railway is recommended for its persistent execution.

#### Option B: Render (Preferred for RAG)
1.  **Create Service**: Go to [Render.com](https://render.com) and click **New -> Web Service**.
2.  **Connect Repo**: Select the `ContextOS` repository.
3.  **Settings**:
    - **Root Directory**: `ai-service`
    - **Runtime**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4.  **Env Variables**:
    - `DATABASE_URL`: Your Supabase connection string.
    - `NVIDIA_API_KEY`: Your model API key.
    - `CHAT_MODEL`: `meta/llama-4-maverick-17b-128e-instruct`
5.  **Why Render?**: Unlike Vercel, Render is a persistent "Web Service," meaning it won't timeout during long AI generations.

#### Option C: Railway
1.  **Source**: Connect your GitHub repository.
2.  **Root Directory**: `ai-service`.
3.  **Env Variables**: (Same as above).
4.  **Networking**: Generate a public domain (e.g., `https://api.contextos.com`).

### 3. Frontend: Vercel / Netlify
1.  **Source**: Connect the same GitHub repository.
2.  **Root Directory**: `frontend`.
3.  **Env Variables**:
    - `VITE_API_BASE_URL`: Your Backend URL from the previous step.
4.  **Deploy**: Vercel will build and provide your final production URL.

---

## 🔐 Production Checklist

- [ ] **Security**: Ensure all `DATABASE_URL` strings use `sslmode=require` in production.
- [ ] **Secrets**: Never commit `.env` files to version control. Use provider-level secret management.
- [ ] **CORS**: Update the `CORSMiddleware` in `ai-service/main.py` to allow only your frontend domain.
- [ ] **Rate Limiting**: Add an IP-based rate limiter to the API to protect your model token budget.

---

Built for **Infrastructure-Grade RAG** // [ContextOS Repository](https://github.com/gitKrishh/ContextOS)
