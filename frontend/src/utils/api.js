import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sai_token');
      localStorage.removeItem('sai_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  setup: (data) => api.post('/auth/setup', data),
  me: () => api.get('/auth/me'),
  createUser: (data) => api.post('/auth/register', data),
  getUsers: () => api.get('/auth/users'),
};

// ── Cameras ──────────────────────────────────────
export const cameraAPI = {
  getAll: () => api.get('/cameras'),
  create: (data) => api.post('/cameras', data),
  updateStatus: (id, status) => api.patch(`/cameras/${id}/status`, { status }),
  delete: (id) => api.delete(`/cameras/${id}`),
  getStats: () => api.get('/cameras/stats'),
};

// ── Alerts ───────────────────────────────────────
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  getStats: () => api.get('/alerts/stats/summary'),
  create: (data) => api.post('/alerts', data),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
  resolve: (id, data) => api.patch(`/alerts/${id}/resolve`, data),
};

// ── Watchlist ────────────────────────────────────
export const watchlistAPI = {
  getAll: (params) => api.get('/watchlist', { params }),
  add: (formData) => api.post('/watchlist', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.patch(`/watchlist/${id}`, data),
  deactivate: (id) => api.delete(`/watchlist/${id}`),
  matchFace: (embedding, threshold) => api.post('/watchlist/match', { embedding, threshold }),
};

export default api;
