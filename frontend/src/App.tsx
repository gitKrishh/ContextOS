import { useEffect, useMemo, useState } from "react";

type SourceMetadata = {
  source_type: string;
  source_name: string;
  source_uri?: string | null;
  source_path?: string | null;
};

type DocumentMetadata = {
  source: SourceMetadata;
  tags: string[];
  extra: Record<string, unknown>;
};

type Document = {
  id: string;
  title?: string | null;
  metadata: DocumentMetadata;
  created_at: string;
  updated_at: string;
};

type IngestionJob = {
  id: string;
  document_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
};

type UploadResponse = {
  success: boolean;
  request_id: string;
  document: Document;
  job: IngestionJob;
};

type DocumentStatus = {
  document: Document;
  job: IngestionJob;
};

type StatusResponse = {
  success: boolean;
  request_id: string;
  document: Document;
  job: IngestionJob;
};

type ListResponse = {
  success: boolean;
  request_id: string;
  documents: DocumentStatus[];
};

type SearchRequest = {
  query: string;
  top_k: number;
  dense_weight: number;
  sparse_weight: number;
};

type SearchResult = {
  chunk: Chunk;
  score: float;
};

type Chunk = {
  id: string;
  document_id: string;
  content: string;
  metadata: any;
  created_at: string;
};

type SearchResponse = {
  success: boolean;
  request_id: string;
  query: string;
  results: SearchResult[];
};

const DEFAULT_API_BASE = "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error || body?.detail || response.statusText;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const baseUrl = useMemo(() => apiBase.replace(/\/$/, ""), [apiBase]);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUri, setSourceUri] = useState("");

  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [statusResult, setStatusResult] = useState<StatusResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [denseWeight, setDenseWeight] = useState(1.0);
  const [sparseWeight, setSparseWeight] = useState(1.0);
  const [useReranker, setUseReranker] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [citations, setCitations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  const documentId = uploadResult?.document.id || statusResult?.document.id || "";

  useEffect(() => {
    if (!documentId || !isPolling) {
      return;
    }

    let isMounted = true;
    const interval = setInterval(() => {
      fetchStatus().catch(() => undefined);
    }, 2000);

    fetchStatus().catch(() => undefined);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };

    async function fetchStatus() {
      if (!isMounted || !documentId) {
        return;
      }
      try {
        const data = await fetchJson<StatusResponse>(
          `${baseUrl}/api/v1/ingestion/status/${documentId}`
        );
        setStatusResult(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      }
    }
  }, [baseUrl, documentId, isPolling]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Please choose a file");
      return;
    }
    setIsUploading(true);
    setError(null);
    setStatusResult(null);

    const form = new FormData();
    form.append("file", file);
    if (title.trim()) {
      form.append("title", title.trim());
    }
    if (tags.trim()) {
      form.append("tags", tags.trim());
    }
    if (sourceUri.trim()) {
      form.append("source_uri", sourceUri.trim());
    }

    try {
      const data = await fetchJson<UploadResponse>(`${baseUrl}/api/v1/ingestion/upload`, {
        method: "POST",
        body: form
      });
      setUploadResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleList = async () => {
    setError(null);
    try {
      const data = await fetchJson<ListResponse>(`${baseUrl}/api/v1/ingestion/documents`);
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }
    setIsSearching(true);
    setError(null);

    try {
      const data = await fetchJson<SearchResponse>(`${baseUrl}/api/v1/retrieval/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          top_k: topK,
          dense_weight: denseWeight,
          sparse_weight: sparseWeight,
          use_reranker: useReranker
        })
      });
      setSearchResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatQuery.trim()) {
      return;
    }
    setIsChatting(true);
    setChatResponse("");
    setCitations([]);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: chatQuery,
          top_k: topK,
          use_reranker: useReranker,
          dense_weight: denseWeight,
          sparse_weight: sparseWeight
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              setIsChatting(false);
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "token") {
                setChatResponse((prev) => prev + data.content);
              } else if (data.type === "citations") {
                setCitations(data.chunks);
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setIsChatting(false);
    }
  };

  const handleFetchMetrics = async () => {
    try {
      const data = await fetchJson<any>(`${baseUrl}/api/v1/evaluation/stats`);
      setMetrics(data.stats);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
    }
  };

  const status = statusResult?.job || uploadResult?.job;

  return (
    <div className="page">
      <header className="header">
        <h1>ContextOS Tester</h1>
        <p>Upload documents and test hybrid retrieval results.</p>
      </header>

      <div className="grid">
        <div className="stack">
          <section className="card">
            <h2>API Settings</h2>
            <label className="field">
              API Base URL
              <input
                type="text"
                value={apiBase}
                onChange={(event) => setApiBase(event.target.value)}
                placeholder="http://localhost:8000"
              />
            </label>
          </section>

          <section className="card">
            <h2>Upload Document</h2>
            <form onSubmit={handleUpload} className="stack">
              <label className="field">
                File
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
              <label className="field">
                Title (optional)
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field">
                Tags (comma separated)
                <input value={tags} onChange={(event) => setTags(event.target.value)} />
              </label>
              <button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="row">
              <h2>Documents</h2>
              <button type="button" onClick={handleList}>
                Refresh
              </button>
            </div>
            {documents.length === 0 ? (
              <p className="muted">No documents.</p>
            ) : (
              <ul className="list">
                {documents.map((entry) => (
                  <li key={entry.document.id}>
                    <div>
                      <strong>{entry.document.title || entry.document.metadata.source.source_name}</strong>
                      <span className="meta">{entry.job.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2>Hybrid Retrieval Search</h2>
            <form onSubmit={handleSearch} className="stack">
              <label className="field">
                Query
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Enter search query..." 
                />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  Top K
                  <input type="number" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  Dense W
                  <input type="number" step="0.1" value={denseWeight} onChange={(e) => setDenseWeight(parseFloat(e.target.value))} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  Sparse W
                  <input type="number" step="0.1" value={sparseWeight} onChange={(e) => setSparseWeight(parseFloat(e.target.value))} />
                </label>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={useReranker}
                  onChange={(e) => setUseReranker(e.target.checked)}
                />
                Use Reranker (Phase 3)
              </label>
              <button type="submit" disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>Results</h2>
            {searchResults.length === 0 ? (
              <p className="muted">No search results.</p>
            ) : (
              <ul className="list">
                {searchResults.map((res, i) => (
                  <li key={i} className="result-item">
                    <div className="row">
                      <span className="score">Score: {res.score.toFixed(4)}</span>
                      <span className="meta">ID: {res.chunk.id}</span>
                    </div>
                    <p className="content">{res.chunk.content}</p>
                    <div className="meta">
                      Source: {res.chunk.metadata.source.source_name} (Chunk: {res.chunk.metadata.chunk_index})
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="card" style={{ marginTop: "2rem" }}>
        <h2>💬 Contextual Chat (Phase 4)</h2>
        <form onSubmit={handleChat} className="chat-form">
          <input
            type="text"
            placeholder="Ask a question based on your documents..."
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            disabled={isChatting}
            style={{ width: "100%", padding: "0.8rem", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #ddd" }}
          />
          <button type="submit" disabled={isChatting} style={{ width: "100%" }}>
            {isChatting ? "Thinking..." : "Ask Question"}
          </button>
        </form>
        
        {chatResponse && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {chatResponse}
            </div>
            {citations.length > 0 && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.5rem" }}>
                <h4 style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: "#666" }}>Sources:</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.85rem", color: "#888" }}>
                  {citations.map((c, i) => (
                    <li key={i}>[{c.id}] {c.metadata.source?.source_name || "Unknown Source"}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: "2rem" }}>
        <div className="row">
          <h2>📊 Evaluation Metrics (Phase 5)</h2>
          <button type="button" onClick={handleFetchMetrics}>Refresh Stats</button>
        </div>
        {metrics ? (
          <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <div className="metric-card" style={{ padding: "1rem", backgroundColor: "#f0f7ff", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Total Evaluations</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#007bff" }}>{metrics.total_evals}</div>
            </div>
            <div className="metric-card" style={{ padding: "1rem", backgroundColor: "#f0fff4", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Avg Hit Rate</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#28a745" }}>{metrics.avg_hit_rate}</div>
            </div>
            <div className="metric-card" style={{ padding: "1rem", backgroundColor: "#fff9f0", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Avg MRR</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fd7e14" }}>{metrics.avg_mrr}</div>
            </div>
          </div>
        ) : (
          <p className="muted">No metrics available. Try chatting or searching first.</p>
        )}
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}
