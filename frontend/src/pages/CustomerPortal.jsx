import React, { useEffect, useRef, useState } from 'react';
import { createCase, getCase, getAgents, getEvents, getTxn, getRisk, getRefund, subscribeEvents, getCustomerFailed } from '../services/api.js';
import Timeline from '../components/Timeline.jsx';
import RollButton from '../components/RollButton.jsx';
import EvidencePanel from '../components/EvidencePanel.jsx';
import { BentoGrid, BentoItem } from '../components/Bento.jsx';
import { useToast } from '../components/Toast.jsx';

const AGENTS = ['orchestrator', 'transaction', 'risk', 'resolution', 'communication', 'verification', 'refund', 'escalation'];

export default function CustomerPortal() {
  const { push } = useToast();
  const [desc, setDesc] = useState('');
  // customer auth guard handled by RequireCustomer at route level
  const [txn, setTxn] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [status, setStatus] = useState('');
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState([]);
  const [txnInfo, setTxnInfo] = useState({});
  const [risk, setRisk] = useState({});
  const [refund, setRefund] = useState({});
  const [why, setWhy] = useState('');
  const unsub = useRef(null);
  const [failedList, setFailedList] = useState([]);

  useEffect(() => () => { if (unsub.current) unsub.current(); }, []);
  useEffect(() => {
    getCustomerFailed().then((r) => {
      if (Array.isArray(r) && r.length) {
        setFailedList(r);
        const f = r[0];
        setTxn(f.transaction_id);
        setDesc(`Payment to ${f.merchant} of ₹${Number(f.amount).toLocaleString('en-IN')} failed (UTR ${f.utr_number}). Money ${f.debited ? 'debited but not credited to merchant' : 'not debited due to technical failure'} — please resolve.`);
      }
    }).catch(() => {});
  }, []);

  async function refresh(id) {
    try {
      const [c, a, e, t, r, f] = await Promise.all([getCase(id), getAgents(id), getEvents(id), getTxn(id), getRisk(id), getRefund(id)]);
      setAgents(a); setEvents(e); setTxnInfo(t); setRisk(r); setRefund(f);
      if (c?.status) {
        setStatus(c.status);
        if (c.status === 'RESOLVED') push(`Refund completed for ${id}`, 'ok', { scope: 'customer', title: 'Refund completed' });
      }
      const res = a.find((x) => x.agent === 'resolution');
      if (res?.output) {
        const o = res.output;
        setWhy(`Decision: ${o.decision}\n\nEvidence:\n✓ Transaction ${t.status || ''}\n✓ Debited: ${String(t.debited)}\n✓ Merchant credited: ${String(t.merchant_credited)}\n✓ Existing refund: ${t.refund_status}\n✓ Risk score = ${r.risk_score} (${r.risk_level})\n✓ Auto-resolution: ${r.automatic_resolution_allowed ? 'ALLOWED' : 'BLOCKED'}\n\nReason: ${o.reason}\nConfidence: ${Math.round((o.confidence || 0) * 100)}%`);
      }
    } catch {}
  }

  async function run(d, t) {
    setLoading(true); setLive([]); setStatus('RUNNING');
    if (unsub.current) { unsub.current(); unsub.current = null; }
    try {
      const c = await createCase({ customer_name: 'Demo Customer', customer_email: 'demo@example.com', description: d || desc, transaction_id: t || txn || undefined });
      setCaseId(c.case_id); setStatus(c.status);
      unsub.current = subscribeEvents(c.case_id, (m) => {
        setLive((p) => [...p.slice(-200), m]);
        if (/escalat/i.test(m.message || '')) push(`Update on ${c.case_id}: under review`, 'warn', { scope: 'customer', title: 'Under review' });
      });
      await refresh(c.case_id);
    } catch { push('Backend not reachable on :8000', 'err', { scope: 'customer', title: 'Connection failed' }); }
    setLoading(false);
  }

  const agentState = (n) => agents.find((a) => a.agent === n)?.status || 'WAITING';
  const isEscalated = status === 'ESCALATED';
  const isResolved = status === 'RESOLVED';

  return (
    <div className="animate-in">
      <BentoGrid>
        <BentoItem className="hero compact" hover={false}>
          <div>
            <span className="badge">CUSTOMER PORTAL · LIVE</span>
            <h1 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>Report a failed payment</h1>
            <p>Describe the issue — agents investigate and refund when safe.</p>
          </div>
          <div className="hero-actions">
            <RollButton className="btn" onClick={() => run()} disabled={loading}>{loading ? 'Resolving…' : 'Resolve Automatically'}</RollButton>
          </div>
        </BentoItem>
      </BentoGrid>

      {isResolved && (
        <div className="banner ok" role="status">
          ✅ Refund Completed — Refund ID: {refund.refund_id || txnInfo.refund_id || '—'}
          {txnInfo.amount ? ` · ₹${Number(txnInfo.amount).toLocaleString('en-IN')}` : ''} · Case {caseId}
        </div>
      )}
      {isEscalated && (
        <div className="banner warn" role="status">Escalated to admin team — our specialists are reviewing it. No further action needed from you.</div>
      )}

      <BentoGrid className="grid">
        <div>
          <BentoItem className="card">
            <h3>Customer Support Interface {caseId && `· ${caseId} · ${status}`}</h3>
            {failedList.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {failedList.map((f) => (
                  <div key={f.transaction_id} className="casecard" style={{ marginBottom: 8 }}>
                    <div className="casecard-top"><b>{f.merchant} · ₹{Number(f.amount).toLocaleString('en-IN')}</b><span className="st FAILED">FAILED</span></div>
                    <div className="mut small">{f.transaction_id} · UTR {f.utr_number} · {f.debited ? 'Debited, merchant not credited' : 'Not debited — technical failure'}</div>
                    <div className="mut small">Operations: {(f.operations || ['RESOLVE']).join(', ')}</div>
                  </div>
                ))}
              </div>
            )}
            <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe your problem..." />
            <input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="Transaction ID (optional)" />
            <RollButton className="btn" disabled={loading} onClick={() => run()}>{loading ? 'Resolving…' : 'Resolve'}</RollButton>
          </BentoItem>

          {!isEscalated && (
            <>
              <BentoItem className="card">
                <h3>Live Agent Timeline</h3>
                <div className="agentgrid">{AGENTS.map((a) => (
                  <div className="agent" key={a}>
                    <div className="agent-head"><b>{a.toUpperCase()}</b><span className={`dot dot-${agentState(a)}`} aria-hidden="true" /></div>
                    <span className={`st ${agentState(a)}`}>{agentState(a)}</span>
                    <div className="tool">{agents.find((x) => x.agent === a)?.tool_used || ''}</div>
                  </div>))}
                </div>
              </BentoItem>
              <BentoItem className="card">
                <h3>Agent Activity Timeline (real-time)</h3>
                <Timeline agents={agents} events={events} live={live} />
              </BentoItem>
              <EvidencePanel why={why} txn={txnInfo} risk={risk} />
            </>
          )}
        </div>

        <div>
          {!isEscalated ? (
            <>
              <BentoItem className="card"><h3>Transaction Panel</h3>
                {[['Transaction ID', txnInfo.transaction_id], ['Amount', txnInfo.amount && `₹${Number(txnInfo.amount).toLocaleString('en-IN')}`], ['Method', txnInfo.payment_method], ['Merchant', txnInfo.merchant], ['Status', txnInfo.status], ['Debited', String(txnInfo.debited ?? '')], ['Merchant credited', String(txnInfo.merchant_credited ?? '')], ['Settlement', txnInfo.settlement_status], ['Refund', `${txnInfo.refund_status || ''} ${txnInfo.refund_id || ''}`]].map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
              </BentoItem>
              <BentoItem className="card"><h3>Risk Panel</h3>
                <div>Risk Score: <b>{risk.risk_score ?? '–'}/100 ({risk.risk_level})</b></div>
                <div className="riskbar"><i style={{ width: `${risk.risk_score || 0}%` }} /></div>
                <div>Automatic Resolution: <b>{risk.automatic_resolution_allowed ? 'ALLOWED' : 'BLOCKED'}</b></div>
                {(risk.reasons || []).map((r, i) => <div key={i} className="reason">✓ {r}</div>)}
              </BentoItem>
              <BentoItem className="card"><h3>Refund Panel</h3>
                {[['Refund ID', refund.refund_id], ['Amount', refund.amount && `₹${Number(refund.amount).toLocaleString('en-IN')}`], ['Status', refund.status], ['Case', status]].map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
                {refund.failure_reason && <div className="err">{refund.failure_reason}</div>}
              </BentoItem>
            </>
          ) : (
            <BentoItem className="card"><h3>Case Status</h3><p className="mut">Hidden while under admin review.</p></BentoItem>
          )}
        </div>
      </BentoGrid>
    </div>
  );
}
