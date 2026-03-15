import type { TimelineEvent } from './types';

const TYPE_COLORS: Record<string, string> = {
  quake: '#4d9fff',
  disaster: '#ff6b00',
  volcano: '#ff3d6b',
  news: '#00bfff',
  geo: '#ff2255',
  vessel: '#00d4a0',
};

const TYPE_ICONS: Record<string, string> = {
  quake: 'SEISMIC',
  disaster: 'DISASTER',
  volcano: 'VOLCANIC',
  news: 'INTEL',
  geo: 'GEO-POL',
  vessel: 'MARITIME',
};

interface Props {
  events: TimelineEvent[];
  selectedType: string | null;
}

export function TimelineEventList({ events, selectedType }: Props) {
  const filtered = selectedType ? events.filter((e) => e.type === selectedType) : events;
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const fmt = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', height: '100%' }}>
      {sorted.length === 0 && (
        <div style={{ color: 'var(--dim)', textAlign: 'center', padding: '32px 0', fontSize: 12, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 2 }}>
          NO EVENTS IN WINDOW
        </div>
      )}
      {sorted.map((ev) => (
        <div
          key={ev.id}
          style={{
            display: 'flex',
            gap: 10,
            padding: '7px 10px',
            borderLeft: `2px solid ${TYPE_COLORS[ev.type] || '#8bafc8'}`,
            background: 'rgba(4,10,20,0.5)',
            borderBottom: '1px solid rgba(0,212,160,0.05)',
          }}
        >
          <div style={{ flexShrink: 0, width: 70 }}>
            <div style={{ color: TYPE_COLORS[ev.type] || '#8bafc8', fontSize: 9, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1 }}>
              {TYPE_ICONS[ev.type] || ev.type.toUpperCase()}
            </div>
            {ev.severity && (
              <div style={{ color: ev.severity === 'critical' ? '#ff0040' : ev.severity === 'high' ? '#ff6b00' : '#8bafc8', fontSize: 9, fontFamily: '"Share Tech Mono", monospace', marginTop: 2 }}>
                {ev.severity.toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e8f0f8', fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ev.label}
            </div>
            {ev.location && (
              <div style={{ color: '#8bafc8', fontSize: 11, marginTop: 2 }}>{ev.location}</div>
            )}
          </div>
          <div style={{ flexShrink: 0, color: 'rgba(139,175,200,0.5)', fontSize: 10, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right', lineHeight: 1.4 }}>
            {fmt(ev.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
}
