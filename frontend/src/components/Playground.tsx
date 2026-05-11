import React from 'react';
import { 
  Database, 
  Search, 
  Activity, 
  Cpu, 
  Clock, 
  Layers,
  ExternalLink,
  Code2
} from 'lucide-react';

export const RetrievalInspector = ({ chunks }: { chunks: any[] }) => {
  return (
    <div className="panel panel-left">
      <div className="panel-header">
        <div className="text-xs-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Database size={14} />
          Retrieval Chunks
        </div>
        <span className="badge badge-primary">{chunks.length} Hits</span>
      </div>
      
      <div className="panel-content">
        {chunks.length > 0 ? chunks.map((chunk, i) => (
          <div key={i} className="retriq-card" style={{ marginBottom: '16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score: {(chunk.score || 0.85).toFixed(4)}</span>
              <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'var(--bg-panel)', padding: '2px 4px', borderRadius: '4px', textTransform: 'uppercase' }}>
                {chunk.metadata?.source_type || 'PDF'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {chunk.metadata?.content || chunk.content || "Chunk content preview..."}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                <Code2 size={10} />
                ID: {chunk.id?.substring(0, 8)}
              </div>
              <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        )) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.3, padding: '24px' }}>
            <Search size={32} style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '12px' }}>Submit a query to inspect vector fragments.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const DebugMetrics = ({ metrics, tokens, modelName }: { metrics: any; tokens?: number; modelName?: string }) => {
  // Use real metrics if available, otherwise show empty state
  const timings = metrics?.breakdown ? [
    { label: 'Embedding', time: `${metrics.breakdown.embedding}ms`, percent: Math.min(100, (metrics.breakdown.embedding / metrics.breakdown.total) * 100) },
    { label: 'Vector Search', time: `${metrics.breakdown.search}ms`, percent: Math.min(100, (metrics.breakdown.search / metrics.breakdown.total) * 100) },
    { label: 'Reranking', time: `${metrics.breakdown.rerank}ms`, percent: Math.min(100, (metrics.breakdown.rerank / metrics.breakdown.total) * 100) },
    { label: 'LLM Synthesis', time: `${metrics.breakdown.llm}ms`, percent: Math.min(100, (metrics.breakdown.llm / metrics.breakdown.total) * 100) },
  ] : [];

  return (
    <div className="panel panel-right">
      <div className="panel-header">
        <div className="text-xs-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Activity size={14} />
          Observability
        </div>
      </div>
      
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <h3 className="text-xs-bold" style={{ color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={12} /> Real Latency Waterfall
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {timings.length > 0 ? timings.map((t, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                  <span className="text-mono" style={{ color: 'var(--primary)', fontWeight: '700' }}>{t.time}</span>
                </div>
                <div className="latency-bar-bg">
                  <div className="latency-bar-fill" style={{ width: `${t.percent}%` }}></div>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                Awaiting request telemetry...
              </p>
            )}
          </div>
        </section>

        <section className="retriq-card" style={{ backgroundColor: 'var(--bg-panel)' }}>
          <h3 className="text-xs-bold" style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={12} /> Consumption
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>{tokens || metrics?.tokens || 0}</span>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tokens</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            System Model: <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{modelName || 'Production Engine'}</span>
          </div>
        </section>

        <section>
          <h3 className="text-xs-bold" style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={12} /> Active Strategy
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mode</span>
              <span className="text-mono" style={{ fontWeight: '700' }}>Hybrid_RAG</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Security</span>
              <span className="text-mono" style={{ fontWeight: '700' }}>AES-256</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
