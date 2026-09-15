import React, { useCallback, useEffect, useState } from 'react';
import { getAudit, getEscalated, listCases, humanAction } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import CaseCard from '../../components/CaseCard.jsx';
import CasesTable from '../../components/CasesTable.jsx';

export default function CasesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
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
    } catch { push('Could not load escalated queue', 'err'); }
  }, [push]);
  useEffect(() => { load(); }, [load]);
  async function act(id, action) {
    setBusy(id + action);
    try { const r = await humanAction(id, action, `ADMIN ${action}`, 'admin'); push(`${action} done: ${id} → ${r.status}`, 'ok'); setSel(null); await load(); }
    catch (e) { push(e?.response?.data?.error || `${action} failed`, 'err'); }
    setBusy('');
  }
  return (
    <div className="animate-in">
      <div className="hero compact">
        <div><span className="badge">ADMIN · CASES</span><h1>Recent Payment Cases</h1><p>Escalated queue + recent table — moved from anonymous dashboard per your config.</p></div>
        <div className="hero-actions"><button className="btn ghost" onClick={load}>Refresh</button></div>
      </div>
      <div className="card">
        <h3>Escalated cases ({rows.length})</h3>
        {!rows.length && <p className="mut">No escalations.</p>}
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
                    <button className="btn sm" disabled={!!busy} onClick={() => act(c.case_id, 'APPROVE')}>Approve</button>
                    <button className="btn warn sm" disabled={!!busy} onClick={() => act(c.case_id, 'REJECT')}>Reject</button>
                    <button className="btn ghost sm" disabled={!!busy} onClick={() => act(c.case_id, 'CLOSE')}>Close</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cardrow">{rows.map((c) => <CaseCard key={c.case_id} c={c} onOpen={setSel} />)}</div>
      </div>
      <CasesTable />
    </div>
  );
}
