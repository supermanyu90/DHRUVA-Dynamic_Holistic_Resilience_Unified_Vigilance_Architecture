import { Earthquake, Disaster, NewsEvent } from '../lib/intelligence-api';

interface SidebarProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
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
  };
  onLayerToggle: (layer: keyof SidebarProps['layersEnabled']) => void;
}

export function Sidebar({
  earthquakes,
  disasters,
  news,
  selectedEvent,
  onEventSelect,
  mode,
  onModeChange,
  layersEnabled,
  onLayerToggle,
}: SidebarProps) {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const filterByMode = (eventTime: Date) => {
    if (mode === 'live') {
      return eventTime >= last24Hours;
    }
    return true;
  };

  const allEvents = [
    ...earthquakes.map((e) => ({ ...e, type: 'earthquake', icon: '🌍', color: 'var(--quake)' })),
    ...disasters.map((d) => ({ ...d, type: 'disaster', icon: '⚠️', color: 'var(--fire)' })),
  ]
    .filter((event) => {
      const eventTime = 'event_time' in event
        ? new Date(event.event_time)
        : 'event_date' in event
        ? new Date(event.event_date)
        : new Date((event as any).published_at);
      return filterByMode(eventTime);
    })
    .sort((a, b) => {
      const dateA = 'event_time' in a ? new Date(a.event_time) : 'event_date' in a ? new Date(a.event_date) : new Date(a.published_at);
      const dateB = 'event_time' in b ? new Date(b.event_time) : 'event_date' in b ? new Date(b.event_date) : new Date(b.published_at);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="sidebar">
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
        {allEvents
          .filter((event) => {
            if (event.type === 'earthquake') return layersEnabled.earthquakes;
            if (event.type === 'disaster') return layersEnabled.disasters;
            return true;
          })
          .map((event) => {
            const eventTime =
              'event_time' in event
                ? new Date(event.event_time)
                : 'event_date' in event
                ? new Date(event.event_date)
                : new Date(event.published_at);
            const isEarthquake = event.type === 'earthquake';
            const isDisaster = event.type === 'disaster';

            return (
              <div
                key={event.id}
                className={`ev ${selectedEvent === event.id ? 'selected' : ''}`}
                onClick={() => onEventSelect(event.id, event.type)}
              >
                <div className="ev-ico" style={{ color: event.color }}>
                  {event.icon}
                </div>
                <div className="ev-info">
                  <div className="ev-tp" style={{ color: event.color }}>
                    {event.type.toUpperCase()}
                  </div>
                  <div className="ev-nm">
                    {isEarthquake
                      ? `M${(event as any).magnitude.toFixed(1)} ${(event as any).location}`
                      : isDisaster
                      ? (event as any).title
                      : (event as any).title}
                  </div>
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
