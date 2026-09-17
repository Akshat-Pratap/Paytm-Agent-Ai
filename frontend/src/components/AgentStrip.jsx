import React from 'react';
import { motion } from 'motion/react';
import { bentoContainer, bentoItem } from './Bento.jsx';
import BorderBeam from './BorderBeam.jsx';

const AGENTS = [
  { key: 'detect', name: 'Detect', duty: 'Capture payment failure', icon: '◉' },
  { key: 'decide', name: 'Decide', duty: 'Route to recovery', icon: '⬢' },
  { key: 'investigate', name: 'Investigate', duty: 'Fetch txn & history', icon: '◎' },
  { key: 'verify', name: 'Verify', duty: 'Customer & debit check', icon: '✓' },
  { key: 'risk', name: 'Risk Check', duty: 'Score & gate', icon: '⚡' },
  { key: 'resolve', name: 'Resolve', duty: 'Refund idempotently', icon: '↻' },
  { key: 'learn', name: 'Learn', duty: 'Audit & improve', icon: '◈' },
];

export default function AgentStrip() {
  return (
    <BorderBeam duration={7}>
    <motion.section
      id="agents"
      className="agents-section bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      <div className="agents-header">
        <div>
          <h2>7 AI Agents. One Recovery System.</h2>
          <p>Specialized agents linked as a single workflow — not isolated cards.</p>
        </div>
        <span className="badge">LIVE SYSTEM</span>
      </div>
      <motion.div
        className="agent-strip"
        variants={bentoContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {AGENTS.map((a, i) => (
          <React.Fragment key={a.key}>
            <motion.div
              className="agent-card"
              variants={bentoItem}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="agent-icon">{a.icon}</div>
              <b>{a.name}</b>
              <p>{a.duty}</p>
              <span className="small" style={{ color: 'var(--grn)', fontWeight: 600 }}>● Active</span>
            </motion.div>
            {i < AGENTS.length - 1 && <div className="agent-arrow">→</div>}
          </React.Fragment>
        ))}
      </motion.div>
    </motion.section>
    </BorderBeam>
  );
}
