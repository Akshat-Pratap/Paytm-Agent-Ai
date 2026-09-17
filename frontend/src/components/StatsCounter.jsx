import React, { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';

// motion stats-counter — animated count-up number for dashboard cards.
// Usage: <StatsCounter value={5} /> | <StatsCounter value={90.9} format="percent" /> | <StatsCounter value={4890} format="inr" />
export default function StatsCounter({ value = 0, format = 'int', decimals = 0, prefix = '', suffix = '', className = '', style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 17 });

  function fmt(v) {
    const n = Number(v) || 0;
    let out;
    if (format === 'percent') out = n.toFixed(decimals || 1);
    else if (format === 'inr') out = `₹${Math.round(n).toLocaleString('en-IN')}`;
    else if (decimals > 0) out = n.toFixed(decimals);
    else out = Math.round(n).toLocaleString('en-IN');
    if (format === 'percent') out += '%';
    return `${prefix}${out}${suffix}`;
  }

  const display = useTransform(spring, fmt);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    mv.set(Number(value) || 0);
  }, [inView, value, mv, reduceMotion]);

  if (reduceMotion) {
    return <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{fmt(value)}</span>;
  }
  return (
    <motion.span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {display}
    </motion.span>
  );
}
