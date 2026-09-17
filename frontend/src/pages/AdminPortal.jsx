import React, { useCallback, useEffect, useState } from 'react';
import { getAudit, getEscalated, listCases, humanAction } from '../services/api.js';
import { useToast } from '../components/Toast.jsx';
import RollButton from '../components/RollButton.jsx';
import CaseCard from '../components/CaseCard.jsx';
import { BentoGrid, BentoItem } from '../components/Bento.jsx';

export default function AdminPortal() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState([]);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      let esc = [];
      try { esc = await getEscalated('admin'); } catch { esc = []; }
      if (!Array.isArray(esc) || !esc.length) {
        const all = await listCases();
        esc = (all || []).filter((c) => c.status === 'ESCALATED');
      }
      setRows(esc);
    } catch { push('Could not load escalated queue', 'err', { scope: 'admin', title: 'Load failed' }); }
    try {
      const a = await getAudit('admin');
      setAudit(Array.isArray(a) ? a : []);
    } catch {}
  }, [push]);

  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    setBusy(id + action);
    try {
      const r = await humanAction(id, action, `ADMIN ${action}`, 'admin');
      push(`${action} done: ${id} → ${r.status}`, 'ok', { scope: 'admin', title: `${action} done` });
      setSel(null);
      await load();
    } catch (e) {
      push(e?.response?.data?.error || `${action} failed`, 'err', { scope: 'admin', title: `${action} failed` });
    }
    setBusy('');
  }

  return (
    <div className="animate-in">
      <BentoGrid>
        <BentoItem className="hero" hover={false}>
          <div>
            <span className="badge">ADMIN PORTAL · SINGLE ADMIN</span>
            <h1>Escalated Queue</h1>
            <p>Human-escalated cases appear <b>only</b> here. Single ADMIN does approve / reject / close + audit log.</p>
          </div>
          <div className="hero-actions"><RollButton className="btn ghost" onClick={load}>Refresh</RollButton></div>
        </BentoItem>
      </BentoGrid>

      <BentoGrid className="grid admin-grid">
        <div>
          <BentoItem className="card">
            <h3>Escalated cases ({rows.length})</h3>
            {!rows.length && <p className="mut">No escalations. High-risk / failed-verification / gateway-failure cases will land here.</p>}
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Case</th><th>Transaction</th><th>Amount</th><th>Risk</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.case_id} className={sel?.case_id === c.case_id ? 'sel' : ''}>
                      <td><button className="link" onClick={() => setSel(c)}>{c.case_id}</button></td>
                      <td>{c.transaction_id}</td>
                      <td>{c.amount ? `₹${Number(c.amount).toLocaleString('en-IN')}` : '—'}</td>
                      <td>{c.risk_level || c.risk_score || '—'}</td>
                      <td><span className={`st ${c.status}`}>{c.status}</span></td>
                      <td className="rowbtns">
                        <RollButton className="btn sm" disabled={!!busy} onClick={() => act(c.case_id, 'APPROVE')}>Approve</RollButton>
                        <RollButton className="btn warn sm" disabled={!!busy} onClick={() => act(c.case_id, 'REJECT')}>Reject</RollButton>
                        <RollButton className="btn ghost sm" disabled={!!busy} onClick={() => act(c.case_id, 'CLOSE')}>Close</RollButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cardrow">
              {rows.map((c) => <CaseCard key={c.case_id} c={c} onOpen={setSel} />)}
            </div>
          </BentoItem>
          {sel && (
            <BentoItem className="card">
              <h3>Selected · {sel.case_id}</h3>
              <div className="kv"><span>Transaction</span><b>{sel.transaction_id}</b></div>
              <div className="kv"><span>Description</span><b>{sel.description || '—'}</b></div>
              <div className="rowbtns">
                <RollButton className="btn sm" onClick={() => act(sel.case_id, 'APPROVE')}>Approve</RollButton>
                <RollButton className="btn warn sm" onClick={() => act(sel.case_id, 'REJECT')}>Reject</RollButton>
                <RollButton className="btn ghost sm" onClick={() => act(sel.case_id, 'CLOSE')}>Close</RollButton>
              </div>
            </BentoItem>
          )}
        </div>
        <div>
          <BentoItem className="card">
            <h3>Audit log ({audit.length})</h3>
            {!audit.length && <p className="mut small">No admin actions yet. Approve/reject/close writes here.</p>}
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Time</th><th>Role</th><th>Action</th><th>Case</th></tr></thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id}><td>{a.timestamp?.slice(0, 19).replace('T', ' ')}</td><td>{a.admin_role}</td><td>{a.action}</td><td>{a.case_id}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoItem>
        </div>
      </BentoGrid>
    </div>
  );
}
