import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerAuthForm from '../components/CustomerAuthForm.jsx';
import LoaderSkeleton from '../components/LoaderSkeleton.jsx';

export default function CustomerAuth() {
  const nav = useNavigate();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(id);
  }, []);

  function handleSuccess() {
    nav('/customer', { replace: true });
  }

  return (
    <div className="auth-full auth-bleed animate-in">
      <div className="auth-page bleed">
        {booting ? (
          <div className="auth-split" aria-busy="true">
            <aside className="auth-brand">
              <div className="auth-brand-logo"><span className="auth-brand-mark">AR</span><span>Autonomous Hub</span></div>
              <h2>Payments fail.<br />AI restores trust.</h2>
            </aside>
            <div className="auth-form">
              <LoaderSkeleton rows={5} />
            </div>
          </div>
        ) : (
          <CustomerAuthForm initialTab="login" onSuccess={handleSuccess} />
        )}
      </div>
      <Link className="btn ghost auth-back" to="/">←</Link>
      <Link to="/login" className="admin-fab" aria-label="Admin login">Admin →</Link>
    </div>
  );
}
