import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'arh-auth';
const CUST_KEY = 'arh-customer';

const AuthCtx = createContext(null);

function loadAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { role: '', token: '' };
    const p = JSON.parse(raw);
    return p.role ? p : { role: '', token: '' };
  } catch { return { role: '', token: '' }; }
}
function loadCust() {
  try {
    const raw = localStorage.getItem(CUST_KEY);
    if (!raw) return { token: '', phone: '', name: '', id: '' };
    return JSON.parse(raw);
  } catch { return { token: '', phone: '', name: '', id: '' }; }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadAuth);
  const [cust, setCust] = useState(loadCust);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(auth)); } catch {} }, [auth]);
  useEffect(() => { try { localStorage.setItem(CUST_KEY, JSON.stringify(cust)); } catch {} }, [cust]);

  const loginAdmin = useCallback((token) => {
    setAuth({ role: 'admin', token });
  }, []);
  const loginCustomer = useCallback((token, user) => {
    setCust({ token, phone: user.phone || '', name: user.name || '', id: String(user.id || '') });
  }, []);
  // legacy mock role login kept for compat but map to admin only
  const login = useCallback((role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'admin' || r === 'superadmin') setAuth({ role: 'admin', token: `mock-admin-${Date.now()}` });
  }, []);
  const logout = useCallback(() => {
    setAuth({ role: '', token: '' });
  }, []);
  const logoutCustomer = useCallback(() => setCust({ token: '', phone: '', name: '', id: '' }), []);
  const logoutAll = useCallback(() => { setIsLoggingOut(true); setAuth({ role: '', token: '' }); setCust({ token: '', phone: '', name: '', id: '' }); }, []);
  const endLogout = useCallback(() => setIsLoggingOut(false), []);

  const value = useMemo(() => {
    const role = (auth.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const customerToken = cust.token || '';
    const customer = cust;
    return {
      role: role || (customerToken ? 'customer' : ''),
      token: auth.token,
      isAdmin,
      isLoggingOut,
      canApprove: isAdmin, canReject: isAdmin, canClose: isAdmin,
      login, loginAdmin, loginCustomer, logout, logoutCustomer, logoutAll, endLogout,
      customer, customerToken,
    };
  }, [auth, cust, isLoggingOut, login, loginAdmin, loginCustomer, logout, logoutCustomer, logoutAll, endLogout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export const ROLES = ['customer', 'admin'];
