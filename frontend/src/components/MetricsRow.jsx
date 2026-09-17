import React, { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import { BentoGrid, BentoItem } from './Bento.jsx';

function formatValue(v, format) {
  const n = Number(v) || 0;
  if (format === 'percent') return `${n.toFixed(1)}%`;
  if (format === 'inr') return `₹${Math.round(n).toLocaleString('en-IN')}`;
  return Math.round(n).toLocaleString('en-IN');
}

function AnimatedValue({ target, format }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 17 });
  const display = useTransform(spring, (v) => formatValue(v, format));

  useEffect(() => {
    if (reduceMotion || !inView) return;
    mv.set(Number(target) || 0);
  }, [inView, target, mv, reduceMotion]);

  if (reduceMotion) return <span ref={ref}>{formatValue(target, format)}</span>;
  return (
    <motion.span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </motion.span>
  );
}

export default function MetricsRow({ stats = {} }) {
  const items = [
    { label: 'Failed Payments', target: (stats.total_cases ?? 0) - (stats.resolved_cases ?? 0), format: 'int', desc: 'Need attention', trend: '' },
    { label: 'Active Cases', target: stats.active_cases ?? 0, format: 'int', desc: 'In progress', trend: '' },
    { label: 'Recovered', target: stats.resolved_cases ?? 0, format: 'int', desc: 'Auto-resolved', trend: '+12%' },
    { label: 'Refunded', target: stats.total_refunds ?? 0, format: 'int', desc: 'Transactions', trend: '' },
    { label: 'Recovery Rate', target: stats.auto_resolution_rate ?? 0, format: 'percent', desc: 'Success rate', trend: '+4.2%' },
    { label: 'Amount Recovered', target: Number(stats.simulated_refund_value) || 0, format: 'inr', desc: 'Total refunded', trend: '' },
  ];
  return (
    <BentoGrid id="analytics" className="metrics-row">
      {items.map((m) => (
        <BentoItem key={m.label} className="metric">
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">
            <AnimatedValue target={m.target} format={m.format} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-desc">{m.desc}</span>
            {m.trend && <span className="metric-trend trend-up">{m.trend}</span>}
          </div>
        </BentoItem>
      ))}
    </BentoGrid>
  );
}
