import React, { useState, useEffect } from 'react';
import { AlertTriangle, Camera, Users, ShieldCheck, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { alertAPI, cameraAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span className="stat-label">{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div className="stat-value" style={{ color }}>{value}</div>
    {subtext && <div className="stat-delta">{subtext}</div>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [camStats, setCamStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    Promise.all([
      alertAPI.getStats(),
      cameraAPI.getStats(),
      alertAPI.getAll({ limit: 5, status: 'active' })
    ]).then(([s, c, a]) => {
      setStats(s.data.stats);
      setCamStats(c.data.stats);
      setRecentAlerts(a.data.alerts);

      // Build mock hourly chart from byType data
      const hours = Array.from({ length: 12 }, (_, i) => ({
        time: `${(new Date().getHours() - 11 + i + 24) % 24}:00`,
        alerts: Math.floor(Math.random() * 8),
        detections: Math.floor(Math.random() * 20)
      }));
      setChartData(hours);
    }).catch(console.error);
  }, []);

  const pieData = stats?.bySeverity?.map(s => ({ name: s._id, value: s.count })) || [];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Security Dashboard</h1>
            <p className="page-subtitle">Real-time surveillance overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--low)' }}>
            <span className="dot-live dot-online" />
            System live
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat cards */}
        <div className="grid-4">
          <StatCard icon={AlertTriangle} label="Active Alerts" value={stats?.active ?? '—'} color="var(--critical)" subtext={`${stats?.todayCount ?? 0} today`} />
          <StatCard icon={ShieldCheck} label="Critical" value={stats?.critical ?? '—'} color="var(--high)" />
          <StatCard icon={Camera} label="Cameras Online" value={`${camStats?.online ?? '—'}/${camStats?.total ?? '—'}`} color="var(--accent)" />
          <StatCard icon={Users} label="Total Incidents" value={stats?.total ?? '—'} color="var(--medium)" subtext="All time" />
        </div>

        {/* Chart + Pie */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Detection activity (12h)</span>
              <TrendingUp size={16} color="var(--text-muted)" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#4d6a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4d6a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="url(#ga)" strokeWidth={1.5} name="Alerts" />
                <Area type="monotone" dataKey="detections" stroke="#3b82f6" fill="url(#gd)" strokeWidth={1.5} name="Detections" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Alerts by severity</div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={SEVERITY_COLORS[entry.name] || '#666'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: SEVERITY_COLORS[d.name], display: 'inline-block' }} />
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{d.name}</span>
                      </span>
                      <span style={{ fontWeight: 500 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No data yet</div>}
          </div>
        </div>

        {/* Recent active alerts */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
            Recent active alerts
          </div>
          {recentAlerts.length === 0
            ? <div className="empty-state"><p>No active alerts — system is clear</p></div>
            : recentAlerts.map(a => (
              <div key={a._id} className={`alert-item ${a.severity}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{a.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.cameraName} · {a.location} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  {(a.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
