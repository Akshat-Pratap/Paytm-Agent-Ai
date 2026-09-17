import React, { useState } from 'react';
import { motion } from 'motion/react';
import { bentoItem } from './Bento.jsx';

export default function EvidencePanel({ why, txn, risk }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      className="card bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
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
    </motion.div>
  );
}
