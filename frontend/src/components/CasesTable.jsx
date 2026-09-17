import React from 'react';
import { motion } from 'motion/react';
import { bentoItem } from './Bento.jsx';
import StatsCounter from './StatsCounter.jsx';

const SAMPLE = [
  { case: 'CASE-1021', customer: 'Aarav Sharma', reason: 'UPI Timeout', risk: 'Low', agent: 'Risk', status: 'Investigating', amount: '₹2,000', updated: '2 min ago' },
  { case: 'CASE-1022', customer: 'Priya Nair', reason: 'Bank Decline', risk: 'Medium', agent: 'Verify', status: 'Awaiting Verification', amount: '₹50,000', updated: '8 min ago' },
  { case: 'CASE-1023', customer: 'Rohan Das', reason: 'Duplicate Debit', risk: 'High', agent: 'Resolve', status: 'Recovery Ready', amount: '₹3,500', updated: '14 min ago' },
  { case: 'CASE-1024', customer: 'Sana Ali', reason: 'Gateway Error', risk: 'Low', agent: 'Refund', status: 'Resolved', amount: '₹2,200', updated: '1 hr ago' },
  { case: 'CASE-1025', customer: 'Kabir Mehta', reason: 'Insufficient Funds', risk: 'Medium', agent: 'Escalation', status: 'Escalated', amount: '₹12,000', updated: '2 hr ago' },
];

function riskDot(risk) {
  const c = risk === 'High' ? 'var(--red)' : risk === 'Medium' ? 'var(--amb)' : 'var(--grn)';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: c, display: 'inline-block' }} />{risk}</span>;
}

export default function CasesTable() {
  return (
    <motion.div
      id="cases"
      className="card bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Recent Payment Cases</h3>
        <span className="small" style={{ color: 'var(--mut)' }}><StatsCounter value={SAMPLE.length} /> cases</span>
      </div>
      <div className="tablewrap">
        <table className="tbl">
          <thead><tr><th>Case</th><th>Customer</th><th>Failure Reason</th><th>Risk</th><th>Agent</th><th>Status</th><th>Amount</th><th>Updated</th></tr></thead>
          <tbody>
            {SAMPLE.map((r) => (
              <tr key={r.case}>
                <td><b style={{ fontWeight: 600 }}>{r.case}</b></td>
                <td>{r.customer}</td>
                <td>{r.reason}</td>
                <td>{riskDot(r.risk)}</td>
                <td>{r.agent}</td>
                <td><span className={`st ${r.status === 'Resolved' ? 'COMPLETED' : r.status === 'Escalated' ? 'ESCALATED' : 'WAITING'}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--line)' }}>{r.status}</span></td>
                <td><b>{r.amount}</b></td>
                <td style={{ color: 'var(--mut)', whiteSpace: 'nowrap' }}>{r.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
