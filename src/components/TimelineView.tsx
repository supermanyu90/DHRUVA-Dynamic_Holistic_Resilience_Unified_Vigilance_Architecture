import { useMemo, useState } from 'react';
import { TimelineChart } from './timeline/TimelineChart';
import { TimelineEventList } from './timeline/TimelineEventList';
import { TimelineStats } from './timeline/TimelineStats';
import type { TimelineEvent } from './timeline/types';
import type { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';

const RANGES: { label: string; ms: number }[] = [
  { label: '6H', ms: 6 * 3600 * 1000 },
  { label: '24H', ms: 24 * 3600 * 1000 },
  { label: '7D', ms: 7 * 24 * 3600 * 1000 },
  { label: '30D', ms: 30 * 24 * 3600 * 1000 },
];

interface Props {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  vessels: Vessel[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
}

export function TimelineView({ earthquakes, disasters, news, vessels, volcanoes, geopolitical }: Props) {
  const [rangeIdx, setRangeIdx] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const now = useMemo(() => Date.now(), []);
  const rangeMs = RANGES[rangeIdx].ms;

  const timedEvents: TimelineEvent[] = useMemo(() => {
    const result: TimelineEvent[] = [];

    for (const eq of earthquakes) {
      result.push({
        id: eq.id,
        type: 'quake',
        label: `M${eq.magnitude.toFixed(1)} — ${eq.location}`,
        timestamp: eq.event_time,
        severity: eq.magnitude >= 6 ? 'critical' : eq.magnitude >= 5 ? 'high' : 'medium',
        location: eq.location,
        detail: `Depth: ${eq.depth}km`,
      });
    }

    for (const d of disasters) {
      result.push({
        id: d.id,
        type: 'disaster',
        label: d.title,
        timestamp: d.event_date,
        severity: d.category?.toLowerCase().includes('severe') ? 'high' : 'medium',
        location: d.category,
      });
    }

    for (const n of news) {
      result.push({
        id: n.id,
        type: 'news',
        label: n.title,
        timestamp: n.published_at,
        location: n.country || undefined,
      });
    }

    for (const v of vessels) {
      result.push({
        id: v.id,
        type: 'vessel',
        label: `${v.name} — ${v.destination || 'Unknown Dest'}`,
        timestamp: v.last_position_time,
        location: v.flag,
      });
    }

    return result;
  }, [earthquakes, disasters, news, vessels]);

  const persistentEvents: TimelineEvent[] = useMemo(() => {
    const result: TimelineEvent[] = [];

    for (const vol of volcanoes) {
      result.push({
        id: vol.id,
        type: 'volcano',
        label: `${vol.name} — ${vol.status.toUpperCase()}`,
        timestamp: vol.updated_at,
        severity: vol.status === 'erupting' ? 'critical' : 'high',
        location: vol.country || undefined,
      });
    }

    for (const geo of geopolitical) {
      result.push({
        id: geo.id,
        type: 'geo',
        label: geo.title,
        timestamp: geo.updated_at,
        severity: geo.severity,
        location: geo.country || undefined,
        detail: geo.started_at ? `Active since ${new Date(geo.started_at).toLocaleDateString()}` : undefined,
      });
    }

    return result;
  }, [volcanoes, geopolitical]);

  const windowTimedEvents = useMemo(
    () => timedEvents.filter((e) => new Date(e.timestamp).getTime() >= now - rangeMs),
    [timedEvents, now, rangeMs]
  );

  const windowEvents = useMemo(
    () => [...windowTimedEvents, ...persistentEvents],
    [windowTimedEvents, persistentEvents]
  );

  const totalInWindow = windowEvents.length;

  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'rgba(4,10,20,0.97)',
      }}>
        <div>
          <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 20, letterSpacing: 4, color: 'var(--accent)' }}>
            TIMELINE
          </span>
          <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: 'var(--dim)', marginLeft: 12, letterSpacing: 2 }}>
            INTELLIGENCE CHRONOLOGY
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: 'var(--dim)', marginRight: 4 }}>
            {totalInWindow} EVENTS
          </span>
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              style={{
                background: rangeIdx === i ? 'rgba(0,212,160,0.15)' : 'rgba(4,10,20,0.8)',
                border: `1px solid ${rangeIdx === i ? 'var(--accent)' : 'rgba(0,212,160,0.2)'}`,
                color: rangeIdx === i ? 'var(--accent)' : 'var(--dim)',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 10, overflowY: 'auto', background: 'rgba(4,10,20,0.6)' }}>
          <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 10 }}>
            FILTER BY TYPE
          </div>
          <TimelineStats events={windowEvents} selectedType={selectedType} onSelectType={setSelectedType} />
          {selectedType && (
            <button
              onClick={() => setSelectedType(null)}
              style={{
                marginTop: 10,
                width: '100%',
                background: 'rgba(255,0,64,0.1)',
                border: '1px solid rgba(255,0,64,0.3)',
                color: '#ff0040',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 10,
                padding: '5px 0',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              CLEAR FILTER
            </button>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 220, flexShrink: 0, borderBottom: '1px solid var(--border)', padding: '10px 16px' }}>
            <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 8 }}>
              EVENT FREQUENCY — {RANGES[rangeIdx].label} WINDOW
            </div>
            <div style={{ height: 170 }}>
              <TimelineChart
                events={selectedType
                  ? windowTimedEvents.filter(e => e.type === selectedType)
                  : windowTimedEvents}
                rangeMs={rangeMs}
                now={now}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', padding: '0 0 0 0' }}>
            <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, padding: '8px 16px 6px' }}>
              {selectedType ? `${selectedType.toUpperCase()} EVENTS` : 'ALL EVENTS'} — {selectedType ? windowEvents.filter(e => e.type === selectedType).length : totalInWindow} RECORDS
            </div>
            <div style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}>
              <TimelineEventList events={windowEvents} selectedType={selectedType} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
