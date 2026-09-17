import React from 'react';
import { motion } from 'motion/react';

// motion/loader-skeleton: shimmer placeholder shown while a portal boots.
// Usage: {booting ? <LoaderSkeleton rows={4} /> : <ActualForm />}
export default function LoaderSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`loader-skel ${className}`} aria-hidden="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="loader-bar"
          style={{ width: `${92 - i * 9}%` }}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
        />
      ))}
    </div>
  );
}
