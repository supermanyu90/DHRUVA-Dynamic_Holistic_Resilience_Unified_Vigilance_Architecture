import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';

export interface TickerEvent {
  id: string;
  time: string;
  type: 'earthquake' | 'disaster' | 'news' | 'vessel' | 'volcano' | 'geopolitical' | 'cyber' | 'curfew';
  title: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

interface LiveEventTickerProps {
  events: TickerEvent[];
}

const TYPE_COLOR: Record<string, string> = {
  earthquake: '#4D9FFF',
  disaster: '#FF6B00',
  news: '#00D4A0',
  vessel: '#00BFFF',
  volcano: '#FF4500',
  geopolitical: '#FF2255',
  cyber: '#FF3D6B',
  curfew: '#FFB800',
};

const TYPE_LABEL: Record<string, string> = {
  earthquake: 'SEISMIC',
  disaster: 'DISASTER',
  news: 'INTEL',
  vessel: 'MARITIME',
  volcano: 'VOLCANO',
  geopolitical: 'GEOPOLIT',
  cyber: 'CYBER',
  curfew: 'CURFEW',
};

const SEV_COLOR: Record<string, string> = {
  critical: '#FF0040',
  high: '#FF6B00',
  medium: '#FFB800',
  low: '#00D4A0',
};

export function LiveEventTicker({ events }: LiveEventTickerProps) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || events.length === 0) return;

    const speed = 0.5;

    const animate = () => {
      if (!paused && inner) {
        posRef.current -= speed;
        const totalWidth = inner.scrollWidth / 2;
        if (Math.abs(posRef.current) >= totalWidth) {
          posRef.current = 0;
        }
        inner.style.transform = `translateX(${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [events, paused]);

  if (events.length === 0) return null;

  const doubled = [...events, ...events];

  return (
    <div
      role="marquee"
      aria-label="Live event feed"
      style={{
        width: '100%',
        height: '28px',
        background: 'rgba(2, 6, 12, 0.97)',
        borderTop: '1px solid rgba(0, 212, 160, 0.18)',
        borderBottom: '1px solid rgba(0, 212, 160, 0.18)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 30,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Screen-reader-only live region announces new events */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {events[0] ? `New event: ${events[0].title}` : ''}
      </div>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 10px',
          background: 'rgba(0, 212, 160, 0.08)',
          borderRight: '1px solid rgba(0, 212, 160, 0.25)',
          height: '100%',
          minWidth: '110px',
        }}
      >
        <Radio size={10} color="#00D4A0" style={{ flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '10px',
            color: '#00D4A0',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          LIVE FEED
        </span>
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#00D4A0',
            flexShrink: 0,
            animation: 'tickerPulse 1.2s ease-in-out infinite',
          }}
        />
      </div>

      <div ref={tickerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '100%' }}>
        <div
          ref={innerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}
        >
          {doubled.map((event, idx) => {
            const typeColor = TYPE_COLOR[event.type] || '#00D4A0';
            const sevColor = event.severity ? SEV_COLOR[event.severity] : undefined;
            return (
              <span
                key={`${event.id}-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 18px 0 0',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: '10.5px',
                  color: 'rgba(232, 240, 248, 0.85)',
                }}
              >
                <span
                  style={{
                    background: `${typeColor}22`,
                    border: `1px solid ${typeColor}55`,
                    color: typeColor,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    fontSize: '9px',
                    letterSpacing: '0.06em',
                  }}
                >
                  {TYPE_LABEL[event.type]}
                </span>
                {event.severity && (
                  <span
                    style={{
                      background: `${sevColor}22`,
                      border: `1px solid ${sevColor}55`,
                      color: sevColor,
                      padding: '1px 4px',
                      borderRadius: '2px',
                      fontSize: '8.5px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {event.severity.toUpperCase()}
                  </span>
                )}
                <span style={{ color: 'rgba(139, 175, 200, 0.6)', fontSize: '9.5px' }}>{event.time}</span>
                <span>{event.title}</span>
                <span style={{ color: 'rgba(0, 212, 160, 0.3)', margin: '0 8px' }}>•</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
