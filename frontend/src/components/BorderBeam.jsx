import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// motion/border-beam — a glowing beam that travels around the card border.
// conic-gradient ring masked to a 2px edge; motion sweeps --bb-angle 360°.
export default function BorderBeam({ children, className = '', innerClassName = '', duration = 7 }) {
  const reduce = useReducedMotion();
  return (
    <div className={`bb ${className}`.trim()}>
      {reduce ? (
        <div className="bb-beam" aria-hidden="true" />
      ) : (
        <motion.div
          className="bb-beam"
          aria-hidden="true"
          initial={{ '--bb-angle': '0deg' }}
          animate={{ '--bb-angle': '360deg' }}
          transition={{ duration, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <div className={`bb-inner ${innerClassName}`.trim()}>{children}</div>
    </div>
  );
}
