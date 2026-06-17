import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [setupForm, setSetupForm] = useState({ name: '', email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.setup(setupForm);
      localStorage.setItem('sai_token', res.data.token);
      localStorage.setItem('sai_user', JSON.stringify(res.data.user));
      navigate('/');
      toast.success('Admin account created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Setup failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', padding: 20 }}>
      {/* Background grid effect */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--critical)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
            <ShieldAlert size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>SurveillanceAI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Secure access — authorized personnel only</p>
        </div>

        <div className="card">
          {!setupMode ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Email address</label>
                <input type="email" required placeholder="admin@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                First time?{' '}
                <button type="button" onClick={() => setSetupMode(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>
                  Create admin account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Initial setup</div>
              <div className="form-group">
                <label>Your name</label>
                <input required placeholder="Admin Name" value={setupForm.name} onChange={e => setSetupForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" required placeholder="admin@example.com" value={setupForm.email} onChange={e => setSetupForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required minLength={6} placeholder="min 6 characters" value={setupForm.password} onChange={e => setSetupForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Creating...' : 'Create admin account'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSetupMode(false)} style={{ width: '100%', justifyContent: 'center' }}>Back to login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
