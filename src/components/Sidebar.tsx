import { useState } from 'react';
import { ExternalLink, X, Radio, Globe, Tag, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';

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
}

function NewsDetailDrawer({ item, onClose }: { item: NewsEvent; onClose: () => void }) {
  const sentimentColor = item.sentiment === 'positive' ? '#00D4A0' : item.sentiment === 'negative' ? '#FF4C4C' : 'var(--dim)';
  const SentimentIcon = item.sentiment === 'positive' ? TrendingUp : item.sentiment === 'negative' ? TrendingDown : Minus;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2,5,8,0.97)',
      border: '1px solid rgba(0,212,160,0.18)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Radio size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '10px', letterSpacing: '2.5px', color: 'var(--accent)' }}>INTEL REPORT</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', padding: '2px', lineHeight: 1 }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>

        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>
          {item.title}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(0,212,160,0.08)', border: '1px solid rgba(0,212,160,0.2)',
            borderRadius: '3px', padding: '3px 7px',
          }}>
            <Globe size={8} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: 'var(--accent)' }}>
              {item.source}
            </span>
          </div>
          {item.country && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(77,159,255,0.08)', border: '1px solid rgba(77,159,255,0.2)',
              borderRadius: '3px', padding: '3px 7px',
            }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: '#4D9FFF' }}>{item.country}</span>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: `${sentimentColor}11`, border: `1px solid ${sentimentColor}33`,
            borderRadius: '3px', padding: '3px 7px',
          }}>
            <SentimentIcon size={8} style={{ color: sentimentColor }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', color: sentimentColor, textTransform: 'uppercase' }}>
              {item.sentiment || 'neutral'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={8} style={{ color: 'var(--dim)' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--dim)' }}>
            {new Date(item.published_at).toLocaleString()}
          </span>
        </div>

        {item.categories && item.categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {item.categories.slice(0, 5).map((cat) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)',
                borderRadius: '3px', padding: '2px 6px',
              }}>
                <Tag size={7} style={{ color: 'var(--fire)' }} />
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--fire)', textTransform: 'uppercase' }}>{cat}</span>
              </div>
            ))}
          </div>
        )}

        {item.content && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '3px',
            padding: '8px 10px',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '9px', letterSpacing: '2px', color: 'var(--dim)', marginBottom: '5px' }}>SUMMARY</div>
            <p style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '11px',
              color: 'rgba(232,240,248,0.8)',
              lineHeight: 1.55,
            }}>
              {item.content.length > 300 ? item.content.slice(0, 300).trimEnd() + '…' : item.content}
            </p>
          </div>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              background: 'rgba(0,212,160,0.1)',
              border: '1px solid rgba(0,212,160,0.35)',
              borderRadius: '3px',
              padding: '9px 14px',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '12px',
              letterSpacing: '2px',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              cursor: 'pointer',
              flexShrink: 0,
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
            READ FULL ARTICLE — {item.source}
          </a>
        )}

      </div>
    </div>
  );
}

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
}: SidebarProps) {
  const [openNewsItem, setOpenNewsItem] = useState<NewsEvent | null>(null);

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
    .filter((event) => {
      const eventTime = new Date(event.sortTime);
      return filterByMode(eventTime);
    })
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

  return (
    <div className="sidebar" style={{ position: 'relative' }}>
      {openNewsItem && (
        <NewsDetailDrawer item={openNewsItem} onClose={() => setOpenNewsItem(null)} />
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

          let label = '';
          let sublabel = '';

          if (isEarthquake) {
            label = `M${(event as any).magnitude.toFixed(1)} ${(event as any).location}`;
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
          } else {
            label = (event as any).title || '';
          }

          const newsItem = isNews ? (event as any as NewsEvent) : null;
          const sentiment = newsItem?.sentiment;
          const sentimentColor = sentiment === 'positive' ? '#00D4A0' : sentiment === 'negative' ? '#FF4C4C' : undefined;

          return (
            <div
              key={`${event.type}-${event.id}`}
              className={`ev ${selectedEvent === event.id ? 'selected' : ''}`}
              onClick={() => {
                if (isNews && newsItem) {
                  setOpenNewsItem(newsItem);
                } else {
                  onEventSelect(event.id, event.type);
                }
              }}
              style={isNews ? { cursor: 'pointer' } : undefined}
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
                  <div className="ev-mt" style={{ opacity: 0.7, fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isNews ? 'var(--accent)' : undefined }}>
                    {isNews && <span style={{ marginRight: '3px' }}>&#9654;</span>}
                    {sublabel}
                  </div>
                )}
                <div className="ev-mt">{eventTime.toLocaleString()}</div>
              </div>
              {isEarthquake && (
                <div
                  className="ev-lv"
                  style={{
                    background: (event as any).magnitude >= 6 ? 'var(--danger)' : 'var(--quake)',
                    color: '#fff',
                  }}
                >
                  M{(event as any).magnitude.toFixed(1)}
                </div>
              )}
              {isVolcano && (
                <div
                  className="ev-lv"
                  style={{
                    background: (event as any).status === 'erupting' ? '#FF4500' : '#FF8C00',
                    color: '#fff',
                    fontSize: '8px',
                  }}
                >
                  {(event as any).status === 'erupting' ? 'LIVE' : 'UNREST'}
                </div>
              )}
              {isGeopolitical && (
                <div
                  className="ev-lv"
                  style={{
                    background: (event as any).severity === 'critical' ? '#FF2255' : (event as any).severity === 'high' ? '#FF6B00' : '#FFB800',
                    color: '#fff',
                    fontSize: '8px',
                  }}
                >
                  {((event as any).severity || 'MED').toUpperCase().slice(0, 4)}
                </div>
              )}
              {isNews && (
                <div
                  className="ev-lv"
                  style={{
                    background: sentimentColor ? `${sentimentColor}22` : 'rgba(0,212,160,0.12)',
                    border: `1px solid ${sentimentColor || 'var(--accent)'}44`,
                    color: sentimentColor || 'var(--accent)',
                    fontSize: '7px',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <ExternalLink size={7} />
                  SRC
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
