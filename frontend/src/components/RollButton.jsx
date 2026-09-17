import React from 'react';
import { motion } from 'motion/react';

// Rolling-text stagger button (hover only).
// Renders per-character roll: two stacked copies, hover rolls y 0 → -100% staggered.
// Disabled / reduced-motion / non-string children fall back to plain label.
function renderChars(text, variant) {
  return String(text).split('').map((ch, i) => (
    <motion.span
      key={`${variant}-${i}`}
      className="roll-ch"
      variants={{
        rest: { y: variant === 'top' ? '0%' : '100%' },
        hover: { y: variant === 'top' ? '-100%' : '0%' },
      }}
      transition={{ delay: i * 0.015, duration: 0.25, ease: 'easeOut' }}
      aria-hidden="true"
    >
      {ch === ' ' ? '\u00A0' : ch}
    </motion.span>
  ));
}

export default function RollButton({ children, className = '', disabled, ...props }) {
  const isPlainString = typeof children === 'string';
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fallback: icons, elements, loading/disabled states render statically
  if (!isPlainString || disabled || reduceMotion) {
    return (
      <button className={className} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      className={`btn-roll ${className}`}
      disabled={disabled}
      initial="rest"
      whileHover="hover"
      animate="rest"
      {...props}
    >
      <span className="roll-mask">
        <span className="roll-col">{renderChars(children, 'top')}</span>
        <span className="roll-col roll-dup" aria-hidden="true">{renderChars(children, 'bottom')}</span>
      </span>
      <span className="sr-only">{children}</span>
    </motion.button>
  );
}
