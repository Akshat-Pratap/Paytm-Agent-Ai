import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogin } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

export default function Login() {
  const { loginAdmin } = useAuth();
  const { push } = useToast();
  const nav = useNavigate();
  const [username, setUsername] = useState('ADMIN');
  const [password, setPassword] = useState('123456');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await adminLogin({ username: username.trim(), password });
      loginAdmin(r.token);
      push('Admin login successful', 'ok');
      nav('/admin', { replace: true });
    } catch (ex) {
      setErr(ex?.response?.data?.error || 'Invalid credentials');
    }
    setBusy(false);
  }

  return (
    <div className="wrap narrow animate-in">
      <div className="card">
        <h3>Admin Portal — Login</h3>
        <p className="mut small">Single ADMIN role does approve / reject / close + audit log. Demo: <b>ADMIN / 123456</b></p>
        <form onSubmit={submit}>
          <label className="lbl" htmlFor="user">Username</label>
          <input id="user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ADMIN" autoComplete="username" />
          <label className="lbl" htmlFor="pw">Password</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="123456" autoComplete="current-password" />
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10, width: '100%' }}>{busy ? 'Signing in…' : 'Login as Admin'}</button>
          <Link className="btn ghost" to="/" style={{ display: 'inline-block', marginTop: 8 }}>Back to Dashboard</Link>
        </form>
      </div>
    </div>
  );
}
