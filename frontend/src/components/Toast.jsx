import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const ToastCtx = createContext(null);
let _id = 1;

const VISIBLE = 3;      // fanned pile depth
const KEEP = 5;         // mounted window (rest exit via AnimatePresence)
const DURATION = 4500;  // auto-dismiss ms

const KIND_META = {
  ok: { icon: '✓', title: 'Success' },
  warn: { icon: '⚠', title: 'Attention' },
  err: { icon: '✕', title: 'Failed' },
  info: { icon: 'ℹ', title: 'Update' },
};

function ToastItem({ toast, depth, front, onDismiss }) {
  const reduce = useReducedMotion();
  const timer = useRef(null);

  const arm = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onDismiss(toast.id), DURATION);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    arm();
    return () => clearTimeout(timer.current);
  }, [arm]);

  const meta = KIND_META[toast.kind] || KIND_META.info;
  const hidden = depth >= VISIBLE;

  const animate = hidden
    ? { opacity: 0, y: -12, scale: 0.85 }
    : { opacity: 1 - depth * 0.22, y: -depth * 10, scale: 1 - depth * 0.06 };

  if (reduce) {
    if (hidden) return null;
    return (
      <div className={`toast toast-${toast.kind}`} role="status">
        <span className="toast-icon" aria-hidden="true">{meta.icon}</span>
        <div className="toast-body">
          <ToastHead toast={toast} meta={meta} />
          <div className="toast-msg">{toast.msg}</div>
        </div>
        <button className="toast-x" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  return (
    <motion.div
      className={`toast toast-${toast.kind}`}
      role="status"
      aria-hidden={front ? undefined : 'true'}
      layout
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={animate}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      style={{ pointerEvents: front ? 'auto' : 'none', zIndex: KEEP - depth }}
      onHoverStart={() => clearTimeout(timer.current)}
      onHoverEnd={arm}
      onFocus={front ? () => clearTimeout(timer.current) : undefined}
      onBlur={front ? arm : undefined}
    >
      <span className="toast-icon" aria-hidden="true">{meta.icon}</span>
      <div className="toast-body">
        <ToastHead toast={toast} meta={meta} />
        <div className="toast-msg">{toast.msg}</div>
      </div>
      {front && (
        <button className="toast-x" onClick={() => onDismiss(toast.id)} aria-label="Dismiss" tabIndex={0}>✕</button>
      )}
    </motion.div>
  );
}

function ToastHead({ toast, meta }) {
  return (
    <div className="toast-head">
      <b>{toast.title || meta.title}</b>
      {toast.scope && (
        <span className={`toast-scope scope-${toast.scope}`}>
          {toast.scope === 'admin' ? 'ADMIN' : 'YOU'}
        </span>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, kind = 'info', opts = {}) => {
    const id = _id++;
    const { title = '', scope = '' } = opts || {};
    setToasts((t) => [...t.slice(-(KEEP - 1)), { id, msg, kind, title, scope }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  const visible = toasts.slice(-KEEP);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {visible.map((t, i) => {
            const depth = visible.length - 1 - i; // 0 = newest/front
            return (
              <ToastItem
                key={t.id}
                toast={t}
                depth={depth}
                front={depth === 0}
                onDismiss={dismiss}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) return { push: () => {}, dismiss: () => {} };
  return v;
}
