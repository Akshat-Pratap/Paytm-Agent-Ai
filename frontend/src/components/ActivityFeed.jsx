import React from 'react';

export default function ActivityFeed() {
  const items = [
    { text: 'Risk Agent flagged TXN-2048 — high risk', time: 'now' },
    { text: 'Verification Agent requested customer verification', time: '2 min ago' },
    { text: 'Resolve Agent prepared recovery for CASE-1023', time: '4 min ago' },
    { text: 'Safety Gate blocked automatic refund — escalated', time: '7 min ago' },
  ];
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ marginBottom: 0 }}>Agent Activity</h3>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--grn)', display: 'inline-block' }} title="Live" />
      </div>
      <div style={{ marginTop: 12 }}>
        {items.map((it) => (
          <div key={it.text} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--line) 60%, transparent)' }}>
            <span style={{ color: 'var(--mut)', fontSize: 11, whiteSpace: 'nowrap' }}>{it.time}</span>
            <span style={{ fontSize: 13 }}>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
