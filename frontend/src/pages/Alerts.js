import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye, Filter, RefreshCw } from 'lucide-react';
import { alertAPI } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPES = ['loitering','fighting','crowd_surge','perimeter_breach','face_match','unknown_person','restricted_area','fall_detected','weapon_detected'];
const SEVERITIES = ['critical','high','medium','low'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ severity: '', status: '', type: '', page: 1 });
  const [resolveNotes, setResolveNotes] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alertAPI.getAll({ ...filters, limit: 25 });
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
    } catch { } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  useSocket(
    (alert) => {
      setAlerts(prev => [alert, ...prev]);
      toast.custom(() => (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--critical)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 13, maxWidth: 320 }}>
          <span style={{ color: 'var(--critical)', fontWeight: 600 }}>🚨 {alert.severity.toUpperCase()} ALERT</span>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{alert.type.replace(/_/g,' ')} · {alert.location}</p>
        </div>
      ), { duration: 5000 });
    },
    (updated) => setAlerts(prev => prev.map(a => a.alertId === updated.alertId ? updated : a))
  );

  const handleAcknowledge = async (alertId) => {
    try {
      await alertAPI.acknowledge(alertId);
      setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: 'acknowledged' } : a));
      setSelected(null);
      toast.success('Alert acknowledged');
    } catch { toast.error('Failed to acknowledge'); }
  };

  const handleResolve = async (alertId, falsePositive = false) => {
    try {
      await alertAPI.resolve(alertId, { notes: resolveNotes, falsePositive });
      setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: falsePositive ? 'false_positive' : 'resolved' } : a));
      setSelected(null);
      setResolveNotes('');
      toast.success(falsePositive ? 'Marked as false positive' : 'Alert resolved');
    } catch { toast.error('Failed to resolve'); }
  };

  const SeverityDot = ({ s }) => (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${s})`, display: 'inline-block', flexShrink: 0 }} />
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">{total} total records</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadAlerts}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Filter size={15} color="var(--text-muted)" style={{ marginTop: 9 }} />
          <select style={{ width: 140 }} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value, page: 1 }))}>
            <option value="">All severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={{ width: 140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False positive</option>
          </select>
          <select style={{ width: 180 }} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}>
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Camera / Location</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
                  : alerts.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No alerts found</td></tr>
                    : alerts.map(a => (
                      <tr key={a._id} style={a.status === 'active' && a.severity === 'critical' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                        <td><span className={`badge badge-${a.severity}`}><SeverityDot s={a.severity} />{a.severity}</span></td>
                        <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{a.type.replace(/_/g,' ')}</td>
                        <td>
                          <div style={{ fontSize: 13 }}>{a.cameraName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.location}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{(a.confidence * 100).toFixed(1)}%</td>
                        <td><span className={`badge badge-${a.status === 'active' ? 'critical' : a.status === 'resolved' ? 'low' : 'blue'}`}>{a.status}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(a)}><Eye size={13} /></button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge badge-${selected.severity}`}>{selected.severity}</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selected.type.replace(/_/g,' ')}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>ID: {selected.alertId}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selected.snapshotUrl && (
                <img src={selected.snapshotUrl} alt="Alert snapshot" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Camera', selected.cameraName],
                  ['Location', selected.location],
                  ['Confidence', `${(selected.confidence * 100).toFixed(1)}%`],
                  ['Status', selected.status],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.description}
                </div>
              )}
              {selected.status === 'active' && (
                <div className="form-group">
                  <label>Resolution notes</label>
                  <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={2} placeholder="Add notes..." />
                </div>
              )}
            </div>
            {selected.status === 'active' && (
              <div className="modal-footer">
                <button className="btn btn-ghost btn-sm" onClick={() => handleResolve(selected.alertId, true)}>
                  <XCircle size={13} /> False positive
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleAcknowledge(selected.alertId)}>
                  <Eye size={13} /> Acknowledge
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleResolve(selected.alertId)}>
                  <CheckCircle size={13} /> Resolve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
