import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bell, Camera, Users, ShieldAlert, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/cameras', icon: Camera, label: 'Cameras' },
  { to: '/watchlist', icon: Users, label: 'Watchlist' },
  { to: '/activity', icon: Activity, label: 'Activity Log' },
];

export default function Sidebar({ alertCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--critical)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em' }}>Surveillance</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-4)' : 'transparent',
              transition: 'all 0.15s',
            })}>
            <Icon size={16} />
            {label}
            {label === 'Alerts' && alertCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--critical)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 7px', fontWeight: 600 }}>
                {alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 8, background: 'var(--bg-3)' }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}
