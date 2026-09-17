import React from 'react';
import { motion } from 'motion/react';
import { bentoContainer, bentoItem } from './Bento.jsx';

const ITEMS = [
  { icon: '✓', title: 'Human Approval', desc: 'Escalated cases require ADMIN approve.' },
  { icon: '⚡', title: 'Risk Scoring', desc: 'Deterministic scoring, not LLM guess.' },
  { icon: '◈', title: 'Verification Gates', desc: 'Safety gate blocks unsafe refunds.' },
  { icon: '≡', title: 'Audit Trail', desc: 'Every action logged & traceable.' },
  { icon: '↻', title: 'Reversible', desc: 'Idempotent refunds, safe retries.' },
];

export default function TrustSection() {
  return (
    <motion.div
      className="card bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <h3>Trust & Safety</h3>
      <p className="mut small" style={{ marginBottom: 12 }}>Payments demand auditability. Every recovery is gated, verified, and logged.</p>
      <motion.div
        className="trust-grid"
        variants={bentoContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {ITEMS.map((it) => (
          <motion.div key={it.title} className="trust-item" variants={bentoItem}>
            <div className="trust-icon">{it.icon}</div>
            <div><b style={{ fontSize: 12 }}>{it.title}</b><div className="small" style={{ color: 'var(--mut)' }}>{it.desc}</div></div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
