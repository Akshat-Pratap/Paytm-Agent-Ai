import React, { useEffect, useState } from 'react';
import { listCases, getEvents } from '../../services/api.js';
import ActivityFeed from '../../components/ActivityFeed.jsx';
import Timeline from '../../components/Timeline.jsx';

export default function ActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const cases = await listCases();
        const slice = (cases || []).slice(0, 6);
        const all = [];
        for (const c of slice) {
          try { const ev = await getEvents(c.case_id); all.push(...(ev || []).map((e) => ({ ...e, case_id: c.case_id }))); } catch {}
        }
        all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (!stop) setEvents(all.slice(0, 40));
      } catch {}
      if (!stop) setLoading(false);
    }
    load();
    return () => { stop = true; };
  }, []);
  return (
    <div className="animate-in">
      <div className="hero compact">
        <div><span className="badge">ADMIN · ACTIVITY</span><h1>Agent Activity</h1><p>Live feed aggregated from recent cases — moved from showcase.</p></div>
      </div>
      {loading ? <div className="card skeleton" style={{ height: 120 }} /> : <ActivityFeed />}
      <div className="card">
        <h3>Recent events ({events.length})</h3>
        <Timeline events={events} agents={[]} live={[]} />
      </div>
    </div>
  );
}
