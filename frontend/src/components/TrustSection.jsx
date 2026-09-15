import React from 'react';

const ITEMS = [
  { icon: '✓', title: 'Human Approval', desc: 'Escalated cases require ADMIN approve.' },
  { icon: '⚡', title: 'Risk Scoring', desc: 'Deterministic scoring, not LLM guess.' },
  { icon: '◈', title: 'Verification Gates', desc: 'Safety gate blocks unsafe refunds.' },
  { icon: '≡', title: 'Audit Trail', desc: 'Every action logged & traceable.' },
  { icon: '↻', title: 'Reversible', desc: 'Idempotent refunds, safe retries.' },
];

export default function TrustSection() {
  return (
    <div className="card">
      <h3>Trust & Safety</h3>
      <p className="mut small" style={{ marginBottom: 12 }}>Payments demand auditability. Every recovery is gated, verified, and logged.</p>
      <div className="trust-grid">
        {ITEMS.map((it) => (
          <div key={it.title} className="trust-item">
            <div className="trust-icon">{it.icon}</div>
            <div><b style={{ fontSize: 12 }}>{it.title}</b><div className="small" style={{ color: 'var(--mut)' }}>{it.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
