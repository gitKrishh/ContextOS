import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, SendHorizontal, Trash2, ShieldAlert, Loader2, FileCode2,
  Box, RefreshCw, X, Database, CloudUpload, Shield, Settings, Server,
  Terminal, Search, Cpu, Activity
} from 'lucide-react';
import { Sidebar, Header } from './components/Layout';
import { RetrievalInspector, DebugMetrics } from './components/Playground';
import { AnalyticsDashboard } from './components/Analytics';
import { Hero } from './components/Hero';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface Message {
  role: 'user' | 'ai';
  content: string;
  citations?: any[];
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('contextos_initialized') === 'true' ? 'playground' : 'hero';
  });

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingSession, setRenamingSession] = useState<{ id: string, title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Vault Data
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Multi-Chat State (Backend Driven)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chatQuery, setChatQuery] = useState("");

  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [lastMetrics, setLastMetrics] = useState<any>(null);
  const [activeModel, setActiveModel] = useState<string>("Initializing...");
  const [isChatting, setIsChatting] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [metrics, setMetrics] = useState<any>(null);
  const [obsLogs, setObsLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== 'hero') {
      localStorage.setItem('contextos_initialized', 'true');
    }
  }, [activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If we're within 100px of the bottom, we consider it "near bottom"
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(isAtBottom);
  };

  useEffect(() => {
    const scrollToBottom = () => {
      chatEndRef.current?.scrollIntoView({ behavior: isChatting ? 'smooth' : 'auto', block: 'end' });
    };
    
    // Immediate scroll
    scrollToBottom();
    // Delayed scroll to handle layout shifts/Framer Motion animations
    const timer = setTimeout(scrollToBottom, 50);
    const timer2 = setTimeout(scrollToBottom, 250);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [streamingResponse, chatHistory.length, activeSessionId]);

  // --- Backend API Syncing ---
  const fetchAllData = async () => {
    if (activeTab === 'hero') return;
    try {
      setIsLoadingDocs(true);
      const [mRes, oRes, dRes, sRes] = await Promise.all([
        fetch(`${DEFAULT_API_BASE}/api/v1/evaluation/stats`),
        fetch(`${DEFAULT_API_BASE}/api/v1/observability/logs`),
        fetch(`${DEFAULT_API_BASE}/api/v1/ingestion/documents`),
        fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions`)
      ]);

      const mData = await mRes.json();
      setMetrics(mData.stats);

      const oData = await oRes.json();
      setObsLogs(oData.logs);

      const dData = await dRes.json();
      setDocuments(dData.documents || []);

      const sData = await sRes.json();
      if (sData.success) {
        setChatSessions(sData.sessions);
      }
    } catch (e) {
      console.error("Data sync failed:", e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Initial session selection - only runs once when chatSessions are loaded
  useEffect(() => {
    if (activeTab === 'playground' && !activeSessionId && chatSessions.length > 0) {
      handleSessionSelect(chatSessions[0].id);
    }
  }, [chatSessions.length, activeTab]);

  // Fetch messages when active session changes
  const handleSessionSelect = async (id: string) => {
    setActiveSessionId(id);
    setActiveTab('playground');
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions/${id}/messages`);
      const data = await res.json();
      if (data.success) {
        setChatHistory(data.messages);
      }
    } catch (e) {
      console.error("Failed to fetch session messages");
    }
  };

  const handleNewSession = async () => {
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "New Conversation" })
      });
      const data = await res.json();
      if (data.success) {
        setChatSessions(prev => [{ id: data.session_id, title: data.title, created_at: new Date().toISOString() }, ...prev]);
        setActiveSessionId(data.session_id);
        setChatHistory([]);
        setActiveTab('playground');
        setRetrievedChunks([]);
        setLastMetrics(null);
      }
    } catch (e) {
      setError("Failed to create new session in database");
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChatSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
          const remaining = chatSessions.filter(s => s.id !== id);
          if (remaining.length > 0) {
            handleSessionSelect(remaining[0].id);
          } else {
            handleNewSession();
          }
        }
      }
    } catch (e) {
      setError("Failed to delete chat session");
    }
  };

  const handleRenameSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingSession || !newTitle.trim()) return;
    
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions/${renamingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setChatSessions(prev => prev.map(s => s.id === renamingSession.id ? { ...s, title: newTitle } : s));
        setShowRenameModal(false);
        setRenamingSession(null);
        setNewTitle("");
      }
    } catch (e) {
      setError("Failed to rename chat session");
    }
  };

  const clearAllChats = async () => {
    try {
      for (const session of chatSessions) {
        await fetch(`${DEFAULT_API_BASE}/api/v1/chat/sessions/${session.id}`, { method: 'DELETE' });
      }
      setChatSessions([]);
      handleNewSession();
      setShowSettingsModal(false);
    } catch (e) {
      setError("Failed to clear chats from database");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus("Ingesting stream...");

    const formData = new FormData();
    formData.append("file", file);
    if (customTitle) {
      formData.append("title", customTitle);
    }

    try {
      const res = await fetch(`${DEFAULT_API_BASE}/api/v1/ingestion/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadStatus("Vectorizing embeddings...");
      setUploadProgress(50);

      const poll = setInterval(async () => {
        try {
          const sRes = await fetch(`${DEFAULT_API_BASE}/api/v1/ingestion/status/${data.document.id}`);
          const sData = await sRes.json();
          if (sData.job.status === 'completed') {
            clearInterval(poll);
            setUploadProgress(100);
            setUploadStatus("Index Complete");
            await fetchAllData();
            setTimeout(() => {
              setIsUploading(false);
              setFile(null);
              setCustomTitle("");
              setShowUploadModal(false);
            }, 1000);
          } else if (sData.job.status === 'failed') {
            clearInterval(poll);
            throw new Error(sData.job.error || "Failed");
          }
        } catch (e) { }
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || isChatting || !activeSessionId) return;

    const query = chatQuery;
    setChatQuery("");

    // Optimistic UI Update
    if (chatHistory.length === 0) {
      setChatSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, title: query.length > 25 ? query.substring(0, 25) + '...' : query } : s
      ));
    }
    setChatHistory(prev => [...prev, { role: 'user', content: query }]);

    setIsChatting(true);
    setStreamingResponse("");
    setRetrievedChunks([]);

    let accumulatedContent = "";
    let finalCitations: any[] = [];

    try {
      const response = await fetch(`${DEFAULT_API_BASE}/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: activeSessionId }),
      });

      if (!response.body) throw new Error("No stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === 'identity') {
                setActiveModel(payload.model);
                setRetrievedChunks(payload.citations);
                finalCitations = payload.citations;
              } else if (payload.type === 'token') {
                accumulatedContent += payload.content;
                setStreamingResponse(accumulatedContent);
              } else if (payload.type === 'metrics') {
                setLastMetrics(payload);
                fetchAllData();
              }
            } catch (e) { }
          }
        }
      }

      setChatHistory(prev => [...prev, { role: 'ai', content: accumulatedContent, citations: finalCitations }]);
      setStreamingResponse("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChatting(false);
    }
  };

  if (activeTab === 'hero') {
    return <Hero onInitialize={() => setActiveTab('playground')} />;
  }

  return (
    <div className="retriq-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemHealth={metrics ? {
          hitRate: `${((metrics.avg_hit_rate || 0) * 100).toFixed(2)}%`,
          mrr: (metrics.avg_mrr || 0).toFixed(2)
        } : null}
        onUploadClick={() => setShowUploadModal(true)}
        chatSessions={chatSessions as any}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onDeleteSession={handleDeleteSession}
        onRenameSession={(id, title) => {
          setRenamingSession({ id, title });
          setNewTitle(title);
          setShowRenameModal(true);
        }}
        onNewSession={handleNewSession}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenSecurity={() => setShowSecurityModal(true)}
      />

      <div className="retriq-main">
        <Header title={activeTab === 'playground' ? 'Query Console' : activeTab === 'documents' ? 'Data Vault' : 'System Analytics'} />

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">

            {activeTab === 'playground' && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="playground-grid"
              >
                <RetrievalInspector chunks={retrievedChunks} />

                <div className="panel" style={{ backgroundColor: 'var(--bg-app)' }}>
                  <div 
                    className="panel-content" 
                    onScroll={handleScroll}
                    style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}
                  >
                    {chatHistory.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                      >
                        <Terminal size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                        <h3 className="text-display" style={{ fontSize: '20px', letterSpacing: '-0.5px', marginBottom: '8px', fontWeight: '600' }}>ContextOS Active</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.6' }}>
                          Connected to {activeModel}. Start querying your vectorized vault.
                        </p>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {chatHistory.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                        >
                          <div className={`retriq-card ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`} style={{ maxWidth: '85%', padding: '16px 20px' }}>
                            <div className="prose">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.citations && msg.citations.length > 0 && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {msg.citations.map((c: any, j: number) => (
                                  <div key={j} className="badge badge-primary" style={{ fontSize: '10px', display: 'flex', alignItems: 'center' }}>
                                    <FileCode2 size={12} style={{ marginRight: '6px', color: 'var(--text-muted)' }} />
                                    {c.metadata?.source?.source_name || 'Source'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {(isChatting || streamingResponse) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', justifyContent: 'flex-start' }}
                      >
                        <div className="retriq-card chat-bubble-ai" style={{ maxWidth: '85%', padding: '16px 20px' }}>
                          {streamingResponse ? (
                            <div className="prose">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingResponse}</ReactMarkdown>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div className="thinking-orb"></div>
                              <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Grounding Engine...</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="chat-input-wrapper" style={{ background: 'var(--bg-app)', padding: '24px', borderTop: 'none' }}>
                    <form onSubmit={handleChat} style={{ position: 'relative', maxWidth: '850px', margin: '0 auto' }}>
                      <input
                        type="text"
                        placeholder={`Execute query...`}
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        disabled={isChatting}
                        className="retriq-input"
                        style={{ padding: '16px 24px', fontSize: '15px' }}
                      />
                      <button
                        type="submit"
                        disabled={isChatting || !chatQuery.trim()}
                        className="btn-icon"
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px' }}
                      >
                        <SendHorizontal size={16} />
                      </button>
                    </form>
                  </div>
                </div>

                <DebugMetrics
                  metrics={lastMetrics}
                  tokens={streamingResponse.length ? Math.ceil(streamingResponse.length / 4) : 0}
                  modelName={activeModel}
                />
              </motion.div>
            )}

            {activeTab === 'evaluation' && (
              <motion.div
                key="evaluation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="panel-content"
                style={{ overflowY: 'auto', padding: '40px' }}
              >
                <AnalyticsDashboard logs={obsLogs} stats={metrics} />
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                  <div>
                    <h1 className="text-display" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-1px' }}>Intelligence Vault</h1>
                    <p className="text-xs-bold" style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Vectorized Pipeline</p>
                  </div>
                  <button onClick={() => fetchAllData()} className="btn-secondary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', borderRadius: '8px' }}>
                    <RefreshCw size={14} className={isLoadingDocs ? 'animate-spin' : ''} /> Sync Repository
                  </button>
                </div>

                <div className="retriq-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>DOCUMENT NAME</th>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>TYPE</th>
                        <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>STATUS</th>
                        <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.length > 0 ? documents.map(doc => (
                        <tr key={doc.document.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <FileCode2 size={16} style={{ color: 'var(--text-muted)' }} />
                              {doc.document.metadata?.source?.source_name || doc.document.id}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}><span className="badge badge-secondary">{doc.document.metadata?.source?.source_type || 'Unknown'}</span></td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-app)', fontWeight: 800, fontSize: '12px' }}>
                            OS
                          </div>
                              <span className="text-mono" style={{ fontSize: '11px', fontWeight: '600', color: doc.job.status === 'completed' ? 'var(--text-primary)' : 'var(--warning)' }}>
                                {doc.job.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button
                              onClick={async () => {
                                await fetch(`${DEFAULT_API_BASE}/api/v1/ingestion/documents/${doc.document.id}`, { method: 'DELETE' });
                                fetchAllData();
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.15s' }}
                              onMouseOver={(e) => e.currentTarget.style.color = 'var(--error)'}
                              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '60px', textAlign: 'center' }}>
                            <Database size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
                            <p className="text-xs-bold" style={{ color: 'var(--text-secondary)' }}>Vault is Empty</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="glass-panel"
              style={{ width: '480px', padding: '32px', position: 'relative', borderRadius: '16px' }}
            >
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>

              <div style={{ marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-panel)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                          <Terminal size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h2 className="text-display" style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>System Ready</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
                          Execute a query to retrieve grounded data from the vault.
                        </p>
                 <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Upload files to append to your vector index.</p>
              </div>

              <form onSubmit={handleUpload}>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div className="retriq-card retriq-card-hoverable" style={{ border: '1px dashed var(--border-focus)', padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-app)', borderRadius: '12px' }}>
                    <CloudUpload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                      {file ? file.name : "Select Document"}
                    </span>
                    <span className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF, TXT, DOCX</span>
                  </div>
                  <input type="file" style={{ display: 'none' }} onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    if (selected && !customTitle) {
                      setCustomTitle(selected.name);
                    }
                  }} />
                </label>

                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Display Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom title..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="retriq-input"
                    style={{ padding: '12px 16px', fontSize: '14px' }}
                  />
                </div>

                <button type="submit" disabled={!file || isUploading} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '14px', fontSize: '14px', fontWeight: '600', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {isUploading && <Loader2 size={16} className="animate-spin" />}
                  {isUploading ? uploadStatus.toUpperCase() : "START UPLOAD"}
                </button>

                {isUploading && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      <span>{uploadStatus}</span>
                      <span className="text-mono">{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--text-primary)', transition: 'width 0.3s' }}></div>
                    </div>
                  </motion.div>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-overlay">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="glass-panel" style={{ width: '400px', padding: '32px', borderRadius: '16px', position: 'relative' }}>
              <button onClick={() => setShowRenameModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14} /></button>
              
              <div style={{ marginBottom: '24px' }}>
                <h2 className="text-display" style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Rename Conversation</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Give your chat session a more descriptive name.</p>
              </div>

              <form onSubmit={handleRenameSession}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Session Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    className="retriq-input"
                    style={{ padding: '14px 16px' }}
                    placeholder="e.g. Analysis of Q3 Reports"
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: '600' }}>
                  SAVE CHANGES
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-overlay">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel" style={{ width: '400px', padding: '32px', borderRadius: '16px', position: 'relative' }}>
              <button onClick={() => setShowSettingsModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Settings size={20} />
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Settings</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="retriq-card" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>API Endpoint</p>
                  <p className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{DEFAULT_API_BASE}</p>
                </div>
                <div className="retriq-card" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Data Management</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Clear all database chat history threads.</p>
                  <button onClick={clearAllChats} className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '12px', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Clear All DB Chats</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Modal */}
      <AnimatePresence>
        {showSecurityModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-overlay">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel" style={{ width: '400px', padding: '32px', borderRadius: '16px', position: 'relative' }}>
              <button onClick={() => setShowSecurityModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Shield size={20} style={{ color: 'var(--success)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Security Protocol</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="retriq-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                  <Server size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600' }}>Database Engine</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SQLite 3 / FAISS Local Vector</p>
                  </div>
                </div>
                <div className="retriq-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                  <Shield size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600' }}>Encryption</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AES-256 Vector Indexing Active.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-panel"
            style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: 'var(--error)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '8px', zIndex: '3000', boxShadow: 'var(--shadow-lg)' }}
          >
            <ShieldAlert size={18} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', marginLeft: '8px', opacity: 0.8 }}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
