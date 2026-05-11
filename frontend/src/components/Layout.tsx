import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Database, 
  Terminal, 
  Shield, 
  Settings, 
  Search,
  Sun,
  Moon,
  Box,
  Upload,
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  Edit2
} from 'lucide-react';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealth: { hitRate: string; mrr: string } | null;
  onUploadClick: () => void;
  chatSessions: { id: string; title: string; timestamp: number }[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onNewSession: () => void;
  onOpenSettings: () => void;
  onOpenSecurity: () => void;
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  systemHealth, 
  onUploadClick,
  chatSessions,
  activeSessionId,
  onSessionSelect,
  onDeleteSession,
  onRenameSession,
  onNewSession,
  onOpenSettings,
  onOpenSecurity
}: LayoutProps) => {
  const navItems = [
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'documents', label: 'Vault', icon: Database },
    { id: 'evaluation', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="retriq-sidebar" style={{ width: '280px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '0 8px' }}>
        <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
          <Box size={18} color="var(--primary-text)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.5px' }}>ContextOS</span>
        </div>
      </div>

      <button 
        onClick={onUploadClick}
        className="btn-primary" 
        style={{ width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
      >
        <Upload size={16} /> INGEST DOCUMENT
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
        <p className="text-xs-bold" style={{ color: 'var(--text-muted)', marginBottom: '8px', padding: '0 12px' }}>Workspace</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Multi-Chat Threads */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ position: 'relative', margin: '0 12px 16px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search chats..."
            className="retriq-input"
            style={{ padding: '8px 12px 8px 36px', fontSize: '12px', width: '100%', borderRadius: '6px', height: '32px' }}
            onChange={(e) => {
              // We'll pass this logic up or handle it here if we filter locally
              const term = e.target.value.toLowerCase();
              const items = document.querySelectorAll('.session-item-wrapper');
              items.forEach((item: any) => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? 'flex' : 'none';
              });
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', marginBottom: '8px' }}>
          <p className="text-xs-bold" style={{ color: 'var(--text-muted)' }}>Recent Chats</p>
          <button onClick={onNewSession} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="New Chat">
            <MessageSquarePlus size={14} />
          </button>
        </div>
        {chatSessions.map(session => (
          <div 
            key={session.id} 
            className="session-item-wrapper"
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <button
              onClick={() => onSessionSelect(session.id)}
              className={`nav-link ${activeSessionId === session.id && activeTab === 'playground' ? 'active' : ''}`}
              style={{ padding: '8px 12px', fontSize: '12px', flex: 1, paddingRight: '32px' }}
            >
              <MessageSquare size={14} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</span>
            </button>
            <div style={{ position: 'absolute', right: '4px', display: 'flex', alignItems: 'center', gap: '0', opacity: activeSessionId === session.id ? 1 : 0, transition: 'opacity 0.2s' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameSession(session.id, session.title);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Rename Chat"
              >
                <Edit2 size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                className="session-delete-btn"
                title="Delete Chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {chatSessions.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '0 12px' }}>No recent chats.</p>
        )}
      </div>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <div className="retriq-card" style={{ padding: '12px', backgroundColor: 'var(--bg-panel)', border: 'none', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-xs-bold" style={{ color: 'var(--text-muted)' }}>Engine Health</span>
            <div className="thinking-orb" style={{ width: '6px', height: '6px' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cache Hit</span>
              <span className="text-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{systemHealth?.hitRate || '0.00%'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>MRR Score</span>
              <span className="text-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{systemHealth?.mrr || '0.00'}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onOpenSecurity} className="btn-secondary" style={{ flex: 1, padding: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'center' }} title="Security"><Shield size={14} /></button>
          <button onClick={onOpenSettings} className="btn-secondary" style={{ flex: 1, padding: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'center' }} title="Settings"><Settings size={14} /></button>
        </div>
      </div>
    </aside>
  );
};

export const Header = ({ title }: { title: string }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('contextos-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('contextos-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <header className="retriq-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600' }}>{title}</h2>
        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border)' }}></div>
        <span className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v1.2.4</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleTheme} 
          className="btn-secondary"
          style={{ 
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </header>
  );
};
