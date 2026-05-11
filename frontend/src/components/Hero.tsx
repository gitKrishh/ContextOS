import React from 'react';
import { motion } from 'framer-motion';
import { Box, Terminal, Shield, Database, ArrowRight, UploadCloud, Search, Cpu } from 'lucide-react';

interface HeroProps {
  onInitialize: () => void;
}

export const Hero = ({ onInitialize }: HeroProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', overflowY: 'auto', padding: '60px 20px' }}>
      {/* Minimal Background */}
      <div className="hero-bg"></div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}
      >
        <motion.div variants={itemVariants} style={{ marginBottom: '24px', textAlign: 'center' }}>
           <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--text-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
             <Box size={24} style={{ color: 'var(--bg-app)' }} />
           </div>
          <h1 className="text-display" style={{ fontSize: '56px', fontWeight: '700', letterSpacing: '-2px', lineHeight: '1.1', marginBottom: '16px', color: 'var(--text-primary)' }}>
            ContextOS
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto' }}>
            The minimalist infrastructure platform for Retrieval-Augmented Generation. Clean observability, direct ingestion, and high fidelity.
          </p>
        </motion.div>

        {/* How to Use Section */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', width: '100%', margin: '48px 0' }}>
          
          <div className="retriq-card retriq-card-hoverable" style={{ padding: '32px', textAlign: 'left', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <UploadCloud size={20} style={{ color: 'var(--text-primary)' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>1. Ingest Documents</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Open the Vault and upload your PDF, TXT, or DOCX files. The system automatically chunks, embeds, and indexes them into the vector database.
            </p>
          </div>

          <div className="retriq-card retriq-card-hoverable" style={{ padding: '32px', textAlign: 'left', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Search size={20} style={{ color: 'var(--text-primary)' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>2. Query the Engine</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Navigate to the Playground. Ask questions. ContextOS will hybrid-search the vector vault and stream citations directly to your UI.
            </p>
          </div>

          <div className="retriq-card retriq-card-hoverable" style={{ padding: '32px', textAlign: 'left', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Cpu size={20} style={{ color: 'var(--text-primary)' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>3. Monitor Telemetry</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Watch the right-hand observability panel. Track embedding latency, LLM synthesis times, and token consumption in real-time.
            </p>
          </div>

        </motion.div>

        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginBottom: '64px' }}>
          <button onClick={onInitialize} className="btn-primary" style={{ padding: '16px 32px', fontSize: '15px', fontWeight: '600', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Initialize Workspace <ArrowRight size={18} />
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
};
