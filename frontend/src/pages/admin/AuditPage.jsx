import React, { useCallback, useEffect, useState } from 'react';
import { getAudit } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import RollButton from '../../components/RollButton.jsx';
import { BentoGrid, BentoItem } from '../../components/Bento.jsx';

export default function AuditPage() {
  const { push } = useToast();
  const [audit, setAudit] = useState([]);
  const load = useCallback(async () => {
    try { const a = await getAudit('admin'); setAudit(Array.isArray(a) ? a : []); } catch { push('Could not load audit log', 'err', { scope: 'admin', title: 'Load failed' }); }
  }, [push]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="animate-in">
      <BentoGrid>
        <BentoItem className="hero compact" hover={false}>
          <div><span className="badge">ADMIN · AUDIT LOG</span><h1>Audit Log</h1><p>Separate route per your latest — all approve/reject/close actions.</p></div>
          <div className="hero-actions"><RollButton className="btn ghost" onClick={load}>Refresh</RollButton></div>
        </BentoItem>
      </BentoGrid>
      <BentoGrid>
        <BentoItem className="card">
          <h3>Audit log ({audit.length})</h3>
          {!audit.length && <p className="mut small">No admin actions yet.</p>}
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
      </BentoGrid>
    </div>
  );
}
