import { ExternalLink, X, Radio, Globe, Tag, Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, MapPin, Layers, Shield } from 'lucide-react';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../../lib/intelligence-api';

type DrawerEvent =
  | { type: 'news'; data: NewsEvent }
  | { type: 'earthquake'; data: Earthquake }
  | { type: 'disaster'; data: Disaster }
  | { type: 'volcano'; data: VolcanoEvent }
  | { type: 'geopolitical' | 'curfew'; data: GeopoliticalEvent };

interface EventDetailDrawerProps {
  event: DrawerEvent;
  onClose: () => void;
}

function Badge({ color, icon, label }: { color: string; icon?: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      background: `${color}11`, border: `1px solid ${color}33`,
      borderRadius: '3px', padding: '3px 7px',
    }}>
      {icon}
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '3px',
      padding: '8px 10px',
    }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '2px', color: 'var(--dim)', marginBottom: '5px' }}>{label}</div>
      {children}
    </div>
  );
}

function SourceButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        background: 'rgba(0,212,160,0.1)', border: '1px solid rgba(0,212,160,0.35)',
        borderRadius: '3px', padding: '9px 14px', color: 'var(--accent)',
        textDecoration: 'none', fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,160,0.2)';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,160,0.6)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,160,0.1)';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,160,0.35)';
      }}
    >
      <ExternalLink size={11} />
      {label}
    </a>
  );
}

function NewsDrawer({ data }: { data: NewsEvent }) {
  const sentimentColor = data.sentiment === 'positive' ? '#00D4A0' : data.sentiment === 'negative' ? '#FF4C4C' : 'var(--dim)';
  const SentimentIcon = data.sentiment === 'positive' ? TrendingUp : data.sentiment === 'negative' ? TrendingDown : Minus;

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color="var(--accent)" icon={<Globe size={8} style={{ color: 'var(--accent)' }} />} label={data.source} />
        {data.country && <Badge color="#4D9FFF" label={data.country} />}
        <Badge color={sentimentColor} icon={<SentimentIcon size={8} style={{ color: sentimentColor }} />} label={data.sentiment || 'neutral'} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{new Date(data.published_at).toLocaleString()}</span>
      </div>
      {data.categories?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {data.categories.slice(0, 5).map((cat) => (
            <Badge key={cat} color="var(--fire)" icon={<Tag size={7} style={{ color: 'var(--fire)' }} />} label={cat} />
          ))}
        </div>
      )}
      {data.content && (
        <Section label="SUMMARY">
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.55 }}>
            {data.content.length > 300 ? data.content.slice(0, 300).trimEnd() + '…' : data.content}
          </p>
        </Section>
      )}
      {data.url && <SourceButton url={data.url} label={`READ FULL ARTICLE — ${data.source}`} />}
    </>
  );
}

function EarthquakeDrawer({ data }: { data: Earthquake }) {
  const magColor = data.magnitude >= 7 ? '#FF0040' : data.magnitude >= 6 ? '#FF6B00' : data.magnitude >= 5 ? '#FFB800' : '#4D9FFF';
  const usgsUrl = data.properties?.url || `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${data.event_id}.geojson`;

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.location}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={magColor} icon={<Activity size={8} style={{ color: magColor }} />} label={`M ${data.magnitude.toFixed(1)}`} />
        <Badge color="#4D9FFF" icon={<Layers size={8} style={{ color: '#4D9FFF' }} />} label={`Depth: ${data.depth?.toFixed(1) ?? '?'} km`} />
        <Badge color="var(--accent)" icon={<Globe size={8} style={{ color: 'var(--accent)' }} />} label="USGS" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{new Date(data.event_time).toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MapPin size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
      </div>
      {data.properties && Object.keys(data.properties).length > 0 && (
        <Section label="DETAILS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.properties.felt != null && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Felt reports: </span>{data.properties.felt}
              </div>
            )}
            {data.properties.alert && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Alert level: </span>{data.properties.alert.toUpperCase()}
              </div>
            )}
            {data.properties.tsunami != null && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: data.properties.tsunami ? '#FF0040' : 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Tsunami warning: </span>{data.properties.tsunami ? 'YES' : 'NO'}
              </div>
            )}
            {data.properties.sig != null && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Significance: </span>{data.properties.sig}
              </div>
            )}
          </div>
        </Section>
      )}
      <SourceButton url={data.properties?.url || usgsUrl} label="VIEW ON USGS" />
    </>
  );
}

function DisasterDrawer({ data }: { data: Disaster }) {
  const gdacsUrl = data.properties?.url || `https://www.gdacs.org/report.aspx?eventtype=${data.category}&eventid=${data.event_id}`;
  const catColor = data.category === 'EQ' ? '#4D9FFF' : data.category === 'TC' ? '#C070FF' : data.category === 'FL' ? '#00BFFF' : data.category === 'VO' ? '#FF4500' : data.category === 'WF' ? '#FF6B00' : '#FFB800';
  const catLabel = data.category === 'EQ' ? 'EARTHQUAKE' : data.category === 'TC' ? 'CYCLONE' : data.category === 'FL' ? 'FLOOD' : data.category === 'VO' ? 'VOLCANO' : data.category === 'WF' ? 'WILDFIRE' : data.category === 'DR' ? 'DROUGHT' : data.category;
  const alertScore = data.properties?.alertscore || data.properties?.alertScore;
  const alertColor = alertScore >= 2 ? '#FF0040' : alertScore >= 1 ? '#FF6B00' : '#FFB800';

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={catColor} icon={<AlertTriangle size={8} style={{ color: catColor }} />} label={catLabel} />
        {alertScore != null && <Badge color={alertColor} icon={<Shield size={8} style={{ color: alertColor }} />} label={`Alert ${alertScore}`} />}
        <Badge color="var(--accent)" icon={<Globe size={8} style={{ color: 'var(--accent)' }} />} label="GDACS" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{new Date(data.event_date).toLocaleString()}</span>
      </div>
      {data.latitude != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
        </div>
      )}
      {data.properties && Object.keys(data.properties).length > 0 && (
        <Section label="DETAILS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.properties.country && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Country: </span>{data.properties.country}
              </div>
            )}
            {data.properties.affectedcountries && (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)' }}>Affected: </span>{data.properties.affectedcountries}
              </div>
            )}
            {data.properties.description && (
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.5 }}>
                {String(data.properties.description).slice(0, 250)}
              </p>
            )}
          </div>
        </Section>
      )}
      <SourceButton url={data.properties?.url || gdacsUrl} label="VIEW ON GDACS" />
    </>
  );
}

function GeopoliticalDrawer({ data, isСurfew }: { data: GeopoliticalEvent; isСurfew: boolean }) {
  const sevColor = data.severity === 'critical' ? '#FF2255' : data.severity === 'high' ? '#FF6B00' : data.severity === 'medium' ? '#FFB800' : '#4D9FFF';
  const catColor = isСurfew ? '#CC3300' : '#FF2255';

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={catColor} icon={<Shield size={8} style={{ color: catColor }} />} label={data.category.toUpperCase()} />
        <Badge color={sevColor} icon={<AlertTriangle size={8} style={{ color: sevColor }} />} label={`${data.severity.toUpperCase()} SEVERITY`} />
        {data.country && <Badge color="#4D9FFF" icon={<Globe size={8} style={{ color: '#4D9FFF' }} />} label={data.country} />}
        {data.source && <Badge color="var(--accent)" label={data.source} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{new Date(data.updated_at).toLocaleString()}</span>
      </div>
      {data.started_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>Started: {new Date(data.started_at).toLocaleString()}</span>
        </div>
      )}
      {data.latitude != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
        </div>
      )}
      {data.description && (
        <Section label="SITUATION REPORT">
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.55 }}>
            {data.description.length > 300 ? data.description.slice(0, 300).trimEnd() + '…' : data.description}
          </p>
        </Section>
      )}
      {data.properties && Object.keys(data.properties).length > 0 && (
        <Section label="ADDITIONAL DATA">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.entries(data.properties).slice(0, 5).map(([k, v]) => v != null && (
              <div key={k} style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
                <span style={{ color: 'var(--dim)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>{String(v)}
              </div>
            ))}
          </div>
        </Section>
      )}
      {data.source && (() => {
        const src = data.source.trim();
        const isUrl = src.startsWith('http://') || src.startsWith('https://');
        if (isUrl) {
          return <SourceButton url={src} label={`VIEW SOURCE — ${new URL(src).hostname}`} />;
        }
        return null;
      })()}
    </>
  );
}

export function EventDetailDrawer({ event, onClose }: EventDetailDrawerProps) {
  const titleMap: Record<string, string> = {
    news: 'INTEL REPORT',
    earthquake: 'SEISMIC EVENT',
    disaster: 'DISASTER ALERT',
    volcano: 'VOLCANIC ACTIVITY',
    geopolitical: 'GEOPOLITICAL EVENT',
    curfew: 'CURFEW ALERT',
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2,5,8,0.97)', border: '1px solid rgba(0,212,160,0.18)',
      zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Radio size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: 'var(--accent)' }}>
            {titleMap[event.type] || 'EVENT DETAILS'}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', padding: '2px', lineHeight: 1 }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {event.type === 'news' && <NewsDrawer data={event.data} />}
        {event.type === 'earthquake' && <EarthquakeDrawer data={event.data} />}
        {event.type === 'disaster' && <DisasterDrawer data={event.data} />}
        {(event.type === 'geopolitical' || event.type === 'curfew') && <GeopoliticalDrawer data={event.data} isСurfew={event.type === 'curfew'} />}
      </div>
    </div>
  );
}
