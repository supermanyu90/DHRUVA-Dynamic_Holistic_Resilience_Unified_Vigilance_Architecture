import { useState } from 'react';
import { Earthquake, Disaster, NewsEvent } from '../lib/intelligence-api';
import { WorldMapSVG } from './WorldMapSVG';
import { Globe3D } from './Globe3D';
import { Globe, Map } from 'lucide-react';

interface MapViewProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  onEventSelect: (id: string, type: string) => void;
  layersEnabled: {
    earthquakes: boolean;
    disasters: boolean;
    news: boolean;
    cables: boolean;
    military: boolean;
    nuclear: boolean;
    chokepoints: boolean;
  };
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
}

export function MapView({
  earthquakes,
  disasters,
  news,
  onEventSelect,
  layersEnabled,
  timeFilter,
  onTimeFilterChange,
  showTooltip,
  hideTooltip,
}: MapViewProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  return (
    <div className="view active" id="view-map">
      <div className="time-filter-bar">
        <div className="tf-lbl">TIME:</div>
        {['1H', '6H', '12H', '24H', '7D', '30D', 'ALL'].map((filter) => (
          <button key={filter} className={`tf-btn ${timeFilter === filter ? 'active' : ''}`} onClick={() => onTimeFilterChange(filter)}>
            {filter}
          </button>
        ))}
        <div className="tf-event-count">{earthquakes.length + disasters.length} events</div>

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
            onEventSelect={onEventSelect}
            layersEnabled={layersEnabled}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
          />
        ) : (
          <Globe3D
            earthquakes={earthquakes}
            disasters={disasters}
            news={news}
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
      </div>
    </div>
  );
}
