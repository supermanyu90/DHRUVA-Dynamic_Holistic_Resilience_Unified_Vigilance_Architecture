import { useEffect, useRef, useState, useMemo } from 'react';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES, CHOKEPOINTS, MILITARY_BASES, NUCLEAR_SITES } from '../lib/cable-data';
import { INDIA_OUTER_BOUNDARY, INDIA_NORTHERN_TERRITORY, INDIA_DISCLAIMER } from '../lib/india-boundary';

const REGIONS: Record<string, { cx: number; cy: number; scale: number }> = {
  globe:    { cx: 0,    cy: 0,   scale: 1.0 },
  americas: { cx: -80,  cy: 5,   scale: 2.2 },
  europe:   { cx: 15,   cy: 52,  scale: 3.8 },
  mena:     { cx: 38,   cy: 25,  scale: 3.2 },
  asia:     { cx: 100,  cy: 35,  scale: 2.5 },
  india:    { cx: 78,   cy: 22,  scale: 5.5 },
  africa:   { cx: 20,   cy: 0,   scale: 2.8 },
  oceania:  { cx: 140,  cy: -25, scale: 3.2 },
};

interface WorldMapSVGProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
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
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
  };
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
  activeRegion?: string;
  onResetView?: () => void;
  newEventIds?: Set<string>;
  showCableLabels?: boolean;
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
  volcanoes,
  geopolitical,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
  activeRegion = 'globe',
  onResetView,
  newEventIds = new Set(),
  showCableLabels = false,
}: WorldMapSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 500 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [landPaths, setLandPaths] = useState<string[]>([]);
  const [countryLabels, setCountryLabels] = useState<Array<{ x: number; y: number; name: string }>>([]);
  const touchStateRef = useRef<{ touches: React.Touch[]; lastDist: number | null }>({ touches: [], lastDist: null });

  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = 500;

  const latToY = (lat: number): number => {
    return ((90 - lat) / 180) * MAP_HEIGHT;
  };

  const lonToX = (lon: number): number => {
    return ((lon + 180) / 360) * MAP_WIDTH;
  };

  const cableLabelPositions = useMemo(() => {
    const FONT_SIZE = 4;
    const LINE_H = FONT_SIZE + 1.8;
    const PAD_X = 5;
    const PAD_Y = 3.5;
    const MAX_CHARS_PER_LINE = 16;

    function wrapText(name: string): string[] {
      if (!name) return [''];
      const words = name.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > MAX_CHARS_PER_LINE && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];

    return UNDERSEA_CABLES.map((cable) => {
      const lines = wrapText(cable.name);
      const maxLineLen = Math.max(...lines.map((l) => l.length));
      const PILL_W = maxLineLen * FONT_SIZE * 0.62 + PAD_X * 2;
      const PILL_H = lines.length * LINE_H + PAD_Y * 2;

      const mid = cable.points[Math.floor(cable.points.length / 2)];
      const baseX = lonToX(mid[0]);
      const baseY = latToY(mid[1]);

      let cx = baseX;
      let cy = baseY;
      const offsets = [0, 16, -16, 32, -32, 48, -48, 64, -64, 80, -80, 100, -100];
      outer: for (const dy of offsets) {
        for (const dx of offsets) {
          const tx = baseX + dx;
          const ty = baseY + dy;
          const overlap = placed.some(
            (p) =>
              Math.abs(p.x - tx) < (p.w + PILL_W) / 2 + 3 &&
              Math.abs(p.y - ty) < (p.h + PILL_H) / 2 + 3
          );
          if (!overlap) {
            cx = tx;
            cy = ty;
            break outer;
          }
        }
      }

      placed.push({ x: cx, y: cy, w: PILL_W, h: PILL_H });
      return { name: cable.name, lines, color: cable.color, x: cx, y: cy, w: PILL_W, h: PILL_H, lineH: LINE_H, padY: PAD_Y };
    });
  }, []);

  const dayNightPaths = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * (Math.PI / 180);
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLon = -((utcHour / 24) * 360 - 180);

    const terminatorPoints: Array<[number, number]> = [];
    for (let lon = -180; lon <= 180; lon += 1) {
      const lonRad = ((lon - sunLon + 540) % 360 - 180) * (Math.PI / 180);
      const lat = Math.atan(-Math.cos(lonRad) / Math.tan(declination)) * (180 / Math.PI);
      terminatorPoints.push([lon, lat]);
    }

    const nightPolePath = (() => {
      const pts = terminatorPoints.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`);
      const nightTop = declination > 0;
      const capY = nightTop ? latToY(90) : latToY(-90);
      return `M${pts.join('L')}L${lonToX(180).toFixed(1)},${capY}L${lonToX(-180).toFixed(1)},${capY}Z`;
    })();

    const terminatorLinePts = terminatorPoints
      .map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`)
      .join('L');

    return { nightPath: nightPolePath, terminatorLine: `M${terminatorLinePts}` };
  }, []);

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

  useEffect(() => {
    const region = REGIONS[activeRegion] || REGIONS.globe;
    const scaledWidth = MAP_WIDTH / region.scale;
    const scaledHeight = MAP_HEIGHT / region.scale;
    const centerX = lonToX(region.cx);
    const centerY = latToY(region.cy);
    setViewBox({
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    });
  }, [activeRegion]);

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

  const handleZoomIn = () => {
    setViewBox((prev) => {
      const factor = 0.75;
      const newWidth = Math.max(100, prev.width * factor);
      const newHeight = Math.max(50, prev.height * factor);
      return {
        x: prev.x + (prev.width - newWidth) * 0.5,
        y: prev.y + (prev.height - newHeight) * 0.5,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const handleZoomOut = () => {
    setViewBox((prev) => {
      const factor = 1.33;
      const newWidth = Math.min(2000, prev.width * factor);
      const newHeight = Math.min(1000, prev.height * factor);
      return {
        x: prev.x + (prev.width - newWidth) * 0.5,
        y: prev.y + (prev.height - newHeight) * 0.5,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const handleResetView = () => {
    const region = REGIONS['globe'];
    const scaledWidth = MAP_WIDTH / region.scale;
    const scaledHeight = MAP_HEIGHT / region.scale;
    const centerX = lonToX(region.cx);
    const centerY = latToY(region.cy);
    setViewBox({
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    });
    onResetView?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as unknown as React.Touch[];
    touchStateRef.current.touches = touches;
    if (touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: touches[0].clientX, y: touches[0].clientY });
      touchStateRef.current.lastDist = null;
    } else if (touches.length === 2) {
      setIsPanning(false);
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchStateRef.current.lastDist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as unknown as React.Touch[];

    if (touches.length === 1 && isPanning) {
      const dx = touches[0].clientX - panStart.x;
      const dy = touches[0].clientY - panStart.y;
      const containerWidth = containerRef.current?.clientWidth || 1;
      const containerHeight = containerRef.current?.clientHeight || 1;
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx * (prev.width / containerWidth),
        y: prev.y - dy * (prev.height / containerHeight),
      }));
      setPanStart({ x: touches[0].clientX, y: touches[0].clientY });
    } else if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const lastDist = touchStateRef.current.lastDist;

      if (lastDist !== null && lastDist > 0) {
        const scale = lastDist / newDist;
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        const containerRect = containerRef.current?.getBoundingClientRect();
        const relX = containerRect ? (midX - containerRect.left) / containerRect.width : 0.5;
        const relY = containerRect ? (midY - containerRect.top) / containerRect.height : 0.5;

        setViewBox((prev) => {
          const newWidth = Math.max(80, Math.min(2000, prev.width * scale));
          const newHeight = Math.max(40, Math.min(1000, prev.height * scale));
          return {
            x: prev.x + (prev.width - newWidth) * relX,
            y: prev.y + (prev.height - newHeight) * relY,
            width: newWidth,
            height: newHeight,
          };
        });
      }
      touchStateRef.current.lastDist = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      setIsPanning(false);
      touchStateRef.current.lastDist = null;
    } else if (e.touches.length === 1) {
      touchStateRef.current.lastDist = null;
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
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
        position: 'relative',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleZoomIn(); }}
          title="Zoom In"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(4, 16, 30, 0.92)',
            border: '1px solid rgba(0, 212, 160, 0.35)',
            color: '#00d4a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontFamily: 'Share Tech Mono, monospace',
            lineHeight: 1,
            borderRadius: '4px',
            transition: 'background 0.15s, border-color 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 212, 160, 0.15)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.7)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(4, 16, 30, 0.92)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.35)';
          }}
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleZoomOut(); }}
          title="Zoom Out"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(4, 16, 30, 0.92)',
            border: '1px solid rgba(0, 212, 160, 0.35)',
            color: '#00d4a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontFamily: 'Share Tech Mono, monospace',
            lineHeight: 1,
            borderRadius: '4px',
            transition: 'background 0.15s, border-color 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 212, 160, 0.15)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.7)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(4, 16, 30, 0.92)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.35)';
          }}
        >
          −
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleResetView(); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleResetView(); }}
          title="Reset to Globe View"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(4, 16, 30, 0.92)',
            border: '1px solid rgba(0, 212, 160, 0.35)',
            color: '#00d4a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontFamily: 'Share Tech Mono, monospace',
            lineHeight: 1,
            borderRadius: '4px',
            letterSpacing: '0.02em',
            transition: 'background 0.15s, border-color 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 212, 160, 0.15)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.7)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(4, 16, 30, 0.92)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 212, 160, 0.35)';
          }}
        >
          RST
        </button>
      </div>
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
          <style>{`
            @keyframes mapPulse {
              0%   { r: 4; opacity: 0.8; }
              100% { r: 14; opacity: 0; }
            }
          `}</style>
        </defs>

        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#04101e" />

        {layersEnabled.daynight && (
          <g className="daynight-layer">
            <path
              d={dayNightPaths.nightPath}
              fill="rgba(0,10,40,0.55)"
              stroke="none"
              pointerEvents="none"
            />
            <path
              d={dayNightPaths.terminatorLine}
              fill="none"
              stroke="rgba(160,200,255,0.6)"
              strokeWidth="0.7"
              strokeDasharray="4,3"
              pointerEvents="none"
            />
          </g>
        )}

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

        <g className="india-goi-boundary" aria-label={INDIA_DISCLAIMER}>
          {INDIA_OUTER_BOUNDARY.length > 0 && (
            <path
              d={
                'M' +
                INDIA_OUTER_BOUNDARY.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join('L') +
                'Z'
              }
              fill="#0d2438"
              stroke="#2a6a54"
              strokeWidth="0.7"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
          {INDIA_NORTHERN_TERRITORY.length > 0 && (
            <path
              d={
                'M' +
                INDIA_NORTHERN_TERRITORY.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join('L') +
                'Z'
              }
              fill="#0d2438"
              stroke="#2a6a54"
              strokeWidth="0.7"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
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

        {layersEnabled.cables && showCableLabels && (
          <g className="cable-labels-layer" pointerEvents="none">
            {cableLabelPositions.map((label) => {
              const rx = 2.5;
              const totalTextH = label.lines.length * label.lineH;
              const textStartY = label.y - totalTextH / 2 + label.lineH * 0.72;
              return (
                <g key={label.name}>
                  <rect
                    x={label.x - label.w / 2}
                    y={label.y - label.h / 2}
                    width={label.w}
                    height={label.h}
                    rx={rx}
                    ry={rx}
                    fill="rgba(2,5,8,0.88)"
                    stroke={label.color}
                    strokeWidth="0.65"
                    opacity="0.97"
                  />
                  {label.lines.map((line, i) => (
                    <text
                      key={i}
                      x={label.x}
                      y={textStartY + i * label.lineH}
                      fill={label.color}
                      fontSize="4"
                      fontFamily="'Share Tech Mono', monospace"
                      textAnchor="middle"
                      dominantBaseline="auto"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>
        )}

        {layersEnabled.chokepoints &&
          CHOKEPOINTS.map((point) => {
            const x = lonToX(point.lon);
            const y = latToY(point.lat);
            const color = point.type === 'strategic' ? '#FF2255' : point.type === 'energy' ? '#FFB800' : '#FF6B00';
            return (
              <g key={point.name} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r="5" fill={color} opacity="0.12" />
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={color}
                  opacity="0.85"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `${point.name} — ${point.desc}`)}
                  onMouseLeave={hideTooltip}
                />
                <text x={x + 4} y={y + 1.5} fill={color} fontSize="3.5" fontFamily="Share Tech Mono" opacity="0.9" pointerEvents="none">
                  {point.name.toUpperCase()}
                </text>
              </g>
            );
          })}

        {layersEnabled.military &&
          MILITARY_BASES.map((base) => {
            const x = lonToX(base.lon);
            const y = latToY(base.lat);
            const isNaval = base.type.startsWith('NAVAL');
            const isLand = base.type.startsWith('LAND');
            const isIntel = base.type.startsWith('INTEL');
            const color = isNaval ? '#00D4FF' : isLand ? '#39FF88' : isIntel ? '#FFB800' : '#4A9EFF';
            const tooltip = `[${base.country}] ${base.name} — ${base.type}`;
            return (
              <g key={base.name} style={{ cursor: 'pointer' }}>
                {isNaval ? (
                  <polygon
                    points={`${x},${y - 4} ${x + 3.5},${y + 2.5} ${x - 3.5},${y + 2.5}`}
                    fill={`${color}25`}
                    stroke={color}
                    strokeWidth="0.7"
                    opacity="0.85"
                    filter="url(#glow)"
                    onMouseEnter={(e) => handleMarkerHover(e, tooltip)}
                    onMouseLeave={hideTooltip}
                  />
                ) : isLand ? (
                  <circle
                    cx={x}
                    cy={y}
                    r="2.8"
                    fill={`${color}25`}
                    stroke={color}
                    strokeWidth="0.7"
                    opacity="0.85"
                    filter="url(#glow)"
                    onMouseEnter={(e) => handleMarkerHover(e, tooltip)}
                    onMouseLeave={hideTooltip}
                  />
                ) : (
                  <rect
                    x={x - 2.8}
                    y={y - 2.8}
                    width="5.6"
                    height="5.6"
                    fill={`${color}25`}
                    stroke={color}
                    strokeWidth="0.7"
                    opacity="0.85"
                    filter="url(#glow)"
                    onMouseEnter={(e) => handleMarkerHover(e, tooltip)}
                    onMouseLeave={hideTooltip}
                  />
                )}
              </g>
            );
          })}

        {layersEnabled.nuclear &&
          NUCLEAR_SITES.map((site) => {
            const x = lonToX(site.lon);
            const y = latToY(site.lat);
            const color = site.status === 'STRUCK' ? '#FF2255' : site.status === 'OCCUPIED' ? '#FF6B00' : site.status === 'UNDECLARED' ? '#FFB800' : site.status === 'SUSPECTED' ? '#FFB800' : '#39FF88';
            return (
              <g key={site.name} style={{ cursor: 'pointer' }}>
                <polygon
                  points={`${x},${y - 4} ${x - 3.5},${y + 2.5} ${x + 3.5},${y + 2.5}`}
                  fill={`${color}30`}
                  stroke={color}
                  strokeWidth="0.8"
                  opacity="0.9"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `[${site.status}] ${site.name} — ${site.type}`)}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })}

        {layersEnabled.earthquakes &&
          earthquakes.map((eq) => {
            const x = lonToX(eq.longitude);
            const y = latToY(eq.latitude);
            const radius = Math.max(2, eq.magnitude * 1.5);
            const isNew = newEventIds.has(eq.id);
            return (
              <g key={eq.id} style={{ cursor: 'pointer' }} onClick={() => handleMarkerClick(eq.id, 'earthquake')}>
                {isNew && (
                  <circle
                    cx={x} cy={y} r={radius + 4}
                    fill="none" stroke="#4D9FFF" strokeWidth="1.2"
                    opacity="0.7"
                    style={{ animation: 'mapPulse 1.2s ease-out infinite' }}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={`rgba(77, 159, 255, ${0.3 + eq.magnitude / 20})`}
                  stroke={isNew ? '#FFFFFF' : '#4D9FFF'}
                  strokeWidth={isNew ? 1.2 : 0.8}
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `M${eq.magnitude.toFixed(1)} - ${eq.location}`)}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })}

        {layersEnabled.disasters &&
          disasters.slice(0, 40).map((disaster) => {
            if (!disaster.id) return null;
            let plotLat: number;
            let plotLon: number;
            if (disaster.latitude != null && disaster.longitude != null) {
              plotLat = disaster.latitude;
              plotLon = disaster.longitude;
            } else {
              // No real coordinates — skip instead of generating fake positions
              return null;
            }
            const x = lonToX(plotLon);
            const y = latToY(plotLat);
            const isNew = newEventIds.has(disaster.id);
            return (
              <g key={disaster.id} style={{ cursor: 'pointer' }} onClick={() => handleMarkerClick(disaster.id, 'disaster')}>
                {isNew && (
                  <circle cx={x} cy={y} r="7" fill="none" stroke="#FF6B00" strokeWidth="1.2" opacity="0.7"
                    style={{ animation: 'mapPulse 1.2s ease-out infinite' }} />
                )}
                <circle
                  cx={x} cy={y} r="3"
                  fill="rgba(255, 107, 0, 0.6)"
                  stroke={isNew ? '#FFFFFF' : '#FF6B00'}
                  strokeWidth={isNew ? 1.2 : 0.7}
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, disaster.title)}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })}

        {layersEnabled.volcanoes &&
          volcanoes.map((v) => {
            if (!v.latitude || !v.longitude) return null;
            const x = lonToX(v.longitude);
            const y = latToY(v.latitude);
            const color = v.status === 'erupting' ? '#FF4500' : '#FF8C00';
            const size = v.status === 'erupting' ? 5 : 3.5;
            return (
              <g key={v.id} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r={size + 3} fill={color} opacity="0.12" />
                <polygon
                  points={`${x},${y - size} ${x - size * 0.8},${y + size * 0.6} ${x + size * 0.8},${y + size * 0.6}`}
                  fill={`${color}50`}
                  stroke={color}
                  strokeWidth="0.9"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `[${v.status?.toUpperCase()}] ${v.name} — ${v.country || ''} • ${v.alert_level || ''}`)}
                  onMouseLeave={hideTooltip}
                  onClick={() => handleMarkerClick(v.id, 'volcano')}
                />
                <text x={x + size + 1} y={y + 1.5} fill={color} fontSize="3" fontFamily="Share Tech Mono" opacity="0.9" pointerEvents="none">
                  {v.name.toUpperCase().slice(0, 12)}
                </text>
              </g>
            );
          })}

        {layersEnabled.geopolitical &&
          geopolitical.filter((g) => g.category !== 'curfew').map((g) => {
            if (!g.latitude || !g.longitude) return null;
            const x = lonToX(g.longitude);
            const y = latToY(g.latitude);
            const color = g.severity === 'critical' ? '#FF2255' : g.severity === 'high' ? '#FF6B00' : '#FFB800';
            return (
              <g key={g.id} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r="8" fill={color} opacity="0.06" />
                <circle cx={x} cy={y} r="4" fill={color} opacity="0.1" />
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={color}
                  opacity="0.9"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `[${g.category?.toUpperCase()}] ${g.title} — ${g.country || ''}`)}
                  onMouseLeave={hideTooltip}
                  onClick={() => handleMarkerClick(g.id, 'geopolitical')}
                />
                <text x={x + 4} y={y + 1.5} fill={color} fontSize="3" fontFamily="Share Tech Mono" opacity="0.85" pointerEvents="none">
                  {g.title.toUpperCase().slice(0, 16)}
                </text>
              </g>
            );
          })}

        {layersEnabled.news && news
          .filter(n => n.latitude != null && n.longitude != null)
          .slice(0, 40)
          .map(n => {
            const cx = lonToX(n.longitude!);
            const cy = latToY(n.latitude!);
            const isNew = newEventIds.has(n.id);
            return (
              <g key={n.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onEventSelect(n.id, 'news')}
                onMouseEnter={e => showTooltip(e.clientX, e.clientY, n.title?.slice(0, 80) || 'News')}
                onMouseLeave={hideTooltip}
              >
                {isNew && <circle cx={cx} cy={cy} r={8} fill="none" stroke="#4D9FFF" strokeWidth={1} opacity={0.5} className="pulse-ring" />}
                <circle cx={cx} cy={cy} r={3} fill="#4D9FFF" opacity={0.75} />
              </g>
            );
          })
        }

        {layersEnabled.curfews &&
          geopolitical.filter((g) => g.category === 'curfew').map((g) => {
            if (!g.latitude || !g.longitude) return null;
            const x = lonToX(g.longitude);
            const y = latToY(g.latitude);
            return (
              <g key={g.id} style={{ cursor: 'pointer' }}>
                <circle cx={x} cy={y} r="10" fill="#CC3300" opacity="0.08" />
                <circle cx={x} cy={y} r="6" fill="none" stroke="#CC3300" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.6" />
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#CC3300"
                  opacity="0.9"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `[CURFEW] ${g.title} — ${g.country || ''}`)}
                  onMouseLeave={hideTooltip}
                  onClick={() => handleMarkerClick(g.id, 'curfew')}
                />
                <line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} stroke="#CC3300" strokeWidth="0.8" opacity="0.8" pointerEvents="none" />
                <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} stroke="#CC3300" strokeWidth="0.8" opacity="0.8" pointerEvents="none" />
              </g>
            );
          })}

      </svg>
    </div>
  );
}
