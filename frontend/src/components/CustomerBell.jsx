import React, { useEffect, useRef, useState } from 'react';
import { getCustomerCases, subscribeEvents } from '../services/api.js';
import { useToast } from './Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function CustomerBell() {
  const { customerToken } = useAuth();
  const { push } = useToast();
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const subs = useRef([]);

  useEffect(() => {
    if (!customerToken) return;
    let stop = false;
    async function init() {
      try {
        const cases = await getCustomerCases();
        const ids = (cases || []).map((c) => c.case_id).slice(0, 6);
        // close old
        subs.current.forEach((u) => { try { u(); } catch {} });
        subs.current = [];
        for (const id of ids) {
          const unsub = subscribeEvents(id, (m) => {
            if (stop) return;
            setEvents((p) => [{ case_id: id, ...m }, ...p].slice(0, 40));
            push(`${m.message || m.event_type} — ${id}`, m.event_type === 'resolved' ? 'ok' : 'info', { scope: 'customer', title: m.event_type === 'resolved' ? 'Refund completed' : 'Case update' });
          });
          subs.current.push(unsub);
        }
        // also poll notifications for initial
        try {
          const { getCustomerNotifications } = await import('../services/api.js');
          const notifs = await getCustomerNotifications();
          if (!stop && Array.isArray(notifs)) setEvents((p) => [...notifs, ...p].slice(0, 60));
        } catch {}
      } catch {}
    }
    init();
    const id = setInterval(init, 30000);
    return () => { stop = true; clearInterval(id); subs.current.forEach((u) => { try { u(); } catch {} }); };
  }, [customerToken, push]);

  if (!customerToken) return null;
  const unread = events.length;
  return (
    <div className="bellwrap">
      <button className="btn ghost bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications" aria-expanded={open}>
        🔔 {unread > 0 && <span className="dotcount">{Math.min(unread, 99)}</span>}
      </button>
      {open && (
        <div className="belldrop">
          <b>Notifications ({events.length})</b>
          {!events.length && <div className="mut small">No updates yet. Live SSE per open case.</div>}
          {events.slice(0, 12).map((e, i) => <div key={i} className="mut small">{e.message || e.event_type} · {e.case_id}</div>)}
        </div>
      )}
    </div>
  );
}
