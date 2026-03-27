import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? 'https://dxrayhack.onrender.com/api'
    : '/api',
});

export const fetchBuilds = (params) => api.get('/builds', { params }).then(r => r.data);
export const fetchBuild = (id) => api.get(`/builds/${id}`).then(r => r.data);
export const fetchAnalytics = () => api.get('/analytics').then(r => r.data);
export const syncGitHub = (owner, repo) => api.post('/github/sync', { owner, repo }).then(r => r.data);
export const seedDemo = () => api.post('/seed').then(r => r.data);
export const clearData = () => api.post('/clear').then(r => r.data);
