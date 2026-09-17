import React from 'react';
import { motion } from 'motion/react';
import { bentoItem } from './Bento.jsx';

export default function Footer() {
  return (
    <motion.footer
      className="footer bento-item"
      variants={bentoItem}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Autonomous Hub</div>
        <div className="small" style={{ color: 'var(--mut)' }}>Payments fail. AI restores trust. 7 agents, human-in-the-loop.</div>
      </div>
      <div><h4>Product</h4><a href="#agents">Agents</a><a href="#cases">Cases</a><a href="#analytics">Analytics</a></div>
      <div><h4>Agents</h4><a href="#agents">Detect</a><a href="#agents">Verify</a><a href="#agents">Resolve</a></div>
      <div><h4>Security</h4><a href="#">Trust</a><a href="#">Audit Log</a><a href="#">Privacy</a></div>
      <div><h4>Docs</h4><a href="#">Documentation</a><a href="#">Contact</a><a href="#">© 2026</a></div>
    </motion.footer>
  );
}
