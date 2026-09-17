import React from 'react';
import { motion } from 'motion/react';
import { bentoContainer, bentoItem } from './Bento.jsx';

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
    <motion.div
      className="card bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <h3>Payment Recovery Pipeline</h3>
      <motion.div
        className="pipeline"
        variants={bentoContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <motion.div className="pipeline-step" variants={bentoItem}>
              <div className={`pipeline-dot ${i < STEPS.length - 1 ? 'done' : 'active'}`}>{i + 1}</div>
              <div className="pipeline-label">{s.label}</div>
              <div className="pipeline-sub">{s.sub}</div>
            </motion.div>
            {i < STEPS.length - 1 && <div className="pipeline-line" />}
          </React.Fragment>
        ))}
      </motion.div>
    </motion.div>
  );
}
