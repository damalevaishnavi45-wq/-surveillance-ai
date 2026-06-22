import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AlertsPage from './pages/Alerts';
import CamerasPage from './pages/Cameras';
import WatchlistPage from './pages/Watchlist';
import UsersPage from './pages/Users';
import Login from './pages/Login';
import './index.css';

function Layout() {
  const { user, isAdmin } = useAuth();
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  useSocket(
    () => setActiveAlertCount(c => c + 1),
    (updated) => { if (['resolved', 'false_positive'].includes(updated.status)) setActiveAlertCount(c => Math.max(0, c - 1)); }
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar alertCount={activeAlertCount} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: 13 } }} />
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginGuard() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
