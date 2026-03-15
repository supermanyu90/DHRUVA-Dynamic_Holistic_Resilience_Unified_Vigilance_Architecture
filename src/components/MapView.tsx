import { useState } from 'react';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { WorldMapSVG } from './WorldMapSVG';
import { Globe3D } from './Globe3D';
import { Globe, Map } from 'lucide-react';

interface MapViewProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  vessels: Vessel[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
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
    vessels: boolean;
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
  };
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
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
  vessels,
  volcanoes,
  geopolitical,
  onEventSelect,
  layersEnabled,
  timeFilter,
  onTimeFilterChange,
  showTooltip,
  hideTooltip,
}: MapViewProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [activeRegion, setActiveRegion] = useState('globe');

  const totalEvents = earthquakes.length + disasters.length + news.length + volcanoes.length + geopolitical.length;

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
            vessels={vessels}
            volcanoes={volcanoes}
            geopolitical={geopolitical}
            onEventSelect={onEventSelect}
            layersEnabled={layersEnabled}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
            activeRegion={activeRegion}
          />
        ) : (
          <Globe3D
            earthquakes={earthquakes}
            disasters={disasters}
            news={news}
            vessels={vessels}
            volcanoes={volcanoes}
            geopolitical={geopolitical}
            onEventSelect={onEventSelect}
            layersEnabled={layersEnabled}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
          />
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

        {viewMode === '2d' && (
          <div className="regional-bar">
            {REGION_PRESETS.map((r) => (
              <button
                key={r.key}
                className={`reg-btn ${activeRegion === r.key ? 'active' : ''}`}
                onClick={() => setActiveRegion(r.key)}
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
