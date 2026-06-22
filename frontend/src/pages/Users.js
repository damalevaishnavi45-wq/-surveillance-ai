import React, { useState, useEffect } from 'react';
import { Plus, User, Shield, Key, Mail, CheckCircle, XCircle } from 'lucide-react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const ROLE_BADGE = {
  admin: 'badge-critical',
  supervisor: 'badge-high',
  guard: 'badge-online',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guard' });
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getUsers();
      setUsers(res.data.users);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await authAPI.createUser(form);
      setUsers(prev => [res.data.user, ...prev]);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'guard' });
      toast.success('User registered successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register user');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage system users, access roles, and permissions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <User size={40} />
            <p>No users registered</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
              Add First User
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          <User size={14} />
                        </div>
                        {u.name}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${ROLE_BADGE[u.role] || 'badge-blue'}`} style={{ textTransform: 'capitalize' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--low)' }}>
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--critical)' }}>
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never logged in'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="var(--accent)" /> Add User Account
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full name *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      required
                      placeholder="e.g. Officer Smith"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email address *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="e.g. officer.smith@surveillance.local"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Initial password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Access Role *</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="guard">Guard (Monitoring Only)</option>
                    <option value="supervisor">Supervisor (Can manage cameras, watchlist)</option>
                    <option value="admin">Admin (Full access + user management)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)} disabled={adding}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? 'Registering...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
