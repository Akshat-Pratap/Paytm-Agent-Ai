import axios from 'axios';
const api = axios.create({ baseURL: '/api', timeout: 90000 });
// Attach customer JWT on case creation if present
api.interceptors.request.use((cfg) => {
  try {
    const raw = localStorage.getItem('arh-customer');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.token) cfg.headers.Authorization = `Bearer ${p.token}`;
    }
  } catch {}
  try {
    const a = localStorage.getItem('arh-auth');
    if (a) {
      const pa = JSON.parse(a);
      if (pa.token && pa.role === 'admin') cfg.headers.Authorization = cfg.headers.Authorization || `Bearer ${pa.token}`;
      if (pa.role === 'admin') cfg.headers['X-Admin-Role'] = 'admin';
    }
  } catch {}
  return cfg;
});
export const createCase = (payload) => api.post('/cases', payload).then(r => r.data);
export const getCase = (id) => api.get(`/cases/${id}`).then(r => r.data);
export const listCases = () => api.get('/cases').then(r => r.data);
export const getAgents = (id) => api.get(`/cases/${id}/agents`).then(r => r.data);
export const getEvents = (id) => api.get(`/cases/${id}/events`).then(r => r.data);
export const getTxn = (id) => api.get(`/cases/${id}/transaction`).then(r => r.data);
export const getRisk = (id) => api.get(`/cases/${id}/risk`).then(r => r.data);
export const getRefund = (id) => api.get(`/cases/${id}/refund`).then(r => r.data);
export const getStats = () => api.get('/dashboard/stats').then(r => r.data);
export const humanAction = (id, action, note = '', admin_role = 'admin') =>
  api.post(`/cases/${id}/human-action`, { action, note, admin_role },
    { headers: { 'X-Admin-Role': admin_role } }).then(r => r.data);
export const getAudit = (admin_role = 'admin') =>
  api.get('/admin/audit', { headers: { 'X-Admin-Role': admin_role } }).then(r => r.data);
export const getEscalated = (admin_role = 'admin') =>
  api.get('/admin/escalated', { headers: { 'X-Admin-Role': admin_role } }).then(r => r.data);
// Bell polling helper: prefer backend filter, fall back to client filter
export const getEscalatedCount = async (admin_role = 'admin') => {
  try {
    const rows = await getEscalated(admin_role);
    if (Array.isArray(rows)) return rows;
  } catch {}
  try {
    const all = await listCases();
    return (all || []).filter((c) => c.status === 'ESCALATED');
  } catch { return []; }
};
export const registerCustomer = (payload) => api.post('/auth/register', payload).then(r => r.data);
export const loginCustomer = (payload) => api.post('/auth/login', payload).then(r => r.data);
export const adminLogin = (payload) => api.post('/admin/login', payload).then(r => r.data);
export const getCustomerCases = () => api.get('/customer/cases').then(r => r.data);
export const getCustomerProfile = () => api.get('/customer/profile').then(r => r.data);
export const updateCustomerProfile = (payload) => api.put('/customer/profile', payload).then(r => r.data);
export const getCustomerNotifications = () => api.get('/customer/notifications').then(r => r.data);
export const getCustomerTransactions = () => api.get('/customer/transactions').then(r => r.data);
export const getCustomerFailed = () => api.get('/customer/failed').then(r => r.data);
export function subscribeEvents(caseId, onMsg) {
  const es = new EventSource(`/api/cases/${caseId}/events/stream`);
  es.onmessage = (e) => { if (e.data !== 'ping') { try { onMsg(JSON.parse(e.data)); } catch {} } };
  return () => es.close();
}
export default api;
