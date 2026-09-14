import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEY = 'arh-theme';
const ThemeCtx = createContext({ theme: 'dark', toggle: () => {}, setTheme: () => {} });

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {}
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initial);
  const [manual, setManual] = useState(() => {
    try { return !!localStorage.getItem(KEY); } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f6fb' : '#060b18');
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (manual) return;
    let mq;
    try {
      mq = window.matchMedia('(prefers-color-scheme: light)');
    } catch { return; }
    const fn = (e) => setThemeState(e.matches ? 'light' : 'dark');
    try { mq.addEventListener('change', fn); } catch { try { mq.addListener(fn); } catch {} }
    return () => {
      try { mq.removeEventListener('change', fn); } catch { try { mq.removeListener(fn); } catch {} }
    };
  }, [manual]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    setManual(true);
    try { localStorage.setItem(KEY, t); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
    setManual(true);
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
