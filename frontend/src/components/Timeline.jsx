import React from 'react';

export default function Timeline({ agents = [], events = [], live = [] }) {
  return (
    <div className="tl">
      {live.map((m, i) => <div key={'l' + i}>⚡ [{m.agent_name}] {m.message}</div>)}
      {events.map((e, i) => <div key={i}>✓ [{e.agent}] {e.message}</div>)}
      {!events.length && !live.length && <div>No activity yet — run a demo.</div>}
      {!!agents.length && (
        <div className="mut small" style={{ marginTop: 8 }}>
          {agents.map((a) => `${a.agent}:${a.status}`).join(' · ')}
        </div>
      )}
    </div>
  );
}
