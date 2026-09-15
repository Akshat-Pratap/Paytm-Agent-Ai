import React from 'react';

export default function MetricsRow({ stats = {} }) {
  const items = [
    { label: 'Failed Payments', value: (stats.total_cases ?? 0) - (stats.resolved_cases ?? 0), desc: 'Need attention', trend: '' },
    { label: 'Active Cases', value: stats.active_cases ?? 0, desc: 'In progress', trend: '' },
    { label: 'Recovered', value: stats.resolved_cases ?? 0, desc: 'Auto-resolved', trend: '+12%' },
    { label: 'Refunded', value: stats.total_refunds ?? 0, desc: 'Transactions', trend: '' },
    { label: 'Recovery Rate', value: `${stats.auto_resolution_rate ?? 0}%`, desc: 'Success rate', trend: '+4.2%' },
    { label: 'Amount Recovered', value: stats.simulated_refund_value ? `₹${Number(stats.simulated_refund_value).toLocaleString('en-IN')}` : '₹0', desc: 'Total refunded', trend: '' },
  ];
  return (
    <section id="analytics" className="metrics-row">
      {items.map((m) => (
        <div key={m.label} className="metric">
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value ?? '—'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-desc">{m.desc}</span>
            {m.trend && <span className="metric-trend trend-up">{m.trend}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}
