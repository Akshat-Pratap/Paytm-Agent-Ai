import React, { useEffect, useRef, useState } from 'react';
import { getEscalatedCount } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

export default function NotificationBell() {
  const { isAdmin, role } = useAuth();
  const { push } = useToast();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const prev = useRef(0);

  useEffect(() => {
    if (!isAdmin) return;
    let stop = false;
    async function poll() {
      try {
        const list = await getEscalatedCount(role);
        if (stop) return;
        setItems(Array.isArray(list) ? list.slice(0, 8) : []);
        setCount(Array.isArray(list) ? list.length : 0);
        if (Array.isArray(list) && list.length > prev.current && prev.current > 0) {
          const n = list[0];
          push(`New escalation: ${n.case_id || 'Case'}`, 'warn');
        }
        prev.current = Array.isArray(list) ? list.length : 0;
      } catch {}
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [isAdmin, role, push]);

  if (!isAdmin) return null;

  return (
    <div className="bellwrap">
      <button className="btn ghost bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications" aria-expanded={open}>
        🔔 {count > 0 && <span className="dotcount">{count}</span>}
      </button>
      {open && (
        <div className="belldrop">
          <b>Escalations ({count})</b>
          {!items.length && <div className="mut small">No escalated cases.</div>}
          {items.map((c) => <div key={c.case_id} className="mut small">⚠ {c.case_id} · {c.transaction_id}</div>)}
        </div>
      )}
    </div>
  );
}
