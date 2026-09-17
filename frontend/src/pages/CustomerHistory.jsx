import React, { useEffect, useState } from 'react';
import { getCustomerTransactions } from '../services/api.js';
import { BentoGrid, BentoItem } from '../components/Bento.jsx';

function statusClass(s) {
  if (s === 'SUCCESS') return 'COMPLETED';
  if (s === 'FAILED') return 'FAILED';
  return 'WAITING';
}

export default function CustomerHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCustomerTransactions().then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="animate-in">
      <BentoGrid>
        <BentoItem className="hero compact" hover={false}>
          <div><span className="badge">TRANSACTION HISTORY</span><h1 style={{ fontSize: 'clamp(22px,3vw,30px)' }}>All transactions</h1><p>Success, failed and refunded — including “Refunded to Bank”.</p></div>
        </BentoItem>
      </BentoGrid>
      <BentoGrid>
        <BentoItem className="card">
          <h3>History ({rows.length})</h3>
          {loading ? <div className="skeleton" style={{ height: 120 }} /> : !rows.length ? <p className="mut">No transactions yet.</p> : (
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Merchant</th><th>UTR</th><th>Amount</th><th>Status</th><th>Refund</th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.transaction_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.created_at?.slice(0, 10)} {t.created_at?.slice(11, 16)}</td>
                      <td><b>{t.merchant}</b><div className="mut small">{t.transaction_id}</div></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.utr_number || '—'}</td>
                      <td><b>₹{Number(t.amount).toLocaleString('en-IN')}</b></td>
                      <td><span className={`st ${statusClass(t.status)}`}>{t.merchant === 'Refunded to Bank' ? 'REFUNDED' : t.status}</span></td>
                      <td>{t.refund_id ? `${t.refund_status} ${t.refund_id}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
