import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, ShieldCheck, Zap, Coins, Info } from 'lucide-react';

interface AnalyticsProps {
  logs: any[];
  stats: any;
}

export const AnalyticsDashboard = ({ logs, stats }: AnalyticsProps) => {
  // Process real logs for charts
  const latencyChartData = logs.slice().reverse().map((log, index) => ({
    name: `Req ${index + 1}`,
    ms: log.latency_ms,
    tokens: log.tokens || 0
  }));

  const hasData = logs.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '8px' }}>Infrastructure Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Real-time telemetry and retrieval precision from production logs.</p>
      </header>

      {!hasData ? (
        <div className="retriq-card" style={{ padding: '80px', textAlign: 'center', opacity: 0.5 }}>
          <Info size={48} style={{ margin: '0 auto 24px', color: 'var(--primary)' }} />
          <h3 className="text-xs-bold">Awaiting Data</h3>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>Perform a query or ingest a document to see live infrastructure metrics.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Metric 1: Latency History */}
            <div className="retriq-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Zap size={20} style={{ color: 'var(--warning)' }} />
                <h3 className="text-xs-bold">Request Latency (ms)</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} hide />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="ms" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Metric 2: Token Expenditure */}
            <div className="retriq-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Coins size={20} style={{ color: 'var(--success)' }} />
                <h3 className="text-xs-bold">Token Consumption</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyChartData}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} hide />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                    <Area type="monotone" dataKey="tokens" stroke="var(--success)" fillOpacity={1} fill="url(#colorTokens)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <section className="retriq-card" style={{ backgroundColor: 'var(--bg-panel)' }}>
            <h3 className="text-xs-bold" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} /> Technical Audit Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.map((log: any) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', paddingTop: '12px' }}>
                  <span className="text-mono" style={{ color: 'var(--text-muted)', width: '120px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`badge ${log.type === 'chat' ? 'badge-primary' : 'badge-secondary'}`} style={{ width: '60px', textAlign: 'center' }}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="text-mono" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.query}
                  </span>
                  <span className="text-mono" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{log.latency_ms.toFixed(1)}ms</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
