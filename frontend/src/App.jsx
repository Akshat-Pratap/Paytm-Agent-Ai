import React, { useState, useEffect, useRef } from 'react';
import { createCase, getCase, getAgents, getEvents, getTxn, getRisk, getRefund, getStats, humanAction, subscribeEvents } from './services/api.js';
import { useTheme } from './theme.jsx';

const DEMOS = [
  { label: '▶ Run Successful Refund Demo', desc: 'My ₹2,000 UPI payment failed but money was deducted.', txn: 'TXN-DEMO-001' },
  { label: '▶ Run High Risk Demo', desc: 'My ₹50,000 UPI payment failed but money was deducted. High risk review.', txn: 'TXN-DEMO-002' },
  { label: '▶ Run Pending Demo', desc: 'My payment is pending but money was deducted, please check.', txn: 'TXN-DEMO-003' },
  { label: '▶ Run Already Refunded Demo', desc: 'Already refunded case, money deducted but refund received?', txn: 'TXN-DEMO-004' },
  { label: '▶ Run Refund Failure Demo', desc: 'Refund fail gateway fail simulation for my deducted payment.', txn: 'TXN-DEMO-005' },
];
const AGENTS = ['orchestrator','transaction','risk','resolution','communication','verification','refund','escalation'];

export default function App() {
  const { theme, toggle } = useTheme();
  const [desc, setDesc] = useState(DEMOS[0].desc);
  const [txn, setTxn] = useState(DEMOS[0].txn);
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [status, setStatus] = useState('');
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState([]);
  const [txnInfo, setTxnInfo] = useState({});
  const [risk, setRisk] = useState({});
  const [refund, setRefund] = useState({});
  const [stats, setStats] = useState({});
  const [why, setWhy] = useState('');

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  async function refresh(id) {
    try {
      const [c, a, e, t, r, f] = await Promise.all([getCase(id), getAgents(id), getEvents(id), getTxn(id), getRisk(id), getRefund(id)]);
      setAgents(a); setEvents(e); setTxnInfo(t); setRisk(r); setRefund(f);
      if (c && c.status) setStatus(c.status);
      const res = a.find(x => x.agent === 'resolution');
      if (res && res.output) {
        const o = res.output;
        setWhy(`Decision: ${o.decision}\n\nEvidence:\n✓ Transaction ${t.status || ''}\n✓ Debited: ${String(t.debited)}\n✓ Merchant credited: ${String(t.merchant_credited)}\n✓ Existing refund: ${t.refund_status}\n✓ Risk score = ${r.risk_score} (${r.risk_level})\n✓ Auto-resolution: ${r.automatic_resolution_allowed ? 'ALLOWED' : 'BLOCKED'}\n\nReason: ${o.reason}\nConfidence: ${Math.round((o.confidence || 0) * 100)}%`);
      }
    } catch {}
  }

  const liveUnsub = useRef(null);
  useEffect(() => () => { if (liveUnsub.current) liveUnsub.current(); }, []);

  async function run(d, t) {
    setLoading(true); setLive([]); setStatus('RUNNING');
    if (liveUnsub.current) { liveUnsub.current(); liveUnsub.current = null; }
    try {
      const c = await createCase({ customer_name: 'Demo Customer', customer_email: 'demo@example.com', description: d || desc, transaction_id: t || txn || undefined });
      setCaseId(c.case_id); setStatus(c.status);
      // SSE now replays persisted history, so subscribe first then refresh
      const unsub = subscribeEvents(c.case_id, (m) => { setLive(p => [...p.slice(-200), m]); });
      liveUnsub.current = unsub;
      await refresh(c.case_id);
      await getStats().then(setStats).catch(() => {});
    } catch (e) { alert('Backend not reachable. Start backend on :8000.'); }
    setLoading(false);
  }

  async function act(a) {
    await humanAction(caseId, a, 'operator action from dashboard');
    refresh(caseId);
  }

  const agentState = (n) => agents.find(a => a.agent === n)?.status || 'WAITING';
  const statusClass = status ? `pill st-${status}` : 'pill';

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">A</div>
          <div>
            <div className="brand-title">Autonomous Resolution Hub</div>
            <div className="brand-sub">Payment failure investigation &amp; refunds</div>
          </div>
        </div>
        <div className="top-actions">
          {status && <span className={statusClass}>{status}</span>}
          <button className="btn ghost theme-toggle" onClick={toggle} aria-pressed={theme === 'light'} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      <div className="hero">
        <div>
          <span className="badge">AUTONOMOUS AI TEAMMATES</span>
          <h1>Autonomous Resolution Hub</h1>
          <p><b>AI teammates that don&apos;t just answer — they resolve.</b></p>
          <p>Detect. Investigate. Decide. Resolve. Humans only for exceptions.</p>
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={() => run()}>Start Resolution</button>
          <button className="btn ghost" onClick={() => run(DEMOS[0].desc, DEMOS[0].txn)}>View Demo</button>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <h3>Customer Support Interface {caseId && `· ${caseId} · ${status}`}</h3>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your problem..." />
            <input value={txn} onChange={e => setTxn(e.target.value)} placeholder="Transaction ID (optional)" />
            <button className="btn" disabled={loading} onClick={() => run()}>{loading ? 'Resolving…' : 'Resolve Automatically'}</button>
            {DEMOS.map(d => <button key={d.label} className="btn ghost" onClick={() => { setDesc(d.desc); setTxn(d.txn); run(d.desc, d.txn); }}>{d.label}</button>)}
          </div>

          <div className="card">
            <h3>Live Agent Control Center</h3>
            <div className="agentgrid">{AGENTS.map(a => (
              <div className="agent" key={a}>
                <div className="agent-head"><b>{a.toUpperCase()}</b><span className={`dot dot-${agentState(a)}`} aria-hidden="true" /></div>
                <span className={`st ${agentState(a)}`}>{agentState(a)}</span>
                <div className="tool">{agents.find(x => x.agent === a)?.tool_used || ''}</div>
              </div>))}
            </div>
          </div>

          <div className="card">
            <h3>Agent Activity Timeline (real-time)</h3>
            <div className="tl">
              {live.map((m, i) => <div key={'l' + i}>⚡ [{m.agent_name}] {m.message}</div>)}
              {events.map((e, i) => <div key={i}>✓ [{e.agent}] {e.message}</div>)}
              {!events.length && !live.length && <div>No activity yet — run a demo.</div>}
            </div>
          </div>

          <div className="card">
            <h3>Why did the AI decide this? (auditable explanation)</h3>
            <pre className="why">{why || 'Run a case to see evidence, policy checks, action and result.'}</pre>
          </div>
        </div>

        <div>
          <div className="card"><h3>Transaction Panel</h3>
            {[['Transaction ID', txnInfo.transaction_id], ['Amount', txnInfo.amount && `₹${Number(txnInfo.amount).toLocaleString('en-IN')}`], ['Method', txnInfo.payment_method], ['Merchant', txnInfo.merchant], ['Status', txnInfo.status], ['Debited', String(txnInfo.debited ?? '')], ['Merchant credited', String(txnInfo.merchant_credited ?? '')], ['Settlement', txnInfo.settlement_status], ['Refund', `${txnInfo.refund_status || ''} ${txnInfo.refund_id || ''}`]].map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
          <div className="card"><h3>Risk Panel</h3>
            <div>Risk Score: <b>{risk.risk_score ?? '–'}/100 ({risk.risk_level})</b></div>
            <div className="riskbar"><i style={{ width: `${risk.risk_score || 0}%` }} /></div>
            <div>Automatic Resolution: <b>{risk.automatic_resolution_allowed ? 'ALLOWED' : 'BLOCKED'}</b></div>
            {(risk.reasons || []).map((r, i) => <div key={i} className="reason">✓ {r}</div>)}
          </div>
          <div className="card"><h3>Refund Panel</h3>
            {[['Refund ID', refund.refund_id], ['Amount', refund.amount && `₹${Number(refund.amount).toLocaleString('en-IN')}`], ['Status', refund.status], ['Case', status]].map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
            {refund.failure_reason && <div className="err">{refund.failure_reason}</div>}
          </div>
          {status === 'ESCALATED' && (
            <div className="card alert"><h3>⚠ Human Intervention Required · {caseId}</h3>
              <p className="mut">AI could not safely auto-resolve. Review evidence, then approve/reject/close.</p>
              <button className="btn" onClick={() => act('APPROVE')}>Approve Resolution</button>
              <button className="btn warn" onClick={() => act('REJECT')}>Reject</button>
              <button className="btn ghost" onClick={() => act('CLOSE')}>Close Case</button>
            </div>)}
          <div className="card"><h3>Dashboard</h3>
            <div className="stats">
              {[['Total Cases', stats.total_cases], ['Resolved', stats.resolved_cases], ['Escalated', stats.escalated_cases], ['Auto Rate %', stats.auto_resolution_rate], ['Refunds ₹', stats.simulated_refund_value], ['Avg sec', stats.avg_resolution_sec]].map(([k, v]) => <div className="stat" key={k}><b>{v ?? '–'}</b><span>{k}</span></div>)}
            </div>
            <p className="mut small">Autonomy: routine 100% autonomous · high-risk → human review required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
