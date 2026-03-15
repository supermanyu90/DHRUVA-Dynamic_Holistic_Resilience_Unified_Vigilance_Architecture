import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { EventDetailDrawer } from './sidebar/EventDetailDrawer';

type DrawerEvent =
  | { type: 'news'; data: NewsEvent }
  | { type: 'earthquake'; data: Earthquake }
  | { type: 'disaster'; data: Disaster }
  | { type: 'volcano'; data: VolcanoEvent }
  | { type: 'geopolitical' | 'curfew'; data: GeopoliticalEvent };

interface SidebarProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  vessels: Vessel[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  selectedEvent: string | null;
  onEventSelect: (id: string, type: string) => void;
  mode: 'live' | 'archive';
  onModeChange: (mode: 'live' | 'archive') => void;
  layersEnabled: {
    earthquakes: boolean;
    disasters: boolean;
    news: boolean;
    cables: boolean;
    military: boolean;
    nuclear: boolean;
    chokepoints: boolean;
    daynight: boolean;
    vessels: boolean;
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
  };
  onLayerToggle: (layer: keyof SidebarProps['layersEnabled']) => void;
  mobileOpen?: boolean;
}

const SUPPORTED_DRAWER_TYPES = new Set(['news', 'earthquake', 'disaster', 'geopolitical', 'curfew']);

export function Sidebar({
  earthquakes,
  disasters,
  news,
  vessels,
  volcanoes,
  geopolitical,
  selectedEvent,
  onEventSelect,
  mode,
  onModeChange,
  layersEnabled,
  onLayerToggle,
  mobileOpen = false,
}: SidebarProps) {
  const [drawerEvent, setDrawerEvent] = useState<DrawerEvent | null>(null);

  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const filterByMode = (eventTime: Date) => {
    if (mode === 'live') return eventTime >= last24Hours;
    return true;
  };

  const curfewEvents = geopolitical.filter((g) => g.category === 'curfew');

  const allEvents = [
    ...earthquakes.map((e) => ({ ...e, type: 'earthquake', icon: '⚡', color: 'var(--quake)', sortTime: e.event_time })),
    ...disasters.map((d) => ({ ...d, type: 'disaster', icon: '⚠', color: 'var(--fire)', sortTime: d.event_date })),
    ...volcanoes.map((v) => ({ ...v, id: v.id, type: 'volcano', icon: '▲', color: '#FF4500', sortTime: v.updated_at })),
    ...geopolitical.filter((g) => g.category !== 'curfew').map((g) => ({ ...g, type: 'geopolitical', icon: '◉', color: g.severity === 'critical' ? '#FF2255' : g.severity === 'high' ? '#FF6B00' : '#FFB800', sortTime: g.updated_at })),
    ...curfewEvents.map((g) => ({ ...g, type: 'curfew', icon: '⊘', color: '#CC3300', sortTime: g.updated_at })),
    ...vessels.map((v) => ({ ...v, type: 'vessel', icon: '◈', color: '#00BFFF', sortTime: v.last_position_time })),
    ...news.map((n) => ({ ...n, type: 'news', icon: '◎', color: 'var(--accent)', sortTime: n.published_at })),
  ]
    .filter((event) => filterByMode(new Date(event.sortTime)))
    .filter((event) => {
      if (event.type === 'earthquake') return layersEnabled.earthquakes;
      if (event.type === 'disaster') return layersEnabled.disasters;
      if (event.type === 'volcano') return layersEnabled.volcanoes;
      if (event.type === 'geopolitical') return layersEnabled.geopolitical;
      if (event.type === 'curfew') return layersEnabled.curfews;
      if (event.type === 'vessel') return layersEnabled.vessels;
      if (event.type === 'news') return layersEnabled.news;
      return true;
    })
    .sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());

  function openDrawer(event: typeof allEvents[0]) {
    if (event.type === 'news') {
      setDrawerEvent({ type: 'news', data: event as unknown as NewsEvent });
    } else if (event.type === 'earthquake') {
      setDrawerEvent({ type: 'earthquake', data: event as unknown as Earthquake });
    } else if (event.type === 'disaster') {
      setDrawerEvent({ type: 'disaster', data: event as unknown as Disaster });
    } else if (event.type === 'geopolitical') {
      setDrawerEvent({ type: 'geopolitical', data: event as unknown as GeopoliticalEvent });
    } else if (event.type === 'curfew') {
      setDrawerEvent({ type: 'curfew', data: event as unknown as GeopoliticalEvent });
    }
  }

  return (
    <div className={`sidebar${mobileOpen ? ' mobile-open' : ''}`} style={{ position: 'relative' }}>
      {drawerEvent && (
        <EventDetailDrawer event={drawerEvent} onClose={() => setDrawerEvent(null)} />
      )}

      <div className="ph">
        <div className="ph-title">EVENT FEED</div>
        <div className="ph-badge">{allEvents.length} ACTIVE</div>
      </div>

      <div className="layer-bar">
        <button
          className={`lbtn ${layersEnabled.earthquakes ? 'active' : ''}`}
          onClick={() => onLayerToggle('earthquakes')}
          style={{ borderColor: 'var(--quake)', color: 'var(--quake)' }}
        >
          <span className="ldot" style={{ background: 'var(--quake)' }}></span>
          QUAKES
        </button>
        <button
          className={`lbtn ${layersEnabled.disasters ? 'active' : ''}`}
          onClick={() => onLayerToggle('disasters')}
          style={{ borderColor: 'var(--fire)', color: 'var(--fire)' }}
        >
          <span className="ldot" style={{ background: 'var(--fire)' }}></span>
          DISASTERS
        </button>
        <button
          className={`lbtn ${layersEnabled.news ? 'active' : ''}`}
          onClick={() => onLayerToggle('news')}
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          <span className="ldot" style={{ background: 'var(--accent)' }}></span>
          INTEL
        </button>
        <button
          className={`lbtn ${layersEnabled.volcanoes ? 'active' : ''}`}
          onClick={() => onLayerToggle('volcanoes')}
          style={{ borderColor: '#FF4500', color: '#FF4500' }}
        >
          <span className="ldot" style={{ background: '#FF4500' }}></span>
          VOLCANOES
        </button>
        <button
          className={`lbtn ${layersEnabled.geopolitical ? 'active' : ''}`}
          onClick={() => onLayerToggle('geopolitical')}
          style={{ borderColor: '#FF2255', color: '#FF2255' }}
        >
          <span className="ldot" style={{ background: '#FF2255' }}></span>
          GEO-POL
        </button>
        <button
          className={`lbtn ${layersEnabled.curfews ? 'active' : ''}`}
          onClick={() => onLayerToggle('curfews')}
          style={{ borderColor: '#CC3300', color: '#CC3300' }}
        >
          <span className="ldot" style={{ background: '#CC3300' }}></span>
          CURFEWS
        </button>
        <button
          className={`lbtn ${layersEnabled.vessels ? 'active' : ''}`}
          onClick={() => onLayerToggle('vessels')}
          style={{ borderColor: '#00BFFF', color: '#00BFFF' }}
        >
          <span className="ldot" style={{ background: '#00BFFF' }}></span>
          VESSELS
        </button>
        <button
          className={`lbtn lbtn-cab ${layersEnabled.cables ? 'active' : ''}`}
          onClick={() => onLayerToggle('cables')}
          style={{ borderColor: '#FF69B4', color: '#FF69B4' }}
        >
          <span className="ldot" style={{ background: '#FF69B4' }}></span>
          CABLES
        </button>
        <button
          className={`lbtn lbtn-mil ${layersEnabled.military ? 'active' : ''}`}
          onClick={() => onLayerToggle('military')}
          style={{ borderColor: '#4A9EFF', color: '#4A9EFF' }}
        >
          <span className="ldot" style={{ background: '#4A9EFF' }}></span>
          MILITARY
        </button>
        <button
          className={`lbtn lbtn-nuke ${layersEnabled.nuclear ? 'active' : ''}`}
          onClick={() => onLayerToggle('nuclear')}
          style={{ borderColor: '#39FF88', color: '#39FF88' }}
        >
          <span className="ldot" style={{ background: '#39FF88' }}></span>
          NUCLEAR
        </button>
        <button
          className={`lbtn lbtn-dn ${layersEnabled.chokepoints ? 'active' : ''}`}
          onClick={() => onLayerToggle('chokepoints')}
          style={{ borderColor: '#FF6B00', color: '#FF6B00' }}
        >
          <span className="ldot" style={{ background: '#FF6B00' }}></span>
          CHOKES
        </button>
        <button
          className={`lbtn ${layersEnabled.daynight ? 'active' : ''}`}
          onClick={() => onLayerToggle('daynight')}
          style={{ borderColor: '#A0C8FF', color: '#A0C8FF' }}
        >
          <span className="ldot" style={{ background: '#A0C8FF' }}></span>
          DAY/NIGHT
        </button>
      </div>

      <div className="mode-bar">
        <button className={mode === 'live' ? 'mbtn m-live' : 'mbtn'} onClick={() => onModeChange('live')}>
          <span className="mpip" style={{ background: '#00D4A0' }}></span>
          LIVE
        </button>
        <button className={mode === 'archive' ? 'mbtn m-archive' : 'mbtn'} onClick={() => onModeChange('archive')}>
          <span className="mpip" style={{ background: '#FFB800' }}></span>
          ARCHIVE
        </button>
      </div>

      <div className="ev-list">
        {allEvents.map((event) => {
          const eventTime = new Date(event.sortTime);
          const isEarthquake = event.type === 'earthquake';
          const isVessel = event.type === 'vessel';
          const isVolcano = event.type === 'volcano';
          const isGeopolitical = event.type === 'geopolitical' || event.type === 'curfew';
          const isNews = event.type === 'news';
          const isDisaster = event.type === 'disaster';
          const hasDrawer = SUPPORTED_DRAWER_TYPES.has(event.type);

          let label = '';
          let sublabel = '';

          if (isEarthquake) {
            label = `M${(event as any).magnitude.toFixed(1)} ${(event as any).location}`;
            sublabel = `USGS • Depth: ${(event as any).depth?.toFixed(0) ?? '?'} km`;
          } else if (isVessel) {
            const v = event as any;
            label = v.name;
            sublabel = `${v.type} • ${v.flag || ''} • ${v.speed?.toFixed(1) || '?'} kn → ${v.destination || '?'}`;
          } else if (isVolcano) {
            const v = event as any;
            label = v.name;
            sublabel = `${v.country || ''} • ${v.status?.toUpperCase()} • Alert: ${v.alert_level || 'N/A'}`;
          } else if (isGeopolitical) {
            const g = event as any;
            label = g.title;
            sublabel = `${g.country || ''} • ${g.severity?.toUpperCase()}`;
          } else if (isNews) {
            const n = event as any;
            label = n.title;
            sublabel = n.source;
          } else if (isDisaster) {
            label = (event as any).title || '';
            sublabel = `GDACS • ${(event as any).category || ''}`;
          } else {
            label = (event as any).title || '';
          }

          const sentiment = isNews ? (event as any).sentiment : null;
          const sentimentColor = sentiment === 'positive' ? '#00D4A0' : sentiment === 'negative' ? '#FF4C4C' : null;

          const sevColor = isGeopolitical
            ? ((event as any).severity === 'critical' ? '#FF2255' : (event as any).severity === 'high' ? '#FF6B00' : '#FFB800')
            : null;

          const magColor = isEarthquake
            ? ((event as any).magnitude >= 6 ? 'var(--danger)' : 'var(--quake)')
            : null;

          return (
            <div
              key={`${event.type}-${event.id}`}
              className={`ev ${selectedEvent === event.id ? 'selected' : ''}`}
              onClick={() => {
                if (hasDrawer) {
                  openDrawer(event);
                } else {
                  onEventSelect(event.id, event.type);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="ev-ico" style={{ color: event.color, fontSize: '13px' }}>
                {event.icon}
              </div>
              <div className="ev-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="ev-tp" style={{ color: event.color }}>
                  {isNews ? 'INTEL' : event.type.toUpperCase()}
                </div>
                <div className="ev-nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                {sublabel && (
                  <div className="ev-mt" style={{
                    opacity: 0.7, fontSize: '9px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: (isNews || isDisaster || isEarthquake) ? 'var(--accent)' : undefined,
                  }}>
                    {hasDrawer && <span style={{ marginRight: '3px' }}>&#9654;</span>}
                    {sublabel}
                  </div>
                )}
                <div className="ev-mt">{eventTime.toLocaleString()}</div>
              </div>

              {isEarthquake && (
                <div className="ev-lv" style={{ background: magColor!, color: '#fff' }}>
                  M{(event as any).magnitude.toFixed(1)}
                </div>
              )}
              {isVolcano && (
                <div className="ev-lv" style={{ background: (event as any).status === 'erupting' ? '#FF4500' : '#FF8C00', color: '#fff', fontSize: '8px' }}>
                  {(event as any).status === 'erupting' ? 'LIVE' : 'UNREST'}
                </div>
              )}
              {isGeopolitical && (
                <div className="ev-lv" style={{ background: sevColor!, color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <ExternalLink size={7} />
                  {((event as any).severity || 'MED').toUpperCase().slice(0, 4)}
                </div>
              )}
              {isNews && (
                <div className="ev-lv" style={{
                  background: sentimentColor ? `${sentimentColor}22` : 'rgba(0,212,160,0.12)',
                  border: `1px solid ${sentimentColor || 'var(--accent)'}44`,
                  color: sentimentColor || 'var(--accent)',
                  fontSize: '7px', letterSpacing: '0.5px',
                  display: 'flex', alignItems: 'center', gap: '2px',
                }}>
                  <ExternalLink size={7} />
                  SRC
                </div>
              )}
              {isDisaster && (
                <div className="ev-lv" style={{
                  background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.35)',
                  color: 'var(--fire)', fontSize: '7px', letterSpacing: '0.5px',
                  display: 'flex', alignItems: 'center', gap: '2px',
                }}>
                  <ExternalLink size={7} />
                  INFO
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ticker-wrap">
        <div className="ticker-lbl">ALERT</div>
        <div className="ticker-inner">
          <div className="ticker-txt">
            DHRUVA INTELLIGENCE SYSTEM OPERATIONAL • REAL-TIME MONITORING ACTIVE • ALL SYSTEMS NOMINAL • GLOBAL COVERAGE MAINTAINED •
          </div>
        </div>
      </div>
    </div>
  );
}
