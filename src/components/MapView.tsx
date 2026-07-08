import { useState } from 'react';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { ImdWarning, IMD_SEV_COLOR } from '../lib/imd';
import { WorldMapSVG } from './WorldMapSVG';
import { Globe3D } from './Globe3D';
import { Globe, Map, Tag } from 'lucide-react';

interface MapViewProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  imdWarnings: ImdWarning[];
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
    imd: boolean;
  };
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
  newEventIds?: Set<string>;
}

const REGION_PRESETS = [
  { key: 'globe',    label: 'GLOBE' },
  { key: 'americas', label: 'AMERICAS' },
  { key: 'europe',   label: 'EUROPE' },
  { key: 'mena',     label: 'MENA' },
  { key: 'asia',     label: 'ASIA' },
  { key: 'india',    label: 'INDIA' },
  { key: 'africa',   label: 'AFRICA' },
  { key: 'oceania',  label: 'OCEANIA' },
];

export function MapView({
  earthquakes,
  disasters,
  news,
  volcanoes,
  geopolitical,
  imdWarnings,
  onEventSelect,
  layersEnabled,
  timeFilter,
  onTimeFilterChange,
  showTooltip,
  hideTooltip,
  newEventIds,
}: MapViewProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [activeRegion, setActiveRegion] = useState('globe');
  const [showCableLabels, setShowCableLabels] = useState(false);

  const handleResetView = () => {
    setActiveRegion('globe');
  };

  const totalEvents = earthquakes.length + disasters.length + news.length + volcanoes.length + geopolitical.length;

  // Only warnings that actually resolved to coordinates appear as diamonds.
  const imdPlotted = imdWarnings.filter((w) => w.latitude != null && w.longitude != null);
  const imdRed = imdPlotted.filter((w) => w.worstSeverity === 'red').length;
  const imdOrange = imdPlotted.filter((w) => w.worstSeverity === 'orange').length;

  return (
    <div className="view active" id="view-map">
      <div className="time-filter-bar">
        <div className="tf-lbl">WINDOW:</div>
        {['1H', '6H', '24H', '7D', 'ALL'].map((filter) => (
          <button key={filter} className={`tf-btn ${timeFilter === filter ? 'active' : ''}`} onClick={() => onTimeFilterChange(filter)}>
            {filter}
          </button>
        ))}
        <div className="tf-event-count">{totalEvents} EVENTS</div>

        <div className="map-view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
            title="2D Map View"
          >
            <Map size={14} />
            2D MAP
          </button>
          <button
            className={`view-toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
            title="3D Globe View"
          >
            <Globe size={14} />
            3D GLOBE
          </button>
        </div>
      </div>

      <div id="map-container">
        {viewMode === '2d' ? (
          <WorldMapSVG
            earthquakes={earthquakes}
            disasters={disasters}
            news={news}
            volcanoes={volcanoes}
            geopolitical={geopolitical}
            imdWarnings={imdWarnings}
            onEventSelect={onEventSelect}
            layersEnabled={layersEnabled}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
            activeRegion={activeRegion}
            onResetView={handleResetView}
            newEventIds={newEventIds}
            showCableLabels={showCableLabels}
          />
        ) : (
          <Globe3D
            earthquakes={earthquakes}
            disasters={disasters}
            news={news}
            volcanoes={volcanoes}
            geopolitical={geopolitical}
            imdWarnings={imdWarnings}
            onEventSelect={onEventSelect}
            layersEnabled={layersEnabled}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
          />
        )}

        {viewMode === '2d' && layersEnabled.cables && (
          <button
            onClick={() => setShowCableLabels(v => !v)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              background: showCableLabels ? 'rgba(0,212,160,0.18)' : 'rgba(0,0,0,0.55)',
              border: `1px solid ${showCableLabels ? 'rgba(0,212,160,0.7)' : 'rgba(0,212,160,0.28)'}`,
              borderRadius: '3px',
              color: showCableLabels ? '#00D4A0' : 'rgba(0,212,160,0.6)',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '10px',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.15s',
              boxShadow: showCableLabels ? '0 0 8px rgba(0,212,160,0.25)' : 'none',
            }}
          >
            <Tag size={10} />
            {showCableLabels ? 'HIDE CABLE LABELS' : 'SHOW CABLE LABELS'}
          </button>
        )}

        <div className="scanline"></div>
        <div className="corner tl"></div>
        <div className="corner tr"></div>
        <div className="corner bl"></div>
        <div className="corner br"></div>

        <div className="map-view-label">
          {viewMode === '2d' ? 'EQUIRECTANGULAR PROJECTION' : '3D GLOBE VIEW'}
        </div>
        <div className="map-credits">DHRUVA GLOBAL INTELLIGENCE • {viewMode === '2d' ? 'SVG MAP' : 'WEBGL RENDERING'}</div>

        {layersEnabled.imd && imdPlotted.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 36,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '7px 9px',
              background: 'rgba(2, 5, 12, 0.82)',
              border: '1px solid rgba(255, 165, 0, 0.35)',
              borderRadius: '3px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              fontFamily: "'Share Tech Mono', monospace",
            }}
            aria-label="IMD weather warning map legend"
          >
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--dim)', marginBottom: '1px' }}>
              IMD WX WARNINGS
            </div>
            {([['red', 'RED', imdRed], ['orange', 'ORANGE', imdOrange]] as const).map(([sev, label, count]) => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="6" height="6" transform="rotate(45 6 6)" fill={IMD_SEV_COLOR[sev]} />
                </svg>
                <span style={{ fontSize: '9px', letterSpacing: '1px', color: IMD_SEV_COLOR[sev] }}>
                  {label}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--dim)', marginLeft: 'auto', paddingLeft: '8px' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}

        {viewMode === '2d' && (
          <div className="regional-bar">
            {REGION_PRESETS.map((r) => (
              <button
                key={r.key}
                className={`reg-btn ${activeRegion === r.key ? 'active' : ''}`}
                onClick={() => setActiveRegion(r.key)}
                onTouchEnd={(e) => { e.stopPropagation(); setActiveRegion(r.key); }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
