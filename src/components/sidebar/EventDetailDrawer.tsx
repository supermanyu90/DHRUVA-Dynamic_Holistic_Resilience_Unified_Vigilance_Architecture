import { ExternalLink, X, Radio, Globe, Tag, Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, MapPin, Layers, Shield, Zap, Anchor, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../../lib/intelligence-api';
import { Vessel } from '../../lib/intelligence-api';
import { ShareMenu } from '../ShareMenu';
import type { SharePayload } from '../../lib/share';

function safeHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}

type DrawerEvent =
  | { type: 'news'; data: NewsEvent }
  | { type: 'earthquake'; data: Earthquake }
  | { type: 'disaster'; data: Disaster }
  | { type: 'volcano'; data: VolcanoEvent }
  | { type: 'vessel'; data: Vessel }
  | { type: 'geopolitical' | 'curfew'; data: GeopoliticalEvent };

interface EventDetailDrawerProps {
  event: DrawerEvent;
  onClose: () => void;
}

const FEED_SOURCE_LABELS: Record<string, { name: string; baseUrl: string }> = {
  reuters_world: { name: 'Reuters', baseUrl: 'https://www.reuters.com' },
  reuters_disinfo: { name: 'Reuters', baseUrl: 'https://www.reuters.com' },
  ap_world: { name: 'AP News', baseUrl: 'https://apnews.com' },
  ap_disinfo: { name: 'AP News', baseUrl: 'https://apnews.com' },
  aljazeera: { name: 'Al Jazeera', baseUrl: 'https://www.aljazeera.com' },
  aljazeera_disinfo: { name: 'Al Jazeera', baseUrl: 'https://www.aljazeera.com' },
  bbc_world: { name: 'BBC News', baseUrl: 'https://www.bbc.com/news/world' },
  bbc_disinfo: { name: 'BBC News', baseUrl: 'https://www.bbc.com/news/world' },
  bbc_conflict: { name: 'BBC News', baseUrl: 'https://www.bbc.com/news/world' },
  france24_world: { name: 'France 24', baseUrl: 'https://www.france24.com/en' },
  france24_disinfo: { name: 'France 24', baseUrl: 'https://www.france24.com/en' },
  dw_world: { name: 'Deutsche Welle', baseUrl: 'https://www.dw.com/en' },
  dw_mideast: { name: 'DW Middle East', baseUrl: 'https://www.dw.com/en/middle-east' },
  dw_africa: { name: 'DW Africa', baseUrl: 'https://www.dw.com/en/africa' },
  dw_disinfo: { name: 'Deutsche Welle', baseUrl: 'https://www.dw.com/en' },
  rfi_en: { name: 'RFI English', baseUrl: 'https://www.rfi.fr/en' },
  the_hindu_world: { name: 'The Hindu', baseUrl: 'https://www.thehindu.com' },
  middle_east_eye: { name: 'Middle East Eye', baseUrl: 'https://www.middleeasteye.net' },
  africa_report: { name: 'The Africa Report', baseUrl: 'https://www.theafricareport.com' },
  npr_world: { name: 'NPR World', baseUrl: 'https://www.npr.org/sections/world' },
  npr_disinfo: { name: 'NPR', baseUrl: 'https://www.npr.org' },
  voa_news: { name: 'Voice of America', baseUrl: 'https://www.voanews.com' },
  voa_conflict: { name: 'Voice of America', baseUrl: 'https://www.voanews.com' },
  voa_disinfo: { name: 'Voice of America', baseUrl: 'https://www.voanews.com' },
  rferl: { name: 'Radio Free Europe', baseUrl: 'https://www.rferl.org' },
  rferl_disinfo: { name: 'Radio Free Europe', baseUrl: 'https://www.rferl.org' },
  guardian_world: { name: 'The Guardian', baseUrl: 'https://www.theguardian.com/world' },
  guardian_conflict: { name: 'The Guardian', baseUrl: 'https://www.theguardian.com/world/conflict' },
  guardian_disinfo: { name: 'The Guardian', baseUrl: 'https://www.theguardian.com' },
  crisisgroup: { name: 'Crisis Group', baseUrl: 'https://www.crisisgroup.org' },
  reliefweb: { name: 'ReliefWeb', baseUrl: 'https://reliefweb.int' },
  amnesty: { name: 'Amnesty International', baseUrl: 'https://www.amnesty.org' },
  dawn_pakistan: { name: 'Dawn', baseUrl: 'https://www.dawn.com' },
  bellingcat: { name: 'Bellingcat', baseUrl: 'https://www.bellingcat.com' },
  euvsdisin: { name: 'EU vs Disinfo', baseUrl: 'https://euvsdisinfo.eu' },
};

function getSourceLabel(source: string): string {
  return FEED_SOURCE_LABELS[source]?.name || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

function VolcanoDrawer({ data }: { data: VolcanoEvent }) {
  const alertColor = data.alert_level === 'WARNING' || data.alert_level === 'RED' ? '#FF0040'
    : data.alert_level === 'WATCH' || data.alert_level === 'ORANGE' ? '#FF6B00'
    : data.alert_level === 'ADVISORY' || data.alert_level === 'YELLOW' ? '#FFB800'
    : '#00BFFF';
  const statusColor = data.status === 'erupting' ? '#FF4500' : '#FF8C00';
  const gvpUrl = data.source || `https://volcano.si.edu/volcano.cfm?vn=${data.volcano_id}`;

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={statusColor} icon={<Zap size={8} style={{ color: statusColor }} />} label={data.status || 'ACTIVE'} />
        {data.alert_level && <Badge color={alertColor} icon={<AlertTriangle size={8} style={{ color: alertColor }} />} label={`Alert: ${data.alert_level}`} />}
        {data.country && <Badge color="#4D9FFF" icon={<Globe size={8} style={{ color: '#4D9FFF' }} />} label={data.country} />}
        <Badge color="var(--accent)" label="GVP / SMITHSONIAN" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MapPin size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
      </div>
      {data.elevation != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>Elevation: {data.elevation.toLocaleString()} m</span>
        </div>
      )}
      {data.last_eruption && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>Last eruption: {data.last_eruption}</span>
        </div>
      )}
      {data.activity_description && (
        <Section label="ACTIVITY REPORT">
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.55 }}>
            {data.activity_description.length > 400 ? data.activity_description.slice(0, 400).trimEnd() + '…' : data.activity_description}
          </p>
        </Section>
      )}
      <SourceButton url={gvpUrl} label="VIEW ON SMITHSONIAN GVP" />
    </>
  );
}

function VesselDrawer({ data }: { data: Vessel }) {
  const typeColor = data.type === 'Military' ? '#FF2255' : data.type === 'Tanker' ? '#FFB800' : '#00BFFF';
  const marineUrl = `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${data.mmsi}`;

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={typeColor} icon={<Anchor size={8} style={{ color: typeColor }} />} label={data.type || 'VESSEL'} />
        {data.flag && <Badge color="#4D9FFF" icon={<Globe size={8} style={{ color: '#4D9FFF' }} />} label={data.flag} />}
        {data.mmsi && <Badge color="var(--accent)" label={`MMSI: ${data.mmsi}`} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MapPin size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
      </div>
      {data.last_position_time && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>Last seen: {new Date(data.last_position_time).toLocaleString()}</span>
        </div>
      )}
      <Section label="NAVIGATION">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {data.speed != null && (
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
              <span style={{ color: 'var(--dim)' }}>Speed: </span>{data.speed.toFixed(1)} knots
            </div>
          )}
          {data.course != null && (
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
              <span style={{ color: 'var(--dim)' }}>Course: </span>{data.course.toFixed(0)}°
            </div>
          )}
          {data.heading != null && (
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
              <span style={{ color: 'var(--dim)' }}>Heading: </span>{data.heading.toFixed(0)}°
            </div>
          )}
          {data.destination && (
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)' }}>
              <span style={{ color: 'var(--dim)' }}>Destination: </span>{data.destination}
            </div>
          )}
        </div>
      </Section>
      <SourceButton url={marineUrl} label="VIEW ON MARINETRAFFIC" />
    </>
  );
}

function GeopoliticalDrawer({ data, isCurfew }: { data: GeopoliticalEvent; isCurfew: boolean }) {
  const sevColor = data.severity === 'critical' ? '#FF2255' : data.severity === 'high' ? '#FF6B00' : data.severity === 'medium' ? '#FFB800' : '#4D9FFF';
  const catColor = isCurfew ? '#CC3300' : '#FF2255';

  const articleUrl = data.properties?.url as string | undefined;
  const sourceName = getSourceLabel(data.source || '');

  return (
    <>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
        {data.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <Badge color={catColor} icon={<Shield size={8} style={{ color: catColor }} />} label={data.category.toUpperCase()} />
        <Badge color={sevColor} icon={<AlertTriangle size={8} style={{ color: sevColor }} />} label={`${data.severity.toUpperCase()} SEVERITY`} />
        {data.country && <Badge color="#4D9FFF" icon={<Globe size={8} style={{ color: '#4D9FFF' }} />} label={data.country} />}
        <Badge color="var(--accent)" icon={<Radio size={8} style={{ color: 'var(--accent)' }} />} label={sourceName} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={8} style={{ color: 'var(--dim)' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{new Date(data.updated_at).toLocaleString()}</span>
      </div>
      {data.started_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>Published: {new Date(data.started_at).toLocaleString()}</span>
        </div>
      )}
      {data.latitude != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>{data.latitude.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
        </div>
      )}
      {data.description && (
        <Section label="SITUATION BRIEF">
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(232,240,248,0.8)', lineHeight: 1.55 }}>
            {data.description.length > 450 ? data.description.slice(0, 450).trimEnd() + '…' : data.description}
          </p>
        </Section>
      )}
      {articleUrl && (
        <SourceButton url={articleUrl} label={`READ FULL REPORT — ${sourceName}`} />
      )}
      {!articleUrl && data.source && (() => {
        const src = data.source.trim();
        const fallbackInfo = FEED_SOURCE_LABELS[src];
        if (fallbackInfo) {
          return <SourceButton url={fallbackInfo.baseUrl} label={`VISIT ${fallbackInfo.name.toUpperCase()}`} />;
        }
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return <SourceButton url={src} label={`VIEW SOURCE — ${safeHostname(src)}`} />;
        }
        return null;
      })()}
    </>
  );
}

const SHARE_LABEL: Record<DrawerEvent['type'], string> = {
  news: 'INTEL',
  earthquake: 'SEISMIC',
  disaster: 'DISASTER',
  volcano: 'VOLCANO',
  vessel: 'VESSEL',
  geopolitical: 'GEOPOLITICAL',
  curfew: 'CURFEW',
};

/** Build a shareable payload (headline, message, source link) for any drawer event. */
function eventToShare(event: DrawerEvent): SharePayload {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dhruva.app';
  const label = SHARE_LABEL[event.type];
  let headline = '';
  let url = appUrl;
  let severity = '';

  switch (event.type) {
    case 'news':
      headline = event.data.title;
      url = event.data.url || appUrl;
      break;
    case 'earthquake':
      headline = `M${event.data.magnitude?.toFixed(1) ?? '?'} — ${event.data.location}`;
      url = (event.data.properties?.url as string) || `https://earthquake.usgs.gov/earthquakes/eventpage/${event.data.event_id}`;
      break;
    case 'disaster':
      headline = event.data.title;
      url = (event.data.properties?.url as string) || `https://www.gdacs.org/report.aspx?eventtype=${event.data.category}&eventid=${event.data.event_id}`;
      break;
    case 'volcano':
      headline = `${event.data.name}${event.data.country ? ` — ${event.data.country}` : ''}`;
      url = event.data.source || `https://volcano.si.edu/volcano.cfm?vn=${event.data.volcano_id}`;
      severity = event.data.status === 'erupting' ? 'ERUPTING' : '';
      break;
    case 'vessel':
      headline = `${event.data.name}${event.data.type ? ` (${event.data.type})` : ''}`;
      url = `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${event.data.mmsi}`;
      break;
    case 'geopolitical':
    case 'curfew':
      headline = event.data.title;
      url = (event.data.properties?.url as string) || appUrl;
      severity = (event.data.severity || '').toUpperCase();
      break;
  }

  const sevSuffix = severity ? ` [${severity}]` : '';
  const text = `⚠️ DHRUVA ${label} ALERT: ${headline}${sevSuffix} — live intelligence & vigilance`;

  return { title: `DHRUVA ${label}: ${headline}`, text, url };
}

export function EventDetailDrawer({ event, onClose }: EventDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleMap: Record<string, string> = {
    news: 'INTEL REPORT',
    earthquake: 'SEISMIC EVENT',
    disaster: 'DISASTER ALERT',
    volcano: 'VOLCANIC ACTIVITY',
    vessel: 'VESSEL TRACK',
    geopolitical: 'GEOPOLITICAL EVENT',
    curfew: 'CURFEW ALERT',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleMap[event.type] || 'Event Details'}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2,5,8,0.97)', border: '1px solid rgba(0,212,160,0.18)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Radio size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: 'var(--accent)' }}>
            {titleMap[event.type] || 'EVENT DETAILS'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowShare(s => !s)}
            aria-label="Share this alert"
            aria-haspopup="menu"
            aria-expanded={showShare}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: showShare ? 'rgba(0,212,160,0.14)' : 'none',
              border: `1px solid ${showShare ? 'rgba(0,212,160,0.4)' : 'var(--border)'}`,
              borderRadius: '3px', cursor: 'pointer',
              color: showShare ? 'var(--accent)' : 'var(--dim)', padding: '3px 7px', lineHeight: 1,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '1.5px',
            }}
          >
            <Share2 size={11} aria-hidden="true" />
            SHARE
          </button>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close event details"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', padding: '2px', lineHeight: 1 }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showShare && (
        <ShareMenu payload={eventToShare(event)} onClose={() => setShowShare(false)} />
      )}

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {event.type === 'news' && <NewsDrawer data={event.data} />}
        {event.type === 'earthquake' && <EarthquakeDrawer data={event.data} />}
        {event.type === 'disaster' && <DisasterDrawer data={event.data} />}
        {event.type === 'volcano' && <VolcanoDrawer data={event.data} />}
        {event.type === 'vessel' && <VesselDrawer data={event.data} />}
        {(event.type === 'geopolitical' || event.type === 'curfew') && (
          <GeopoliticalDrawer data={event.data} isCurfew={event.type === 'curfew'} />
        )}
      </div>
    </div>
  );
}
