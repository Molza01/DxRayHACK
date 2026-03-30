import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? 'https://dxrayhack.onrender.com/api'
    : '/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const fetchBuilds = (params) => api.get('/builds', { params }).then(r => r.data);
export const fetchBuild = (id) => api.get(`/builds/${id}`).then(r => r.data);
export const fetchAnalytics = (repo) => api.get('/analytics', { params: repo ? { repo } : {} }).then(r => r.data);
export const fetchReport = () => api.get('/report').then(r => r.data);
export const syncGitHub = (owner, repo) => api.post('/github/sync', { owner, repo }).then(r => r.data);
export const syncVercel = (projectId) => api.post('/vercel/sync', { projectId }).then(r => r.data);
export const syncRender = (serviceId) => api.post('/render/sync', { serviceId }).then(r => r.data);
export const seedDemo = () => api.post('/seed').then(r => r.data);
export const seedScenario = (scenario) => api.post(`/seed/${scenario}`).then(r => r.data);
export const clearData = () => api.post('/clear').then(r => r.data);

// Docs Scanner API
export const syncDocsScan = (repoUrl) => api.post('/docs/sync', { repoUrl }).then(r => r.data);
export const fetchDocsHealth = (repo) => api.get('/docs/health', { params: repo ? { repo } : {} }).then(r => r.data);
export const fetchDocsIssues = (repo) => api.get('/docs/issues', { params: repo ? { repo } : {} }).then(r => r.data);
export const fetchDocsChangelog = (owner, repo) => api.get('/docs/changelog', { params: { owner, repo } }).then(r => r.data);
export const fetchDocFix = (issueId) => api.post('/docs/fix', { issueId }).then(r => r.data);
export const fetchDocFixAll = (repoUrl) => api.post('/docs/fix-all', { repoUrl }).then(r => r.data);

// Auth API
export const fetchGitHubRepos = () => api.get('/auth/github/repos').then(r => r.data);

// SSE stream for live updates
export function createSSEStream(onData) {
  const baseURL = import.meta.env.PROD ? 'https://dxrayhack.onrender.com/api' : '/api';
  const es = new EventSource(`${baseURL}/stream`);
  es.onmessage = (e) => {
    try { onData(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => { /* reconnects automatically */ };
  return es;
}
