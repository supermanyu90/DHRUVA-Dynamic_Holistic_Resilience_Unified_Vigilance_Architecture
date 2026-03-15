import type { TimelineEvent, EventType } from './types';

const TYPE_COLORS: Record<string, string> = {
  quake: '#4d9fff',
  disaster: '#ff6b00',
  volcano: '#ff3d6b',
  news: '#00bfff',
  geo: '#ff2255',
  vessel: '#00d4a0',
};

const TYPE_LABELS: Record<string, string> = {
  quake: 'SEISMIC',
  disaster: 'DISASTERS',
  volcano: 'VOLCANIC',
  news: 'INTEL',
  geo: 'GEO-POL',
  vessel: 'MARITIME',
};

interface Props {
  events: TimelineEvent[];
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
}

export function TimelineStats({ events, selectedType, onSelectType }: Props) {
  const types: EventType[] = ['quake', 'disaster', 'volcano', 'news', 'geo', 'vessel'];
  const counts = types.reduce<Record<string, number>>((acc, t) => {
    acc[t] = events.filter((e) => e.type === t).length;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {types.map((type) => {
        const count = counts[type];
        const isActive = selectedType === type;
        const pct = (count / maxCount) * 100;

        return (
          <button
            key={type}
            onClick={() => onSelectType(isActive ? null : type)}
            style={{
              background: isActive ? `rgba(${hexToRgb(TYPE_COLORS[type])}, 0.1)` : 'rgba(4,10,20,0.5)',
              border: `1px solid ${isActive ? TYPE_COLORS[type] : 'rgba(0,212,160,0.12)'}`,
              borderRadius: 3,
              padding: '7px 10px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: TYPE_COLORS[type], fontSize: 11, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1 }}>
                {TYPE_LABELS[type]}
              </span>
              <span style={{ color: count > 0 ? '#e8f0f8' : '#8bafc8', fontSize: 14, fontWeight: 700, fontFamily: '"Bebas Neue", sans-serif', letterSpacing: 1 }}>
                {count}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(0,212,160,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: TYPE_COLORS[type],
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
