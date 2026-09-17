import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import CustomerAuthForm from './CustomerAuthForm.jsx';

// Thin wrapper kept for backward-compat; primary flow is now the /auth page.
export default function CustomerAuthModal({ open, onClose, initialTab = 'login' }) {
  useEffect(() => {
    if (!open) return;
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop auth-split-backdrop" onClick={() => onClose(false)} role="dialog" aria-modal="true" aria-label="Customer login">
      <CustomerAuthForm initialTab={initialTab} onSuccess={onClose} showClose onClose={onClose} />
      <Link to="/login" className="admin-fab" onClick={() => onClose(false)} aria-label="Admin login">Admin →</Link>
    </div>
  );
}
