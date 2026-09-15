import React from 'react';

export default function CaseCard({ c, onOpen }) {
  return (
    <button className={`casecard st-border-${c.status || 'UNKNOWN'}`} onClick={() => onOpen && onOpen(c)}>
      <div className="casecard-top">
        <b>{c.case_id}</b>
        <span className={`st ${c.status}`}>{c.status}</span>
      </div>
      <div className="mut small">{c.transaction_id} {c.amount ? `· ₹${Number(c.amount).toLocaleString('en-IN')}` : ''}</div>
      {c.risk_level && <div className="mut small">Risk {c.risk_score ?? ''} ({c.risk_level})</div>}
    </button>
  );
}
