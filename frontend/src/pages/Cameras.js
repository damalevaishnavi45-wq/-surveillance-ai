import React, { useState, useEffect } from 'react';
import { Plus, Camera, Wifi, WifiOff, Wrench, Trash2 } from 'lucide-react';
import { cameraAPI } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_ICON = { online: Wifi, offline: WifiOff, maintenance: Wrench };
const STATUS_COLOR = { online: 'var(--low)', offline: 'var(--critical)', maintenance: 'var(--medium)' };

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [stats, setStats] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cameraId: '', name: '', location: '', streamUrl: '', resolution: '1080p', fps: 25 });
  const { isSupervisor, isAdmin } = useAuth();

  useEffect(() => {
    Promise.all([cameraAPI.getAll(), cameraAPI.getStats()]).then(([c, s]) => {
      setCameras(c.data.cameras);
      setStats(s.data.stats);
    }).catch(console.error);
  }, []);

  useSocket(null, null, ({ cameraId, status }) => {
    setCameras(prev => prev.map(c => c.cameraId === cameraId ? { ...c, status, lastSeen: new Date() } : c));
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await cameraAPI.create(form);
      setCameras(prev => [...prev, res.data.camera]);
      setShowAdd(false);
      setForm({ cameraId: '', name: '', location: '', streamUrl: '', resolution: '1080p', fps: 25 });
      toast.success('Camera added');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add camera'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this camera?')) return;
    try {
      await cameraAPI.delete(id);
      setCameras(prev => prev.filter(c => c.cameraId !== id));
      toast.success('Camera removed');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="page-title">Cameras</h1>
            <p className="page-subtitle">{stats.online}/{stats.total} online</p>
          </div>
          {isSupervisor && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add camera</button>
          )}
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Online', val: stats.online, color: 'var(--low)' },
            { label: 'Offline', val: stats.offline, color: 'var(--critical)' },
            { label: 'Maintenance', val: stats.maintenance, color: 'var(--medium)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.val ?? 0}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Camera grid */}
        <div className="grid-3">
          {cameras.map(cam => {
            const StatusIcon = STATUS_ICON[cam.status] || WifiOff;
            return (
              <div key={cam._id} className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Camera feed placeholder */}
                <div style={{ background: 'var(--bg-0)', borderRadius: 8, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                  <Camera size={28} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>No live feed</span>
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span className={`badge badge-${cam.status === 'online' ? 'online' : 'offline'}`} style={{ fontSize: 10 }}>
                      <StatusIcon size={10} /> {cam.status}
                    </span>
                  </div>
                  {cam.status === 'online' && <span className="dot-live" style={{ position: 'absolute', top: 10, left: 10 }} />}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{cam.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cam.location}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 4 }}>{cam.resolution}</span>
                  <span style={{ background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 4 }}>{cam.fps}fps</span>
                  <span style={{ background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 4 }}>{cam.totalAlerts} alerts</span>
                </div>

                {isAdmin && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cam.cameraId)} style={{ alignSelf: 'flex-start' }}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            );
          })}

          {cameras.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <Camera size={40} />
              <p>No cameras configured yet</p>
              {isSupervisor && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Add first camera</button>}
            </div>
          )}
        </div>
      </div>

      {/* Add Camera Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 600 }}>Add camera</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {[
                  { key: 'cameraId', label: 'Camera ID', placeholder: 'CAM-001' },
                  { key: 'name', label: 'Name', placeholder: 'Main Entrance' },
                  { key: 'location', label: 'Location', placeholder: 'Building A, Gate 1' },
                  { key: 'streamUrl', label: 'Stream URL (optional)', placeholder: 'rtsp://...' },
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    <input required={f.key !== 'streamUrl'} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Resolution</label>
                    <select value={form.resolution} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))}>
                      {['720p','1080p','4K'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>FPS</label>
                    <input type="number" min={1} max={60} value={form.fps} onChange={e => setForm(p => ({ ...p, fps: +e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={13} /> Add camera</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
