import React, { useState } from 'react';

export default function EvidencePanel({ why, txn, risk }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card">
      <button className="collhead" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3 style={{ margin: 0 }}>Why did the AI decide this? (auditable explanation)</h3>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && <pre className="why">{why || 'Run a case to see evidence, policy checks, action and result.'}</pre>}
      {open && txn?.transaction_id && (
        <div className="mut small">
          Evidence: txn {txn.status} · debited {String(txn.debited)} · merchant {String(txn.merchant_credited)} ·
          refund {txn.refund_status} · risk {risk.risk_score} ({risk.risk_level})
        </div>
      )}
    </div>
  );
}
