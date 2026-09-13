import axios from 'axios';
const api = axios.create({ baseURL: '/api', timeout: 90000 });
export const createCase = (payload) => api.post('/cases', payload).then(r => r.data);
export const getCase = (id) => api.get(`/cases/${id}`).then(r => r.data);
export const getAgents = (id) => api.get(`/cases/${id}/agents`).then(r => r.data);
export const getEvents = (id) => api.get(`/cases/${id}/events`).then(r => r.data);
export const getTxn = (id) => api.get(`/cases/${id}/transaction`).then(r => r.data);
export const getRisk = (id) => api.get(`/cases/${id}/risk`).then(r => r.data);
export const getRefund = (id) => api.get(`/cases/${id}/refund`).then(r => r.data);
export const getStats = () => api.get('/dashboard/stats').then(r => r.data);
export const humanAction = (id, action, note='') => api.post(`/cases/${id}/human-action`, { action, note }).then(r => r.data);
export function subscribeEvents(caseId, onMsg) {
  const es = new EventSource(`/api/cases/${caseId}/events/stream`);
  es.onmessage = (e) => { if (e.data !== 'ping') { try { onMsg(JSON.parse(e.data)); } catch {} } };
  return () => es.close();
}
export default api;
