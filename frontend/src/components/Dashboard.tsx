import React from 'react';
import { 
  AlertCircle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  FileSearch
} from 'lucide-react';

export const PriorityTimeline = () => {
  const items = [
    { id: 1, title: 'Bank Statement Review', due: 'Today', priority: 'high', category: 'Finance' },
    { id: 2, title: 'Health Insurance Claim', due: 'Tomorrow', priority: 'medium', category: 'Medical' },
    { id: 3, title: 'Rent Agreement Renewal', due: 'In 3 days', priority: 'high', category: 'Legal' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <div key={item.id} className="timeline-item" style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="icon-box" style={{ backgroundColor: item.priority === 'high' ? 'var(--warning-soft)' : 'var(--accent-soft)', color: item.priority === 'high' ? 'var(--warning)' : 'var(--accent)' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.category} • Due {item.due}</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      ))}
    </div>
  );
};

export const StatsGrid = () => {
  return (
    <div className="stats-grid">
      {[
        { label: 'Documents Processed', value: '42', icon: CheckCircle2, color: 'var(--success)' },
        { label: 'Pending Actions', value: '12', icon: Clock, color: 'var(--warning)' },
        { label: 'Upcoming Deadlines', value: '5', icon: Calendar, color: 'var(--accent)' },
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="glass-panel">
            <div style={{ padding: '8px', width: 'fit-content', borderRadius: '8px', backgroundColor: 'var(--bg-input)', color: stat.color, marginBottom: '16px' }}>
              <Icon size={24} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
};

export const DocumentActivity = ({ logs }: { logs: any[] }) => {
  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Recent Activity</h3>
        <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }}>View All</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {logs.length > 0 ? logs.map((log: any) => (
          <div key={log.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="icon-box" style={{ backgroundColor: log.type === 'chat' ? 'var(--accent-soft)' : 'var(--success-soft)', color: log.type === 'chat' ? 'var(--accent)' : 'var(--success)' }}>
                {log.type === 'chat' ? <TrendingUp size={16} /> : <FileSearch size={16} />}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.query}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>{log.type} • {log.latency_ms.toFixed(0)}ms</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )) : (
           <div style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>No activity yet.</div>
        )}
      </div>
    </div>
  );
};
