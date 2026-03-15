import { useEffect, useRef, useState } from 'react';
import { Earthquake, Disaster, NewsEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES } from '../lib/cable-data';

interface WorldMapSVGProps {
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
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
}

interface TopoJSONTransform {
  scale: [number, number];
  translate: [number, number];
}

interface TopoJSONArc extends Array<[number, number]> {}

interface TopoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | string;
  arcs: any;
  properties?: any;
}

interface TopoJSONObject {
  type: string;
  geometries?: TopoJSONGeometry[];
}

interface TopoJSONData {
  type: string;
  arcs: TopoJSONArc[];
  transform: TopoJSONTransform;
  objects: {
    countries: TopoJSONObject;
  };
}

export function WorldMapSVG({
  earthquakes,
  disasters,
  news,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
}: WorldMapSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 500 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [landPaths, setLandPaths] = useState<string[]>([]);
  const [countryLabels, setCountryLabels] = useState<Array<{ x: number; y: number; name: string }>>([]);

  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = 500;

  const latToY = (lat: number): number => {
    return ((90 - lat) / 180) * MAP_HEIGHT;
  };

  const lonToX = (lon: number): number => {
    return ((lon + 180) / 360) * MAP_WIDTH;
  };

  const chokepoints = [
    { name: 'Strait of Hormuz', lat: 26.5, lon: 56.25 },
    { name: 'Suez Canal', lat: 30.5, lon: 32.35 },
    { name: 'Strait of Malacca', lat: 2.5, lon: 101.25 },
    { name: 'Bab el-Mandeb', lat: 12.5, lon: 43.3 },
    { name: 'Panama Canal', lat: 9, lon: -79.5 },
  ];

  const militaryBases = [
    { name: 'Diego Garcia', lat: -7.3, lon: 72.4 },
    { name: 'Guam', lat: 13.4, lon: 144.8 },
    { name: 'Djibouti', lat: 11.6, lon: 43.1 },
  ];

  const nuclearSites = [
    { name: 'Pokhran', lat: 27.1, lon: 71.7 },
    { name: 'Los Alamos', lat: 35.9, lon: -106.3 },
  ];

  useEffect(() => {
    const loadWorldMap = async () => {
      try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const worldData: TopoJSONData = await response.json();

        const response50 = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
        const worldData50: TopoJSONData = await response50.json();

        const arcs = worldData.arcs;
        const scale = worldData.transform.scale;
        const translate = worldData.transform.translate;

        const arcToPoints = (arcIndex: number): Array<[number, number]> => {
          const reverse = arcIndex < 0;
          const arc = arcs[reverse ? ~arcIndex : arcIndex];
          let x = 0;
          let y = 0;
          const points = arc.map(([dx, dy]) => {
            x += dx;
            y += dy;
            const lon = x * scale[0] + translate[0];
            const lat = y * scale[1] + translate[1];
            return [lonToX(lon), latToY(lat)] as [number, number];
          });
          return reverse ? points.reverse() : points;
        };

        const ringToPathData = (ring: number[]): string => {
          const points = ring.flatMap((i) => arcToPoints(i));
          if (points.length === 0) return '';
          return 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
        };

        const geometryToPathData = (geom: TopoJSONGeometry): string => {
          if (geom.type === 'Polygon') {
            return geom.arcs.map((ring: number[]) => ringToPathData(ring)).join(' ');
          }
          if (geom.type === 'MultiPolygon') {
            return geom.arcs
              .flatMap((polygon: number[][]) => polygon.map((ring) => ringToPathData(ring)))
              .join(' ');
          }
          return '';
        };

        const geometries = worldData.objects.countries.geometries || [];
        const paths = geometries
          .map((geom) => geometryToPathData(geom))
          .filter((d) => d.length > 0);

        setLandPaths(paths);

        const labels: Array<{ x: number; y: number; name: string }> = [];
        const arcs50 = worldData50.arcs;
        const scale50 = worldData50.transform.scale;
        const translate50 = worldData50.transform.translate;

        const labelOverrides: Record<string, { lon: number; lat: number }> = {
          'United States of America': { lon: -98, lat: 39 },
          Russia: { lon: 95, lat: 63 },
          Canada: { lon: -96, lat: 63 },
          Brazil: { lon: -53, lat: -12 },
          Australia: { lon: 134, lat: -25 },
          China: { lon: 103, lat: 35 },
          India: { lon: 79, lat: 22 },
          Argentina: { lon: -65, lat: -36 },
        };

        const shortNames: Record<string, string> = {
          'United States of America': 'USA',
          'Democratic Republic of the Congo': 'DR Congo',
          'United Kingdom': 'UK',
          'United Arab Emirates': 'UAE',
        };

        const geometries50 = worldData50.objects.countries.geometries || [];
        geometries50.forEach((geom) => {
          const name = geom.properties?.name || '';
          if (!name) return;

          let lon, lat;
          if (labelOverrides[name]) {
            lon = labelOverrides[name].lon;
            lat = labelOverrides[name].lat;
          } else {
            const arcsPts = geom.arcs;
            const allPoints: Array<[number, number]> = [];
            const collectPoints = (arcs: any) => {
              if (Array.isArray(arcs)) {
                arcs.forEach((item) => {
                  if (typeof item === 'number') {
                    const reverse = item < 0;
                    const arc = arcs50[reverse ? ~item : item];
                    let x = 0;
                    let y = 0;
                    arc.forEach(([dx, dy]: [number, number]) => {
                      x += dx;
                      y += dy;
                      allPoints.push([x * scale50[0] + translate50[0], y * scale50[1] + translate50[1]]);
                    });
                  } else if (Array.isArray(item)) {
                    collectPoints(item);
                  }
                });
              }
            };
            collectPoints(arcsPts);

            if (allPoints.length > 0) {
              const sumLon = allPoints.reduce((sum, [lo]) => sum + lo, 0);
              const sumLat = allPoints.reduce((sum, [, la]) => sum + la, 0);
              lon = sumLon / allPoints.length;
              lat = sumLat / allPoints.length;
            } else {
              return;
            }
          }

          const label = shortNames[name] || name;
          const bounds = { lon, lat };

          if (Math.abs(bounds.lat) < 75) {
            labels.push({
              x: lonToX(lon),
              y: latToY(lat),
              name: label,
            });
          }
        });

        setCountryLabels(labels);
      } catch (error) {
        console.error('Failed to load world map:', error);
      }
    };

    loadWorldMap();
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;

    setViewBox((prev) => {
      const newWidth = Math.max(400, Math.min(2000, prev.width * delta));
      const newHeight = Math.max(200, Math.min(1000, prev.height * delta));

      const mouseX = e.clientX - (containerRef.current?.getBoundingClientRect().left || 0);
      const mouseY = e.clientY - (containerRef.current?.getBoundingClientRect().top || 0);

      const containerWidth = containerRef.current?.clientWidth || 1;
      const containerHeight = containerRef.current?.clientHeight || 1;

      const mouseRelX = mouseX / containerWidth;
      const mouseRelY = mouseY / containerHeight;

      const newX = prev.x + (prev.width - newWidth) * mouseRelX;
      const newY = prev.y + (prev.height - newHeight) * mouseRelY;

      return { x: newX, y: newY, width: newWidth, height: newHeight };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    const containerWidth = containerRef.current?.clientWidth || 1;
    const containerHeight = containerRef.current?.clientHeight || 1;

    const scaleX = viewBox.width / containerWidth;
    const scaleY = viewBox.height / containerHeight;

    setViewBox((prev) => ({
      ...prev,
      x: prev.x - dx * scaleX,
      y: prev.y - dy * scaleY,
    }));

    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMarkerClick = (id: string, type: string) => {
    onEventSelect(id, type);
  };

  const handleMarkerHover = (e: React.MouseEvent, content: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      showTooltip(e.clientX - rect.left, e.clientY - rect.top, content);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'grab',
        background: '#04101e',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#04101e" />

        <g className="graticule">
          {Array.from({ length: 9 }, (_, i) => {
            const lat = -80 + i * 20;
            const y = latToY(lat);
            return <line key={`lat-${lat}`} x1="0" y1={y} x2={MAP_WIDTH} y2={y} stroke="rgba(0,212,160,0.04)" strokeWidth="0.25" />;
          })}
          {Array.from({ length: 19 }, (_, i) => {
            const lon = -180 + i * 20;
            const x = lonToX(lon);
            return <line key={`lon-${lon}`} x1={x} y1="0" x2={x} y2={MAP_HEIGHT} stroke="rgba(0,212,160,0.04)" strokeWidth="0.25" />;
          })}
        </g>

        <g className="world-land">
          {landPaths.map((path, idx) => (
            <path key={`land-${idx}`} d={path} className="land" fill="#0a1c30" stroke="#162e48" strokeWidth="0.35" />
          ))}
        </g>

        <g className="country-labels">
          {countryLabels.map((label, idx) => (
            <text
              key={`label-${idx}`}
              x={label.x}
              y={label.y}
              fill="rgba(139,175,200,0.25)"
              fontSize="3"
              fontFamily="Share Tech Mono, monospace"
              textAnchor="middle"
              pointerEvents="none"
            >
              {label.name}
            </text>
          ))}
        </g>

        {layersEnabled.cables && (
          <g className="cable-layer">
            {UNDERSEA_CABLES.map((cable) => {
              const pathData = cable.points
                .map(([lon, lat], idx) => {
                  const x = lonToX(lon);
                  const y = latToY(lat);
                  return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');

              return (
                <path
                  key={cable.name}
                  d={pathData}
                  fill="none"
                  stroke={cable.color}
                  strokeWidth="0.85"
                  opacity="0.55"
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onMouseEnter={(e) => handleMarkerHover(e, cable.name)}
                  onMouseLeave={hideTooltip}
                />
              );
            })}
          </g>
        )}

        {layersEnabled.chokepoints &&
          chokepoints.map((point) => {
            const x = lonToX(point.lon);
            const y = latToY(point.lat);
            return (
              <g key={point.name}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#FF6B00"
                  opacity="0.7"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, point.name)}
                  onMouseLeave={hideTooltip}
                />
                <text x={x + 5} y={y + 2} fill="#FF6B00" fontSize="4" fontFamily="Share Tech Mono">
                  {point.name.toUpperCase()}
                </text>
              </g>
            );
          })}

        {layersEnabled.military &&
          militaryBases.map((base) => {
            const x = lonToX(base.lon);
            const y = latToY(base.lat);
            return (
              <rect
                key={base.name}
                x={x - 2.5}
                y={y - 2.5}
                width="5"
                height="5"
                fill="#4A9EFF"
                opacity="0.8"
                filter="url(#glow)"
                onMouseEnter={(e) => handleMarkerHover(e, base.name)}
                onMouseLeave={hideTooltip}
              />
            );
          })}

        {layersEnabled.nuclear &&
          nuclearSites.map((site) => {
            const x = lonToX(site.lon);
            const y = latToY(site.lat);
            return (
              <polygon
                key={site.name}
                points={`${x},${y - 3} ${x - 2.5},${y + 2} ${x + 2.5},${y + 2}`}
                fill="rgba(57, 255, 136, 0.3)"
                stroke="#39FF88"
                strokeWidth="1"
                opacity="0.8"
                filter="url(#glow)"
                onMouseEnter={(e) => handleMarkerHover(e, site.name)}
                onMouseLeave={hideTooltip}
              />
            );
          })}

        {layersEnabled.earthquakes &&
          earthquakes.map((eq) => {
            const x = lonToX(eq.longitude);
            const y = latToY(eq.latitude);
            const radius = Math.max(2, eq.magnitude * 1.5);
            return (
              <circle
                key={eq.id}
                cx={x}
                cy={y}
                r={radius}
                fill={`rgba(77, 159, 255, ${0.3 + eq.magnitude / 20})`}
                stroke="#4D9FFF"
                strokeWidth="0.8"
                filter="url(#glow)"
                style={{ cursor: 'pointer' }}
                onClick={() => handleMarkerClick(eq.id, 'earthquake')}
                onMouseEnter={(e) => handleMarkerHover(e, `M${eq.magnitude.toFixed(1)} - ${eq.location}`)}
                onMouseLeave={hideTooltip}
              />
            );
          })}

        {layersEnabled.disasters &&
          disasters.slice(0, 30).map((disaster) => {
            const randomLat = Math.random() * 140 - 70;
            const randomLon = Math.random() * 300 - 150;
            const x = lonToX(randomLon);
            const y = latToY(randomLat);
            return (
              <circle
                key={disaster.id}
                cx={x}
                cy={y}
                r="3"
                fill="rgba(255, 107, 0, 0.6)"
                stroke="#FF6B00"
                strokeWidth="0.7"
                filter="url(#glow)"
                style={{ cursor: 'pointer' }}
                onClick={() => handleMarkerClick(disaster.id, 'disaster')}
                onMouseEnter={(e) => handleMarkerHover(e, disaster.title)}
                onMouseLeave={hideTooltip}
              />
            );
          })}

        {layersEnabled.news &&
          news.slice(0, 20).map((item) => {
            const randomLat = Math.random() * 140 - 70;
            const randomLon = Math.random() * 300 - 150;
            const x = lonToX(randomLon);
            const y = latToY(randomLat);
            return (
              <circle
                key={item.id}
                cx={x}
                cy={y}
                r="2"
                fill="rgba(0, 212, 160, 0.5)"
                stroke="#00D4A0"
                strokeWidth="0.5"
                filter="url(#glow)"
                style={{ cursor: 'pointer' }}
                onClick={() => handleMarkerClick(item.id, 'news')}
                onMouseEnter={(e) => handleMarkerHover(e, item.title)}
                onMouseLeave={hideTooltip}
              />
            );
          })}
      </svg>
    </div>
  );
}
