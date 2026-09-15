import React from 'react';

const STEPS = [
  { label: 'Payment Failed', sub: 'Trigger' },
  { label: 'Failure Detected', sub: 'Detect Agent' },
  { label: 'Investigated', sub: 'Customer & Txn' },
  { label: 'Risk Evaluated', sub: 'Risk Agent' },
  { label: 'Safety Gate', sub: 'Verification' },
  { label: 'Recovery / Refund', sub: 'Resolve' },
  { label: 'Resolved', sub: 'Completed' },
];

export default function Pipeline() {
  return (
    <div className="card">
      <h3>Payment Recovery Pipeline</h3>
      <div className="pipeline">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="pipeline-step">
              <div className={`pipeline-dot ${i < STEPS.length - 1 ? 'done' : 'active'}`}>{i + 1}</div>
              <div className="pipeline-label">{s.label}</div>
              <div className="pipeline-sub">{s.sub}</div>
            </div>
            {i < STEPS.length - 1 && <div className="pipeline-line" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
