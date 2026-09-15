import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../theme.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import CustomerBell from './CustomerBell.jsx';
import CustomerAuthModal from './CustomerAuthModal.jsx';

export default function Layout({ children }) {
  const { theme, toggle } = useTheme();
  const { isAdmin, customerToken, customer, logoutAll, endLogout, isLoggingOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [ticketCount, setTicketCount] = useState(null);
  const isDash = loc.pathname === '/';

  React.useEffect(() => {
    if (!customerToken) { setTicketCount(null); return; }
    let stop = false;
    async function load() {
      try {
        const { getCustomerCases } = await import('../services/api.js');
        const rows = await getCustomerCases();
        if (!stop) setTicketCount(Array.isArray(rows) ? rows.length : 0);
      } catch { if (!stop) setTicketCount(0); }
    }
    load();
    const id = setInterval(load, 10000);
    return () => { stop = true; clearInterval(id); };
  }, [customerToken]);

  React.useEffect(() => {
    if (isLoggingOut) return;
    if (new URLSearchParams(loc.search).get('auth') === '1' && !customerToken) setAuthOpen(true);
  }, [loc.search, customerToken, isLoggingOut]);

  function handleAuthClose(didAuth) {
    setAuthOpen(false);
    if (didAuth) nav('/customer', { replace: true });
  }

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="nav-left">
          <Link to="/" className="brand">
            <div className="logo" aria-hidden="true">AR</div>
            <div className="brand-title">Autonomous Hub</div>
          </Link>
          <nav className="nav-links" aria-label="Main">
            {!isAdmin && !customerToken && (
              <>
                <a href="/#overview" className="nav-link">Overview</a>
                <a href="/#analytics" className="nav-link">Analytics</a>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin/cases" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Cases</NavLink>
                <NavLink to="/admin/activity" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Activity</NavLink>
                <NavLink to="/admin/audit" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Audit Log</NavLink>
              </>
            )}
            {customerToken && !isAdmin && (
              <>
                <Link className="nav-link" to="/customer">Tickets {ticketCount !== null ? `· ${ticketCount}` : ''}</Link>
                <Link className="nav-link" to="/customer/history">Transaction History</Link>
                <Link className="nav-link" to="/customer/profile">Profile</Link>
              </>
            )}
          </nav>
        </div>
        <nav className="top-actions" aria-label="Primary">
          {!customerToken && !isAdmin && (
            <button className="btn" onClick={() => setAuthOpen(true)}>Login / Sign up</button>
          )}
          {customerToken && !isAdmin && <span className="pill">{customer.name || customer.phone || 'customer'}</span>}
          {isAdmin && <span className="pill" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}>ADMIN</span>}
          {customerToken && !isAdmin ? <CustomerBell /> : <NotificationBell />}
          <button className="btn ghost theme-toggle" onClick={toggle} aria-pressed={theme === 'dark'} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} title={theme === 'dark' ? 'Light' : 'Dark'}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          {(isAdmin || customerToken) && <button className="btn ghost" onClick={() => { logoutAll(); setAuthOpen(false); nav('/#overview', { replace: true }); requestAnimationFrame(() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); setTimeout(() => endLogout(), 800); }}>Logout</button>}
        </nav>
      </header>
      {children}
      <CustomerAuthModal open={authOpen} onClose={handleAuthClose} />
    </div>
  );
}
