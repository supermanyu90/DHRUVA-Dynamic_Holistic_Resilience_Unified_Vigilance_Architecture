import { useState, useEffect, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
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
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  selectedEvent: string | null;
  pendingDrawer?: { id: string; type: string } | null;
  onPendingDrawerConsumed?: () => void;
  onEventSelect: (id: string, type: string) => void;
  layersEnabled: {
    earthquakes: boolean;
    disasters: boolean;
    news: boolean;
    cables: boolean;
    military: boolean;
    nuclear: boolean;
    chokepoints: boolean;
    daynight: boolean;
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
    wx: boolean;
  };
  onLayerToggle: (layer: keyof SidebarProps['layersEnabled']) => void;
  mobileOpen?: boolean;
}

const SUPPORTED_DRAWER_TYPES = new Set(['news', 'earthquake', 'disaster', 'geopolitical', 'curfew', 'volcano']);

export function Sidebar({
  earthquakes,
  disasters,
  news,
  volcanoes,
  geopolitical,
  selectedEvent,
  pendingDrawer,
  onPendingDrawerConsumed,
  onEventSelect,
  layersEnabled,
  onLayerToggle,
  mobileOpen = false,
}: SidebarProps) {
  const [drawerEvent, setDrawerEvent] = useState<DrawerEvent | null>(null);

  useEffect(() => {
    if (!pendingDrawer) return;
    const { id, type } = pendingDrawer;
    const findAndOpen = () => {
      if (type === 'earthquake') {
        const found = earthquakes.find(e => e.id === id);
        if (found) setDrawerEvent({ type: 'earthquake', data: found });
      } else if (type === 'disaster') {
        const found = disasters.find(d => d.id === id);
        if (found) setDrawerEvent({ type: 'disaster', data: found });
      } else if (type === 'volcano') {
        const found = volcanoes.find(v => v.id === id);
        if (found) setDrawerEvent({ type: 'volcano', data: found });
      } else if (type === 'geopolitical') {
        const found = geopolitical.find(g => g.id === id);
        if (found) setDrawerEvent({ type: 'geopolitical', data: found });
      } else if (type === 'curfew') {
        const found = geopolitical.find(g => g.id === id);
        if (found) setDrawerEvent({ type: 'curfew', data: found });
      } else if (type === 'news') {
        const found = news.find(n => n.id === id);
        if (found) setDrawerEvent({ type: 'news', data: found });
      }
    };
    findAndOpen();
    onPendingDrawerConsumed?.();
  }, [pendingDrawer]);

  const last72Hours = useMemo(() => new Date(Date.now() - 72 * 60 * 60 * 1000), []);

  const filterByMode = (eventTime: Date) => eventTime >= last72Hours;

  const curfewEvents = useMemo(() => geopolitical.filter((g) => g.category === 'curfew'), [geopolitical]);

  const allEvents = useMemo(() => [
    ...earthquakes.map((e) => ({ ...e, type: 'earthquake', icon: '⚡', color: 'var(--quake)', sortTime: e.event_time })),
    ...disasters.map((d) => ({ ...d, type: 'disaster', icon: '⚠', color: 'var(--fire)', sortTime: d.event_date })),
    ...volcanoes.map((v) => ({ ...v, id: v.id, type: 'volcano', icon: '▲', color: '#FF4500', sortTime: v.updated_at })),
    ...geopolitical.filter((g) => g.category !== 'curfew').map((g) => ({ ...g, type: 'geopolitical', icon: '◉', color: g.severity === 'critical' ? '#FF2255' : g.severity === 'high' ? '#FF6B00' : '#FFB800', sortTime: g.updated_at })),
    ...curfewEvents.map((g) => ({ ...g, type: 'curfew', icon: '⊘', color: '#CC3300', sortTime: g.updated_at })),
    ...news.map((n) => ({ ...n, type: 'news', icon: '◎', color: 'var(--accent)', sortTime: n.published_at })),
  ]
    .filter((event) => filterByMode(new Date(event.sortTime)))
    .filter((event) => {
      if (event.type === 'earthquake') return layersEnabled.earthquakes;
      if (event.type === 'disaster') return layersEnabled.disasters;
      if (event.type === 'volcano') return layersEnabled.volcanoes;
      if (event.type === 'geopolitical') return layersEnabled.geopolitical;
      if (event.type === 'curfew') return layersEnabled.curfews;
      if (event.type === 'news') return layersEnabled.news;
      return true;
    })
    .sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime()),
  [earthquakes, disasters, volcanoes, geopolitical, curfewEvents, news, layersEnabled, last72Hours]);

  function openDrawer(event: typeof allEvents[0]) {
    if (event.type === 'news') {
      setDrawerEvent({ type: 'news', data: event as unknown as NewsEvent });
    } else if (event.type === 'earthquake') {
      setDrawerEvent({ type: 'earthquake', data: event as unknown as Earthquake });
    } else if (event.type === 'disaster') {
      setDrawerEvent({ type: 'disaster', data: event as unknown as Disaster });
    } else if (event.type === 'volcano') {
      setDrawerEvent({ type: 'volcano', data: event as unknown as VolcanoEvent });
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

      <div className="layer-bar" role="group" aria-label="Event layer filters">
        <button
          className={`lbtn ${layersEnabled.earthquakes ? 'active' : ''}`}
          onClick={() => onLayerToggle('earthquakes')}
          aria-pressed={layersEnabled.earthquakes}
          aria-label="Toggle earthquakes layer"
          style={{ borderColor: 'var(--quake)', color: 'var(--quake)' }}
        >
          <span className="ldot" style={{ background: 'var(--quake)' }} aria-hidden="true"></span>
          QUAKES
        </button>
        <button
          className={`lbtn ${layersEnabled.disasters ? 'active' : ''}`}
          onClick={() => onLayerToggle('disasters')}
          aria-pressed={layersEnabled.disasters}
          aria-label="Toggle disasters layer"
          style={{ borderColor: 'var(--fire)', color: 'var(--fire)' }}
        >
          <span className="ldot" style={{ background: 'var(--fire)' }} aria-hidden="true"></span>
          DISASTERS
        </button>
        <button
          className={`lbtn ${layersEnabled.news ? 'active' : ''}`}
          onClick={() => onLayerToggle('news')}
          aria-pressed={layersEnabled.news}
          aria-label="Toggle intel news layer"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          <span className="ldot" style={{ background: 'var(--accent)' }} aria-hidden="true"></span>
          INTEL
        </button>
        <button
          className={`lbtn ${layersEnabled.volcanoes ? 'active' : ''}`}
          onClick={() => onLayerToggle('volcanoes')}
          aria-pressed={layersEnabled.volcanoes}
          aria-label="Toggle volcanoes layer"
          style={{ borderColor: '#FF4500', color: '#FF4500' }}
        >
          <span className="ldot" style={{ background: '#FF4500' }} aria-hidden="true"></span>
          VOLCANOES
        </button>
        <button
          className={`lbtn ${layersEnabled.geopolitical ? 'active' : ''}`}
          onClick={() => onLayerToggle('geopolitical')}
          aria-pressed={layersEnabled.geopolitical}
          aria-label="Toggle geopolitical events layer"
          style={{ borderColor: '#FF2255', color: '#FF2255' }}
        >
          <span className="ldot" style={{ background: '#FF2255' }} aria-hidden="true"></span>
          GEO-POL
        </button>
        <button
          className={`lbtn ${layersEnabled.curfews ? 'active' : ''}`}
          onClick={() => onLayerToggle('curfews')}
          aria-pressed={layersEnabled.curfews}
          aria-label="Toggle curfews layer"
          style={{ borderColor: '#CC3300', color: '#CC3300' }}
        >
          <span className="ldot" style={{ background: '#CC3300' }} aria-hidden="true"></span>
          CURFEWS
        </button>
        <button
          className={`lbtn ${layersEnabled.wx ? 'active' : ''}`}
          onClick={() => onLayerToggle('wx')}
          aria-pressed={layersEnabled.wx}
          aria-label="Toggle weather alerts layer"
          style={{ borderColor: '#FFA500', color: '#FFA500' }}
        >
          <span className="ldot" style={{ background: '#FFA500' }} aria-hidden="true"></span>
          WX ALERTS
        </button>
        <button
          className={`lbtn lbtn-cab ${layersEnabled.cables ? 'active' : ''}`}
          onClick={() => onLayerToggle('cables')}
          aria-pressed={layersEnabled.cables}
          aria-label="Toggle submarine cables layer"
          style={{ borderColor: '#FF69B4', color: '#FF69B4' }}
        >
          <span className="ldot" style={{ background: '#FF69B4' }} aria-hidden="true"></span>
          CABLES
        </button>
        <button
          className={`lbtn lbtn-mil ${layersEnabled.military ? 'active' : ''}`}
          onClick={() => onLayerToggle('military')}
          aria-pressed={layersEnabled.military}
          aria-label="Toggle military bases layer"
          style={{ borderColor: '#4A9EFF', color: '#4A9EFF' }}
        >
          <span className="ldot" style={{ background: '#4A9EFF' }} aria-hidden="true"></span>
          MILITARY
        </button>
        <button
          className={`lbtn lbtn-nuke ${layersEnabled.nuclear ? 'active' : ''}`}
          onClick={() => onLayerToggle('nuclear')}
          aria-pressed={layersEnabled.nuclear}
          aria-label="Toggle nuclear sites layer"
          style={{ borderColor: '#39FF88', color: '#39FF88' }}
        >
          <span className="ldot" style={{ background: '#39FF88' }} aria-hidden="true"></span>
          NUCLEAR
        </button>
        <button
          className={`lbtn lbtn-dn ${layersEnabled.chokepoints ? 'active' : ''}`}
          onClick={() => onLayerToggle('chokepoints')}
          aria-pressed={layersEnabled.chokepoints}
          aria-label="Toggle maritime chokepoints layer"
          style={{ borderColor: '#FF6B00', color: '#FF6B00' }}
        >
          <span className="ldot" style={{ background: '#FF6B00' }} aria-hidden="true"></span>
          CHOKES
        </button>
        <button
          className={`lbtn ${layersEnabled.daynight ? 'active' : ''}`}
          onClick={() => onLayerToggle('daynight')}
          aria-pressed={layersEnabled.daynight}
          aria-label="Toggle day/night overlay"
          style={{ borderColor: '#A0C8FF', color: '#A0C8FF' }}
        >
          <span className="ldot" style={{ background: '#A0C8FF' }} aria-hidden="true"></span>
          DAY/NIGHT
        </button>
      </div>

      <div className="mode-bar">
        <button className="mbtn m-live" disabled>
          <span className="mpip" style={{ background: '#00D4A0' }}></span>
          LIVE
        </button>
      </div>

      <div className="ev-list" role="list" aria-label="Active events">
        {allEvents.map((event) => {
          const eventTime = new Date(event.sortTime);
          const isEarthquake = event.type === 'earthquake';
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
              role="listitem"
              tabIndex={0}
              aria-label={`${isNews ? 'Intel' : event.type} event: ${label}`}
              className={`ev ${selectedEvent === event.id ? 'selected' : ''}`}
              onClick={() => {
                if (hasDrawer) {
                  openDrawer(event);
                } else {
                  onEventSelect(event.id, event.type);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (hasDrawer) openDrawer(event);
                  else onEventSelect(event.id, event.type);
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
