import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Database, 
  Search, 
  Cpu, 
  Shield, 
  Activity, 
  UploadCloud, 
  FileCode2, 
  ChevronRight, 
  Clock3, 
  Layers3, 
  Binary,
  Box,
  Terminal,
  BarChart3,
  Globe,
  Settings,
  Server,
  Zap
} from 'lucide-react';

interface HeroProps {
  onInitialize: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const Hero = ({ onInitialize }: HeroProps) => {
  return (
    <div
      style={{
        width: '100%',
        background: 'var(--bg-app)',
        position: 'relative',
        overflowX: 'hidden',
        color: 'var(--text-primary)'
      }}
    >
      {/* INDUSTRIAL GRID */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* HEADER SECTION */}
      <section style={{ minHeight: '90vh', padding: '64px', position: 'relative', zIndex: 1, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--text-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={24} style={{ color: 'var(--bg-app)' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>ContextOS</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Data Infrastructure v4.2</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <button className="nav-link" style={{ fontSize: '12px', width: 'auto', fontWeight: 600 }}>SYSTEM_LOGS</button>
            <button className="nav-link" style={{ fontSize: '12px', width: 'auto', fontWeight: 600 }}>API_SPEC</button>
            <button className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>ACCESS_PORTAL</button>
          </div>
        </div>

        <div style={{ maxWidth: '1200px' }}>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.1} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '32px', background: 'var(--bg-card)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            <Terminal size={12} />
            STATUS: SYSTEM_READY // LATENCY: 14ms // UPTIME: 99.99%
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={0.2} style={{ fontSize: '92px', lineHeight: 0.85, letterSpacing: '-6px', fontWeight: 800, marginBottom: '32px' }}>
            Retrieval <br/> Optimization <br/> Infrastructure.
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0.3} style={{ fontSize: '20px', lineHeight: 1.5, color: 'var(--text-secondary)', maxWidth: '640px', marginBottom: '56px', fontWeight: 400 }}>
            Standardize your RAG pipelines with high-throughput ingestion, hybrid scoring, and deterministic retrieval metrics.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.4} style={{ display: 'flex', gap: '20px' }}>
            <button onClick={onInitialize} className="btn-primary" style={{ padding: '20px 40px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Initialize System <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" style={{ padding: '20px 40px', borderRadius: '4px', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Architecture_Map
            </button>
          </motion.div>
        </div>
      </section>

      {/* CORE SPECS SECTION */}
      <section style={{ padding: '100px 64px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
          {[
            { label: 'VECTOR_DIMENSIONS', value: '1536', icon: Database },
            { label: 'HYBRID_LATENCY', value: '12ms', icon: Zap },
            { label: 'THROUGHPUT_MAX', value: '4.2k/s', icon: Activity },
            { label: 'SYSTEM_UPTIME', value: '100%', icon: Shield },
          ].map((spec, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.1} style={{ background: 'var(--bg-app)', padding: '40px' }}>
              <spec.icon size={20} style={{ color: 'var(--text-muted)', marginBottom: '20px' }} />
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{spec.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 800 }}>{spec.value}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PIPELINE ARCHITECTURE */}
      <section style={{ padding: '120px 64px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '100px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '24px' }}>Deterministic <br/> Retrieval.</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '40px' }}>
              ContextOS moves beyond "best-effort" AI. Our retrieval engine uses cross-encoder reranking and Reciprocal Rank Fusion (RRF) to provide reproducible, high-fidelity data grounding for your production systems.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['PostgreSQL Vector Engine', 'Cross-Encoder Reranking', 'BM25 Lexical Search', 'Metadata Filtering'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-primary)' }}></div>
                  {item.toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px', padding: '40px' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>PIPELINE_VISUALIZER</div>
              <div className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STREAM_ACTIVE</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'INGEST', progress: 100, status: 'DONE' },
                { label: 'EMBED', progress: 100, status: 'DONE' },
                { label: 'RETRIEVE', progress: 100, status: 'DONE' },
                { label: 'RERANK', progress: 85, status: 'BUSY' },
                { label: 'SYNTHESIZE', progress: 0, status: 'WAIT' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 0' }}>
                  <div style={{ width: '100px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{step.label}</div>
                  <div style={{ flex: 1, height: '4px', background: 'var(--bg-panel)', position: 'relative' }}>
                    <div style={{ position: 'absolute', height: '100%', width: `${step.progress}%`, background: 'var(--text-primary)' }}></div>
                  </div>
                  <div className="text-mono" style={{ width: '60px', fontSize: '11px', textAlign: 'right' }}>{step.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>
        <div>© 2026 CONTEXTOS_INFRASTRUCTURE</div>
        <div style={{ display: 'flex', gap: '40px' }}>
          <span>PRIVACY.LOG</span>
          <span>TERMS.TXT</span>
          <span>SYSTEM_STATUS</span>
        </div>
      </footer>
    </div>
  );
};