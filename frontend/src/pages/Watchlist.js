import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, AlertTriangle, Upload } from 'lucide-react';
import { watchlistAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_COLOR = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' };
const CATEGORIES = ['suspect','missing_person','vip','employee','banned','other'];

export default function WatchlistPage() {
  const [persons, setPersons] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', alias: '', category: 'suspect', riskLevel: 'medium', description: '', caseNumber: '' });
  const [files, setFiles] = useState([]);
  const fileRef = useRef();
  const { isSupervisor } = useAuth();

  useEffect(() => { watchlistAPI.getAll().then(r => setPersons(r.data.persons)).catch(console.error); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('faceImages', f));
      const res = await watchlistAPI.add(fd);
      setPersons(prev => [res.data.person, ...prev]);
      setShowAdd(false);
      setForm({ name: '', alias: '', category: 'suspect', riskLevel: 'medium', description: '', caseNumber: '' });
      setFiles([]);
      toast.success('Person added to watchlist');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add person'); }
  };

  const handleDeactivate = async (personId) => {
    if (!window.confirm('Remove this person from watchlist?')) return;
    try {
      await watchlistAPI.deactivate(personId);
      setPersons(prev => prev.filter(p => p.personId !== personId));
      setSelected(null);
      toast.success('Person removed');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-subtitle">{persons.length} persons tracked</p>
          </div>
          {isSupervisor && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add person</button>
          )}
        </div>
      </div>

      <div className="page-body">
        {persons.length === 0 ? (
          <div className="empty-state">
            <User size={40} />
            <p>Watchlist is empty</p>
            {isSupervisor && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Add first person</button>}
          </div>
        ) : (
          <div className="grid-3">
            {persons.map(p => (
              <div key={p._id} className="card card-sm" style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {p.faceImages?.[0]?.url
                    ? <img src={p.faceImages[0].url} alt={p.name} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={22} color="var(--text-muted)" /></div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    {p.alias && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>aka {p.alias}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className={`badge badge-${RISK_COLOR[p.riskLevel]}`}><AlertTriangle size={9} /> {p.riskLevel}</span>
                      <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{p.category.replace(/_/g,' ')}</span>
                    </div>
                  </div>
                </div>
                {p.detectionCount > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    Detected <strong style={{ color: 'var(--text-primary)' }}>{p.detectionCount}</strong> times
                    {p.lastDetected && ` · last ${new Date(p.lastDetected).toLocaleDateString()}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {selected.faceImages?.[0]?.url
                  ? <img src={selected.faceImages[0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                  : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--text-muted)" /></div>
                }
                <div>
                  <div style={{ fontWeight: 600 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.personId}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Category', selected.category?.replace(/_/g,' ')],
                  ['Risk level', selected.riskLevel],
                  ['Detections', selected.detectionCount],
                  ['Case #', selected.caseNumber || 'N/A'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.description}
                </div>
              )}
              {selected.faceImages?.length > 1 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.faceImages.map((img, i) => (
                    <img key={i} src={img.url} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                  ))}
                </div>
              )}
            </div>
            {isSupervisor && (
              <div className="modal-footer">
                <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(selected.personId)}>Remove from watchlist</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 600 }}>Add to watchlist</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Full name *</label>
                    <input required placeholder="John Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Alias / nickname</label>
                    <input placeholder="Optional" value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Risk level *</label>
                    <select value={form.riskLevel} onChange={e => setForm(p => ({ ...p, riskLevel: e.target.value }))}>
                      {['low','medium','high','critical'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Case number</label>
                  <input placeholder="FIR-2024-001" value={form.caseNumber} onChange={e => setForm(p => ({ ...p, caseNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} placeholder="Known behavior, history, notes..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                {/* Face image upload */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Face images (up to 5)</div>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ border: '1px dashed var(--border-hover)', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <Upload size={20} color="var(--text-muted)" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to upload face photos</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>JPG, PNG up to 5MB each</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))} />
                  {files.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {files.map((f, i) => (
                        <div key={i} style={{ fontSize: 11, background: 'var(--bg-3)', borderRadius: 6, padding: '4px 10px', color: 'var(--text-secondary)' }}>{f.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={13} /> Add to watchlist</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
