import { useEffect, useRef, useState } from 'react';
import { Box } from 'lucide-react';

interface HeroProps {
  onInitialize: () => void;
}

export function Hero({ onInitialize }: HeroProps) {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fu = (id: string, extra = '') =>
    `fade-up${visible.has(id) ? ' visible' : ''}${extra ? ' ' + extra : ''}`;

  // ── Scroll escape-hatch ──────────────────────────────────────────────────
  // Overrides any parent container that traps the Hero in a fixed-height box.
  useEffect(() => {
    const targets: Array<{ el: HTMLElement; prop: string; prev: string }> = [];

    const override = (el: HTMLElement, prop: string, value: string) => {
      targets.push({ el, prop, prev: el.style.getPropertyValue(prop) });
      el.style.setProperty(prop, value);
    };

    // Walk up from body and fix every ancestor that clamps scroll
    let node = document.body.parentElement as HTMLElement | null;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
        override(node, 'overflow', 'visible');
        override(node, 'overflow-y', 'visible');
      }
      if (cs.height === '100vh' || cs.maxHeight === '100vh') {
        override(node, 'height', 'auto');
        override(node, 'max-height', 'none');
      }
      node = node.parentElement;
    }

    // Also fix body and html themselves
    for (const root of [document.body, document.documentElement]) {
      override(root, 'height', 'auto');
      override(root, 'overflow', 'visible');
      override(root, 'overflow-y', 'visible');
    }

    return () => {
      // Restore every property we touched, in reverse order
      for (const { el, prop, prev } of targets.reverse()) {
        if (prev) el.style.setProperty(prop, prev);
        else el.style.removeProperty(prop);
      }
    };
  }, []);

  // ── Intersection observer for scroll-reveal ──────────────────────────────
  useEffect(() => {
    setVisible(new Set(['af-eyebrow', 'af-headline', 'af-sub', 'af-actions']));

    const timer = setTimeout(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisible((prev) => new Set([...prev, entry.target.getAttribute('data-id') || '']));
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
      );
      document.querySelectorAll('[data-id]').forEach((el) => observerRef.current?.observe(el));
    }, 80);

    return () => { clearTimeout(timer); observerRef.current?.disconnect(); };
  }, []);

  // ── Pipeline step cycler ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setActiveStep((p) => (p + 1) % 5), 1800);
    return () => clearInterval(interval);
  }, []);

  const pipelineSteps = [
    { icon: '↑', label: 'Document ingestion' },
    { icon: '⌁', label: 'Semantic chunking' },
    { icon: '⊕', label: 'Hybrid retrieval' },
    { icon: '≋', label: 'Cross-encoder rerank' },
    { icon: '◈', label: 'Grounded generation' },
  ];

  const features = [
    { symbol: 'V', title: 'FAISS vector search', desc: 'Dense retrieval over high-dimensional embeddings for semantic similarity at scale.' },
    { symbol: 'B', title: 'BM25 sparse retrieval', desc: 'Keyword-level precision that catches exact terms dense retrieval misses.' },
    { symbol: 'R', title: 'Cross-encoder reranking', desc: 'Neural reranker scores candidate chunks pairwise against the query for tighter context selection.' },
    { symbol: '⚡', title: 'Redis response cache', desc: 'Warm cache layer cuts repeat-query latency by up to 10× without hitting the LLM.' },
    { symbol: '~', title: 'Streaming inference', desc: 'Token-level streaming via SSE — responses appear immediately, no waiting for full completion.' },
    { symbol: '◎', title: 'Citation tracing', desc: 'Every answer links back to its source chunks — no black-box outputs, full auditability.' },
  ];

  const timelineSteps = [
    { step: '01', title: 'Upload your documents', desc: 'Drop a PDF, DOCX, or TXT file. ContextOS parses, cleans, and chunks it into semantically coherent segments automatically.' },
    { step: '02', title: 'Vectorize the vault', desc: 'Each chunk is embedded and stored in FAISS. BM25 inverted indices are built in parallel for hybrid coverage.' },
    { step: '03', title: 'Query naturally', desc: 'Ask anything. The hybrid retriever fetches top-k candidates, the reranker picks the best context, and the LLM generates a grounded response.' },
    { step: '04', title: 'Inspect and evaluate', desc: 'Every response surfaces citations, retrieved chunks, latency, and token counts — so you can debug, tune, and trust the system.' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500&display=swap');

        .hero-root {
          background: #0a0a09;
          color: #e8e6e1;
          min-height: 100vh;
          height: auto !important;
          overflow: visible !important;
          position: relative;
          font-family: 'Geist', sans-serif;
          font-weight: 300;
          overflow-x: clip;
        }

        .hero-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          border-bottom: 0.5px solid rgba(255,255,255,0.08);
          background: rgba(10,10,9,0.92);
          backdrop-filter: blur(12px);
        }

        .nav-logo {
          font-family: 'DM Mono', monospace;
          font-size: 13px; font-weight: 500;
          letter-spacing: 0.12em;
          color: #e8e6e1;
          text-transform: uppercase;
        }

        .nav-right { display: flex; align-items: center; gap: 32px; }

        .nav-link {
          font-size: 12px; color: rgba(232,230,225,0.5);
          letter-spacing: 0.04em; cursor: pointer;
          transition: color 0.2s; background: none; border: none;
          font-family: 'Geist', sans-serif; text-decoration: none;
        }
        .nav-link:hover { color: #e8e6e1; }

        .nav-cta {
          font-family: 'DM Mono', monospace;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.08em; padding: 9px 20px;
          background: #e8e6e1; color: #0a0a09;
          border: none; border-radius: 2px; cursor: pointer;
          transition: opacity 0.15s; text-transform: uppercase;
        }
        .nav-cta:hover { opacity: 0.85; }

        .hero-section { max-width: 1100px; margin: 0 auto; padding: 0 48px; }

        .above-fold {
          min-height: 100vh;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding-top: 140px; padding-bottom: 100px;
        }

        .af-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.14em;
          color: rgba(232,230,225,0.5); text-transform: uppercase;
          margin-bottom: 32px;
          display: flex; align-items: center; gap: 12px;
        }
        .af-eyebrow::before {
          content: ''; display: inline-block;
          width: 20px; height: 0.5px; background: rgba(232,230,225,0.3);
        }

        .af-headline {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(52px, 7vw, 96px);
          font-weight: 400; line-height: 1.0; letter-spacing: -0.02em;
          color: #e8e6e1; margin-bottom: 40px; max-width: 780px;
        }
        .af-headline em { font-style: italic; color: rgba(232,230,225,0.45); }

        .af-sub {
          font-size: 15px; font-weight: 300; line-height: 1.75;
          color: rgba(232,230,225,0.6); max-width: 440px; margin-bottom: 52px;
        }

        .af-actions { display: flex; align-items: center; gap: 16px; }

        .btn-launch {
          font-family: 'DM Mono', monospace;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 14px 32px; background: #e8e6e1; color: #0a0a09;
          border: none; border-radius: 2px; cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
        }
        .btn-launch:hover { opacity: 0.88; transform: translateY(-1px); }

        .btn-docs {
          font-family: 'DM Mono', monospace;
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 14px 28px; background: transparent;
          color: rgba(232,230,225,0.6);
          border: 0.5px solid rgba(232,230,225,0.25);
          border-radius: 2px; cursor: pointer; transition: color 0.2s, border-color 0.2s;
          display: inline-flex; align-items: center; text-decoration: none;
        }
        .btn-docs:hover { color: #e8e6e1; border-color: rgba(232,230,225,0.5); }

        .stats-bar {
          border-top: 0.5px solid rgba(255,255,255,0.1);
          border-bottom: 0.5px solid rgba(255,255,255,0.1);
          display: grid; grid-template-columns: repeat(3, 1fr);
        }
        .stat-cell {
          padding: 48px 64px;
          border-right: 0.5px solid rgba(255,255,255,0.1);
        }
        .stat-cell:last-child { border-right: none; }
        .stat-num {
          font-family: 'Instrument Serif', serif;
          font-size: 52px; font-weight: 400; color: #e8e6e1; line-height: 1; margin-bottom: 10px;
        }
        .stat-label { font-size: 12px; color: rgba(232,230,225,0.45); letter-spacing: 0.06em; }

        .section-wrap { padding: 100px 0; }

        .section-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 10px; letter-spacing: 0.16em;
          color: rgba(232,230,225,0.45); text-transform: uppercase;
          margin-bottom: 24px;
          display: flex; align-items: center; gap: 10px;
        }
        .section-eyebrow::before {
          content: ''; width: 16px; height: 0.5px;
          background: rgba(232,230,225,0.3); display: inline-block;
        }

        .section-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(32px, 4vw, 52px); font-weight: 400;
          line-height: 1.1; color: #e8e6e1; margin-bottom: 20px; letter-spacing: -0.01em;
        }

        .section-sub {
          font-size: 14px; font-weight: 300; line-height: 1.75;
          color: rgba(232,230,225,0.55); max-width: 460px; margin-bottom: 60px;
        }

        .pipeline-track {
          display: flex; align-items: stretch;
          border: 0.5px solid rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
        }
        .pipe-cell {
          flex: 1; padding: 28px 20px;
          border-right: 0.5px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; gap: 12px;
          position: relative; transition: background 0.4s;
        }
        .pipe-cell:last-child { border-right: none; }
        .pipe-cell.active { background: rgba(255,255,255,0.03); }
        .pipe-num { font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(232,230,225,0.3); letter-spacing: 0.1em; }
        .pipe-symbol { font-size: 22px; color: rgba(232,230,225,0.55); line-height: 1; transition: color 0.4s; }
        .pipe-cell.active .pipe-symbol { color: #e8e6e1; }
        .pipe-name { font-size: 11px; color: rgba(232,230,225,0.45); line-height: 1.4; transition: color 0.4s; }
        .pipe-cell.active .pipe-name { color: rgba(232,230,225,0.85); }
        .pipe-active-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: rgba(232,230,225,0.55);
          transform: scaleX(0); transform-origin: left; transition: transform 0.4s ease;
        }
        .pipe-cell.active .pipe-active-bar { transform: scaleX(1); }

        .feat-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border: 0.5px solid rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
        }
        .feat-card {
          padding: 36px 32px;
          border-right: 0.5px solid rgba(255,255,255,0.06);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          transition: background 0.25s;
        }
        .feat-card:hover { background: rgba(255,255,255,0.025); }
        .feat-card:nth-child(3n) { border-right: none; }
        .feat-card:nth-child(n+4) { border-bottom: none; }
        .feat-sym { font-family: 'DM Mono', monospace; font-size: 20px; color: rgba(232,230,225,0.35); margin-bottom: 20px; line-height: 1; }
        .feat-title { font-size: 13px; font-weight: 500; color: #e8e6e1; margin-bottom: 10px; letter-spacing: 0.01em; }
        .feat-desc { font-size: 12px; font-weight: 300; color: rgba(232,230,225,0.55); line-height: 1.7; }

        .obs-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          border: 0.5px solid rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
        }
        .obs-left { padding: 52px; border-right: 0.5px solid rgba(255,255,255,0.07); }
        .obs-right { padding: 32px; background: rgba(255,255,255,0.015); }
        .obs-checklist { display: flex; flex-direction: column; gap: 14px; margin-top: 32px; }
        .obs-check {
          display: flex; align-items: center; gap: 12px;
          font-size: 13px; font-weight: 300; color: rgba(232,230,225,0.65);
        }
        .obs-check::before { content: '—'; font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(232,230,225,0.35); flex-shrink: 0; }

        .code-win { background: rgba(0,0,0,0.4); border: 0.5px solid rgba(255,255,255,0.07); border-radius: 2px; height: 100%; }
        .code-win-bar { padding: 10px 16px; border-bottom: 0.5px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 6px; }
        .code-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .code-body { padding: 20px; font-family: 'DM Mono', monospace; font-size: 11px; line-height: 1.85; color: rgba(232,230,225,0.35); }
        .code-hi { color: rgba(232,230,225,0.8); }
        .code-val { color: rgba(232,230,225,0.55); }
        .code-green { color: #4ade80; }

        .timeline { display: flex; flex-direction: column; }
        .tl-row {
          display: grid; grid-template-columns: 100px 1px 1fr;
          gap: 0 40px; padding: 52px 0;
          border-bottom: 0.5px solid rgba(255,255,255,0.06); align-items: start;
        }
        .tl-row:last-child { border-bottom: none; }
        .tl-step-num { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(232,230,225,0.35); letter-spacing: 0.1em; padding-top: 4px; text-align: right; }
        .tl-line-col { position: relative; display: flex; justify-content: center; }
        .tl-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(232,230,225,0.35); margin-top: 5px; position: relative; z-index: 1; }
        .tl-line-col::after { content: ''; position: absolute; top: 12px; bottom: -52px; left: 50%; transform: translateX(-50%); width: 0.5px; background: rgba(255,255,255,0.08); }
        .tl-row:last-child .tl-line-col::after { display: none; }
        .tl-title { font-family: 'Instrument Serif', serif; font-size: 22px; color: #e8e6e1; margin-bottom: 10px; line-height: 1.2; }
        .tl-desc { font-size: 13px; font-weight: 300; color: rgba(232,230,225,0.55); line-height: 1.75; max-width: 440px; }

        .stack-row {
          display: flex; align-items: center;
          border: 0.5px solid rgba(255,255,255,0.07); border-radius: 2px; overflow: hidden; flex-wrap: wrap;
        }
        .stack-pill {
          padding: 14px 28px; font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.08em; color: rgba(232,230,225,0.45);
          border-right: 0.5px solid rgba(255,255,255,0.08);
          transition: color 0.2s, background 0.2s;
        }
        .stack-pill:last-child { border-right: none; }
        .stack-pill:hover { color: rgba(232,230,225,0.85); background: rgba(255,255,255,0.03); }

        .cta-section { padding: 120px 0; text-align: center; }
        .cta-title { font-family: 'Instrument Serif', serif; font-size: clamp(40px, 5vw, 72px); font-weight: 400; line-height: 1.05; letter-spacing: -0.02em; color: #e8e6e1; margin-bottom: 24px; }
        .cta-sub { font-size: 15px; font-weight: 300; color: rgba(232,230,225,0.55); margin-bottom: 48px; line-height: 1.7; }

        .hero-footer {
          border-top: 0.5px solid rgba(255,255,255,0.08); padding: 28px 48px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .footer-copy { font-size: 11px; color: rgba(232,230,225,0.25); }

        .fade-up {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.65s ease, transform 0.65s ease;
          will-change: opacity, transform;
        }
        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .d1 { transition-delay: 0.08s; }
        .d2 { transition-delay: 0.16s; }
        .d3 { transition-delay: 0.24s; }
        .d4 { transition-delay: 0.32s; }
      `}</style>

      <div className="hero-root">

        {/* NAV */}
        <nav className="hero-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#e8e6e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={18} style={{ color: '#0a0a09' }} />
            </div>
            <span className="nav-logo">ContextOS</span>
          </div>
          <div className="nav-right">
            <a className="nav-link" href="https://github.com/gitKrishh/ContextOS/wiki" target="_blank" rel="noopener noreferrer">Docs</a>
            <a className="nav-link" href="https://github.com/gitKrishh/ContextOS" target="_blank" rel="noopener noreferrer">GitHub</a>
            <button className="nav-cta" onClick={onInitialize}>Launch →</button>
          </div>
        </nav>

        {/* ABOVE FOLD */}
        <div className="hero-section">
          <div className="above-fold">
            <p className={fu('af-eyebrow', 'af-eyebrow')} data-id="af-eyebrow">
              Production-grade RAG platform
            </p>
            <h1 className={fu('af-headline', 'af-headline d1')} data-id="af-headline">
              Retrieval that<br /><em>actually</em> works.
            </h1>
            <p className={fu('af-sub', 'af-sub d2')} data-id="af-sub">
              Semantic search, hybrid retrieval, cross-encoder reranking, and real-time
              observability — all in one platform. Query your documents. Get grounded answers.
            </p>
            <div className={fu('af-actions', 'af-actions d3')} data-id="af-actions">
              <button className="btn-launch" onClick={onInitialize}>Launch platform</button>
              <a className="btn-docs" href="https://github.com/gitKrishh/ContextOS/wiki" target="_blank" rel="noopener noreferrer">Read the docs</a>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className={fu('stats-bar', 'stats-bar')} data-id="stats-bar">
          <div className="stat-cell">
            <div className="stat-num">&lt; 200ms</div>
            <div className="stat-label">Median retrieval latency</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">3-stage</div>
            <div className="stat-label">Retrieval pipeline</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">&lt; 4%</div>
            <div className="stat-label">Hallucination rate</div>
          </div>
        </div>

        {/* PIPELINE */}
        <div className="hero-section">
          <div className="section-wrap">
            <p className={fu('pipe-eyebrow', 'section-eyebrow')} data-id="pipe-eyebrow">Retrieval pipeline</p>
            <h2 className={fu('pipe-title', 'section-title d1')} data-id="pipe-title">
              Five stages from<br />doc to answer.
            </h2>
            <p className={fu('pipe-sub', 'section-sub d2')} data-id="pipe-sub">
              Every query travels through semantic indexing, hybrid retrieval, neural reranking, and cache-aware inference before a word is generated.
            </p>
            <div className={fu('pipe-track', 'pipeline-track d3')} data-id="pipe-track">
              {pipelineSteps.map((step, i) => (
                <div key={i} className={`pipe-cell${activeStep === i ? ' active' : ''}`}>
                  <div className="pipe-num">0{i + 1}</div>
                  <div className="pipe-symbol">{step.icon}</div>
                  <div className="pipe-name">{step.label}</div>
                  <div className="pipe-active-bar" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="hero-section">
          <div className="section-wrap" style={{ paddingTop: 0 }}>
            <p className={fu('feat-eyebrow', 'section-eyebrow')} data-id="feat-eyebrow">Core capabilities</p>
            <h2 className={fu('feat-title-h', 'section-title d1')} data-id="feat-title-h">
              Everything a RAG<br />pipeline needs.
            </h2>
            <div className={fu('feat-grid', 'feat-grid d2')} data-id="feat-grid">
              {features.map((f, i) => (
                <div key={i} className="feat-card">
                  <div className="feat-sym">{f.symbol}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OBSERVABILITY */}
        <div className="hero-section">
          <div className="section-wrap" style={{ paddingTop: 0 }}>
            <div className={fu('obs-grid', 'obs-grid')} data-id="obs-grid">
              <div className="obs-left">
                <p className="section-eyebrow" style={{ marginBottom: '20px' }}>Observability</p>
                <h2 className="section-title" style={{ fontSize: '32px', marginBottom: '12px' }}>
                  Full telemetry.<br />No guessing.
                </h2>
                <p style={{ fontSize: '13px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(232,230,225,0.4)', marginBottom: '8px' }}>
                  The evaluation suite tracks every request in real time — so you know exactly where the pipeline wins and where it needs tuning.
                </p>
                <div className="obs-checklist">
                  {['Hallucination rate tracking', 'Retrieval precision & MRR', 'Token usage per query', 'End-to-end latency breakdown'].map((item, i) => (
                    <div key={i} className="obs-check">{item}</div>
                  ))}
                </div>
              </div>
              <div className="obs-right">
                <div className="code-win">
                  <div className="code-win-bar">
                    <div className="code-dot" /><div className="code-dot" /><div className="code-dot" />
                  </div>
                  <div className="code-body">
                    <span style={{ color: 'rgba(232,230,225,0.15)' }}># query log entry</span><br />
                    {'{'}<br />
                    &nbsp;&nbsp;<span className="code-hi">"query"</span>: <span className="code-val">"What were Q3 margins?"</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"retrieved"</span>: <span className="code-val">5</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"reranked"</span>: <span className="code-val">3</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"hit_rate"</span>: <span className="code-val">0.94</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"mrr"</span>: <span className="code-val">0.88</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"latency_ms"</span>: <span className="code-val">182</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"hallucination"</span>: <span className="code-green">false</span>,<br />
                    &nbsp;&nbsp;<span className="code-hi">"cached"</span>: <span className="code-green">false</span><br />
                    {'}'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="hero-section">
          <div className="section-wrap" style={{ paddingTop: 0 }}>
            <p className={fu('tl-eyebrow', 'section-eyebrow')} data-id="tl-eyebrow">How it works</p>
            <h2 className={fu('tl-title', 'section-title d1')} data-id="tl-title">
              From upload to answer<br />in seconds.
            </h2>
            <div className={fu('tl-body', 'timeline d2')} data-id="tl-body">
              {timelineSteps.map((t, i) => (
                <div key={i} className="tl-row">
                  <div className="tl-step-num">{t.step}</div>
                  <div className="tl-line-col"><div className="tl-dot" /></div>
                  <div>
                    <div className="tl-title">{t.title}</div>
                    <div className="tl-desc">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STACK */}
        <div className="hero-section">
          <div style={{ paddingBottom: '100px' }}>
            <p className={fu('stack-eyebrow', 'section-eyebrow')} data-id="stack-eyebrow" style={{ marginBottom: '24px' }}>
              Built with
            </p>
            <div className={fu('stack-row', 'stack-row d1')} data-id="stack-row">
              {['FAISS', 'BM25', 'Redis', 'cross-encoder', 'SQLite', 'FastAPI', 'React'].map((s, i) => (
                <div key={i} className="stack-pill">{s}</div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="hero-section">
          <div className={fu('cta-section', 'cta-section')} data-id="cta-section">
            <h2 className="cta-title">Ready to query<br />your vault?</h2>
            <p className="cta-sub">Upload a document and run your first grounded query in under two minutes.</p>
            <button className="btn-launch" onClick={onInitialize}>Get started now →</button>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="hero-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: 'rgba(232,230,225,0.12)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={13} style={{ color: 'rgba(232,230,225,0.4)' }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(232,230,225,0.2)', textTransform: 'uppercase' }}>ContextOS</span>
          </div>
          <span className="footer-copy">Production-grade RAG platform</span>
        </footer>

      </div>
    </>
  );
}