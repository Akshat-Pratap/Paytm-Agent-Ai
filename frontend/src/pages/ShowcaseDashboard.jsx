import React, { useEffect, useState } from 'react';
import { getStats } from '../services/api.js';
import MetricsRow from '../components/MetricsRow.jsx';
import RollButton from '../components/RollButton.jsx';
import AgentStrip from '../components/AgentStrip.jsx';
import Pipeline from '../components/Pipeline.jsx';
import TrustSection from '../components/TrustSection.jsx';
import Footer from '../components/Footer.jsx';
import { BentoGrid, BentoItem } from '../components/Bento.jsx';

export default function ShowcaseDashboard({ onAuthClick }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add('in');
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function scrollToHow() {
    document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="showcase animate-in">
      {/* Hero — compact, hierarchy */}
      <BentoGrid className="show-hero" id="overview">
        <BentoItem hover={false}>
          <span className="badge">AI OPERATIONS · 7 AGENTS</span>
          <h1 className="show-title">Payments fail.<br />AI restores trust.</h1>
          <p className="show-sub">7 specialized AI agents detect risk, investigate failures, enforce safety gates, and recover payments — with human approval when needed.</p>
          <div className="show-cta">
            <RollButton className="btn" onClick={onAuthClick}>Login / Sign up</RollButton>
            <RollButton className="btn ghost" onClick={scrollToHow}>View how it works</RollButton>
          </div>
        </BentoItem>
        <BentoItem hover={false} style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360, border: '1px solid var(--line)', borderRadius: 16, padding: 16, background: 'var(--panel)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--mut)', marginBottom: 10 }}>System Preview</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {['Detect failure', 'Investigate • Verify', 'Risk gate • Resolve'].map((t) => (
                <div key={t} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 13, background: 'var(--card2)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t}</span><span style={{ color: 'var(--grn)' }}>●</span>
                </div>
              ))}
            </div>
          </div>
        </BentoItem>
      </BentoGrid>

      {/* Metrics */}
      <div id="analytics">
      {loading ? (
        <div className="metrics-row">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="metric skeleton" style={{ height: 92 }} />)}</div>
      ) : (
        <MetricsRow stats={stats} />
      )}
      </div>

      <div id="agents"><AgentStrip /></div>

      <Pipeline />

      <TrustSection />

      <Footer />
    </div>
  );
}
