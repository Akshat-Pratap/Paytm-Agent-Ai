import React, { useEffect, useState } from 'react';
import { getCustomerProfile, updateCustomerProfile } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function CustomerProfile() {
  const { loginCustomer } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getCustomerProfile().then((p) => setForm({ name: p.name || '', phone: p.phone || '', password: '' })).catch(() => {});
  }, []);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const payload = {};
    if (form.name.trim()) payload.name = form.name.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.password) payload.password = form.password;
    if (!payload.name && !payload.phone && !payload.password) { setErr('Change at least one field'); setBusy(false); return; }
    try {
      const r = await updateCustomerProfile(payload);
      if (r.token && r.user) loginCustomer(r.token, r.user);
      push('Profile updated', 'ok');
      setForm((f) => ({ ...f, password: '' }));
    } catch (ex) { setErr(ex?.response?.data?.error || 'Update failed'); }
    setBusy(false);
  }
  return (
    <div className="wrap narrow animate-in">
      <div className="card">
        <h3>Profile — Editable</h3>
        <p className="mut small">Update name, +91 phone (10 digits 6-9…), or password. Stored in <b>users</b> table (SQLite/Postgres).</p>
        <form onSubmit={submit}>
          <label className="lbl" htmlFor="pname">Name</label>
          <input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          <label className="lbl" htmlFor="pphone">Phone (+91)</label>
          <div className="phone-row"><span className="phone-prefix">+91</span><input id="pphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" maxLength={10} inputMode="numeric" /></div>
          <label className="lbl" htmlFor="ppw">New password (leave blank to keep)</label>
          <input id="ppw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 chars" />
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10, width: '100%' }}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      </div>
    </div>
  );
}
