import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { registerCustomer, loginCustomer } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';
import RollButton from './RollButton.jsx';

export default function CustomerAuthForm({ initialTab = 'login', onSuccess, showClose = false, onClose = () => {} }) {
  const { loginCustomer: storeLogin } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const firstRef = useRef(null);

  useEffect(() => { if (firstRef.current) firstRef.current.focus(); }, [tab]);

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
      push(tab === 'register' ? 'Registered — welcome!' : 'Welcome back!', 'ok', { scope: 'customer', title: 'Welcome' });
      onSuccess(true);
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Failed — try again');
    }
    setBusy(false);
  }

  return (
    <div className="auth-split" onClick={(e) => e.stopPropagation()}>
      <aside className="auth-brand">
        <motion.div className="auth-beams" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className={`beam b${i}`}
              animate={{ x: ['-6%', '6%', '-6%'], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>
        <div className="auth-brand-logo"><span className="auth-brand-mark">AR</span><span>Autonomous Hub</span></div>
        <h2>Payments fail.<br />AI restores trust.</h2>
        <ul className="auth-feats">
          <li><span aria-hidden="true">+</span> 7 AI Agents</li>
          <li><span aria-hidden="true">+</span> Idempotent Refunds</li>
          <li><span aria-hidden="true">+</span> Human Approval</li>
        </ul>
      </aside>
      <div className="auth-form">
        <span className="auth-ribbon">AI • 7 Agents</span>
        {showClose && <button className="btn ghost sm auth-close" onClick={() => onClose(false)} aria-label="Close">✕</button>}
        <div className="auth-mark">AR</div>
        <p className="mut small" style={{ margin: '8px 0 0' }}>Welcome to Autonomous Hub</p>
        <h1>Get started with your phone number</h1>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'login'} className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button type="button" role="tab" aria-selected={tab === 'register'} className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Sign up</button>
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
          <label className="lbl" htmlFor="creg">Where are you registered?</label>
          <input id="creg" value="IN India" disabled aria-disabled="true" />
          {err && <div className="err">{err}</div>}
          <RollButton className="btn auth-continue" type="submit" disabled={busy}>{busy ? 'Please wait…' : tab === 'register' ? 'Create account' : 'Login'}</RollButton>
        </form>
        <p className="fine">By continuing you agree to our privacy policy &amp; terms of use.</p>
      </div>
    </div>
  );
}
