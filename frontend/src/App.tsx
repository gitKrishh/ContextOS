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

  const status = statusResult?.job || uploadResult?.job;

  return (
    <div className="page">
      <header className="header">
        <h1>ContextOS Ingestion Tester</h1>
        <p>Upload a document and watch the ingestion status update.</p>
      </header>

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
          <label className="field">
            Source URI (optional)
            <input value={sourceUri} onChange={(event) => setSourceUri(event.target.value)} />
          </label>
          <button type="submit" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="row">
          <h2>Ingestion Status</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={isPolling}
              onChange={(event) => setIsPolling(event.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
        {status ? (
          <div className="status">
            <p>
              <strong>Document ID:</strong> {status.document_id}
            </p>
            <p>
              <strong>Status:</strong> {status.status}
            </p>
            <p>
              <strong>Attempts:</strong> {status.attempts} / {status.max_attempts}
            </p>
            {status.error_message ? (
              <p className="error">
                <strong>Error:</strong> {status.error_message}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="muted">No ingestion job yet.</p>
        )}
      </section>

      <section className="card">
        <div className="row">
          <h2>Documents</h2>
          <button type="button" onClick={handleList}>
            Refresh list
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="muted">No documents loaded.</p>
        ) : (
          <ul className="list">
            {documents.map((entry) => (
              <li key={entry.document.id}>
                <div>
                  <strong>{entry.document.title || entry.document.metadata.source.source_name}</strong>
                  <span className="meta">{entry.document.id}</span>
                </div>
                <div className="meta">
                  {entry.job.status} • {entry.document.metadata.source.source_type}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}
