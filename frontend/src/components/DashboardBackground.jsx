import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Tilted, high-energy light-blue gradient backdrop for the dashboard.
// Fixed layer at z-index:-1 so it paints above the page background
// but below ALL content (no stacking changes needed anywhere else).
//
// Perf: animated layers use pre-softened radial/linear gradients with NO
// filter or backdrop-filter, so every frame is a cheap compositor-only
// transform. (Full-screen blur() re-rasterized per frame is what used to
// grind these loops to a halt.)
const BEAMS = [
  { dur: 4.5, x: ['-26%', '26%', '-26%'], y: ['-16%', '17%', '-16%'], s: [1, 1.28, 1], r: [-5, 5, -5] },
  { dur: 5.2, x: ['22%', '-24%', '22%'], y: ['14%', '-15%', '14%'], s: [1.22, 1, 1.22], r: [4, -5, 4] },
  { dur: 5.9, x: ['-24%', '24%', '-24%'], y: ['17%', '-14%', '17%'], s: [1, 1.25, 1], r: [-4, 5, -4] },
  { dur: 6.6, x: ['24%', '-26%', '24%'], y: ['-15%', '16%', '-15%'], s: [1.26, 1, 1.26], r: [5, -4, 5] },
  { dur: 7.3, x: ['-22%', '25%', '-22%'], y: ['15%', '-16%', '15%'], s: [1, 1.24, 1], r: [-5, 4, -5] },
];

export default function DashboardBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="dash-bg" aria-hidden="true">
      <div className="dash-wash" />
      {BEAMS.map((b, i) =>
        reduce ? (
          <span key={i} className={`dash-beam d${i}`} />
        ) : (
          <motion.span
            key={i}
            className={`dash-beam d${i}`}
            style={{ skewX: '-12deg' }}
            initial={{ x: b.x[0], y: b.y[0], scale: b.s[0], rotate: b.r[0] }}
            animate={{ x: b.x, y: b.y, scale: b.s, rotate: b.r }}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}
      {!reduce && (
        <motion.span
          className="dash-sheen"
          style={{ skewX: '-12deg' }}
          initial={{ x: '-130%' }}
          animate={{ x: ['-130%', '130%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
        />
      )}
    </div>
  );
}
