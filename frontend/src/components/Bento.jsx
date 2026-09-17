import React from 'react';
import { motion, stagger, useReducedMotion } from 'motion/react';

// motion/bento-staggered — scroll-triggered staggered bento reveals
// with hover micro-interactions. Parent orchestrates children via
// delayChildren: stagger(...); children just use `bentoItem` variants.
export const bentoContainer = {
  hidden: {},
  show: {
    transition: {
      delayChildren: stagger(0.08, { startDelay: 0.08 }),
    },
  },
};

export const bentoItem = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function BentoGrid({ children, className = '', ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={bentoContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function BentoItem({ children, className = '', hover = true, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div
      className={`bento-item ${className}`.trim()}
      variants={bentoItem}
      whileHover={hover ? { y: -3, transition: { duration: 0.2, ease: 'easeOut' } } : undefined}
      whileFocus={hover ? { y: -3 } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
