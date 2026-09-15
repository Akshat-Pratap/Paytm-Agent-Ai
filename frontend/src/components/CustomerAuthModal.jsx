import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerCustomer, loginCustomer } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

export default function CustomerAuthModal({ open, onClose, initialTab = 'login' }) {
  const { loginCustomer: storeLogin } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const firstRef = useRef(null);

  useEffect(() => { if (open && firstRef.current) firstRef.current.focus(); }, [open, tab]);
  useEffect(() => {
    if (!open) return;
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const validPhone = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10));

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!validPhone) { setErr('Enter 10 digits starting 6-9'); return; }
    if (password.length < 6) { setErr('Password min 6 chars'); return; }
    if (tab === 'register' && name.trim().length < 2) { setErr('Name required (min 2 chars)'); return; }
    setBusy(true);
    try {
      const fn = tab === 'register' ? registerCustomer : loginCustomer;
      const payload = tab === 'register' ? { phone: digits, name: name.trim(), password } : { phone: digits, password };
      const r = await fn(payload);
      storeLogin(r.token, r.user);
      push(tab === 'register' ? 'Registered — welcome!' : 'Welcome back!', 'ok');
      onClose(true);
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Failed — try again');
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)} role="dialog" aria-modal="true" aria-label="Customer login">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>Customer Portal</h3>
          <button className="btn ghost sm" onClick={() => onClose(false)} aria-label="Close">✕</button>
        </div>
        <p className="mut small">Login or sign up with <b>+91</b> mobile. Live agents run only after you log in.</p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button role="tab" aria-selected={tab === 'register'} className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Sign up</button>
        </div>
        <form onSubmit={submit}>
          {tab === 'register' && (
            <>
              <label className="lbl" htmlFor="cname">Name</label>
              <input id="cname" ref={firstRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </>
          )}
          <label className="lbl" htmlFor="cphone">Mobile (+91)</label>
          <div className="phone-row">
            <span className="phone-prefix">+91</span>
            <input id="cphone" ref={tab === 'login' ? firstRef : undefined} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" inputMode="numeric" maxLength={10} />
          </div>
          <label className="lbl" htmlFor="cpw">Password</label>
          <input id="cpw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" autoComplete={tab === 'register' ? 'new-password' : 'current-password'} />
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 10, width: '100%' }}>{busy ? 'Please wait…' : tab === 'register' ? 'Create account' : 'Login'}</button>
        </form>
      </div>
      <Link to="/login" className="admin-fab" onClick={() => onClose(false)} aria-label="Admin login">Admin →</Link>
    </div>
  );
}
