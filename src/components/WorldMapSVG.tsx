import { useEffect, useRef, useState, useMemo } from 'react';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES } from '../lib/cable-data';
import { LINE_OF_CONTROL, LINE_OF_ACTUAL_CONTROL, INDIA_DISCLAIMER } from '../lib/india-boundary';

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
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
  activeRegion?: string;
  onResetView?: () => void;
  newEventIds?: Set<string>;
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
  vessels,
  volcanoes,
  geopolitical,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
  activeRegion = 'globe',
  onResetView,
  newEventIds = new Set(),
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
    { name: 'Strait of Hormuz', lat: 26.5, lon: 56.5, type: 'energy', desc: '20% of world oil supply' },
    { name: 'Suez Canal', lat: 30.5, lon: 32.5, type: 'trade', desc: '~15% of global trade' },
    { name: 'Malacca Strait', lat: 1.3, lon: 103.8, type: 'trade', desc: '25% of global trade' },
    { name: 'Bab el-Mandeb', lat: 12.6, lon: 43.3, type: 'energy', desc: 'Red Sea access — Houthi attacks disrupted shipping since Nov 2023' },
    { name: 'Panama Canal', lat: 9.1, lon: -79.9, type: 'trade', desc: 'Connects Atlantic-Pacific' },
    { name: 'Turkish Straits', lat: 41.1, lon: 29.1, type: 'trade', desc: 'Black Sea gateway' },
    { name: 'Strait of Gibraltar', lat: 36.0, lon: -5.4, type: 'trade', desc: 'Mediterranean gateway' },
    { name: 'Danish Straits', lat: 56.0, lon: 12.0, type: 'energy', desc: 'Baltic Sea access' },
    { name: 'Lombok Strait', lat: -8.8, lon: 115.7, type: 'trade', desc: 'Pacific-Indian alt route' },
    { name: 'Cape of Good Hope', lat: -34.4, lon: 18.5, type: 'trade', desc: 'Africa bypass route' },
    { name: 'Strait of Taiwan', lat: 24.5, lon: 120.5, type: 'strategic', desc: 'China-Pacific flashpoint' },
    { name: 'Hormuz-India Route', lat: 19.0, lon: 65.0, type: 'energy', desc: 'India energy supply line' },
  ];

  const militaryBases = [
    { name: 'Pentagon / Andrews AFB', lat: 38.87, lon: -77.06, country: 'US', type: 'USAF/Army CMD HQ' },
    { name: 'Ramstein AB', lat: 49.44, lon: 7.60, country: 'DE', type: 'USAF Europe HQ' },
    { name: 'Camp Humphreys', lat: 36.96, lon: 126.97, country: 'KR', type: 'US Army Korea' },
    { name: 'Kadena AB', lat: 26.36, lon: 127.77, country: 'JP', type: 'USAF Pacific Hub' },
    { name: 'Diego Garcia', lat: -7.31, lon: 72.41, country: 'IO', type: 'US-UK Joint Base' },
    { name: 'Al Udeid AB', lat: 25.12, lon: 51.31, country: 'QA', type: 'USCENTCOM Forward' },
    { name: 'Ali Al Salem AB', lat: 29.34, lon: 47.52, country: 'KW', type: 'USAF Kuwait' },
    { name: 'Guantanamo Bay NAS', lat: 19.90, lon: -75.13, country: 'CU', type: 'US Naval Station' },
    { name: 'Yokosuka Naval Base', lat: 35.29, lon: 139.67, country: 'JP', type: 'US 7th Fleet HQ' },
    { name: 'Andersen AFB — Guam', lat: 13.58, lon: 144.93, country: 'GU', type: 'USAF Pacific Strike' },
    { name: 'RAAF Tindal', lat: -14.52, lon: 132.38, country: 'AU', type: 'Australia RAAF' },
    { name: 'Pine Gap', lat: -23.80, lon: 133.74, country: 'AU', type: 'US-AU SIGINT' },
    { name: 'Futenma/Henoko, Okinawa', lat: 26.28, lon: 127.75, country: 'JP', type: 'USMC Pacific' },
    { name: 'Camp Lemonnier', lat: 11.55, lon: 43.16, country: 'DJ', type: 'US AFRICOM FWD' },
    { name: 'Manda Bay, Kenya', lat: -2.26, lon: 41.20, country: 'KE', type: 'US Africa Ops' },
    { name: 'Severomorsk Naval Base', lat: 69.07, lon: 33.42, country: 'RU', type: 'Russia Northern Fleet' },
    { name: 'Hmeimim AB, Syria', lat: 35.40, lon: 35.95, country: 'SY', type: 'Russia Syria Ops' },
    { name: 'Tartus Naval Facility', lat: 34.89, lon: 35.87, country: 'SY', type: 'Russia Naval Med' },
    { name: 'Engels-2 AB', lat: 51.14, lon: 46.17, country: 'RU', type: 'Russia Strategic Bombers' },
    { name: 'Sanya Naval Base', lat: 18.22, lon: 109.51, country: 'CN', type: 'PLAN South Sea' },
    { name: 'PLA Djibouti Base', lat: 11.56, lon: 43.14, country: 'DJ', type: 'China Overseas Base' },
    { name: 'Yulin Naval Base', lat: 18.22, lon: 109.75, country: 'CN', type: 'PLAN SSBN Base' },
    { name: 'INS Kadamba, Karwar', lat: 14.82, lon: 74.14, country: 'IN', type: 'India Navy West CMD' },
    { name: 'Andaman CMD, Port Blair', lat: 11.62, lon: 92.72, country: 'IN', type: 'India Andaman CMD' },
    { name: 'RAF Akrotiri, Cyprus', lat: 34.59, lon: 32.99, country: 'CY', type: 'UK RAF East Med' },
    { name: 'SHAPE — Mons', lat: 50.45, lon: 3.84, country: 'BE', type: 'NATO Supreme HQ' },
    { name: 'Mihail Kogalniceanu AB', lat: 44.36, lon: 28.49, country: 'RO', type: 'NATO Eastern Flank' },
    { name: 'Ain Al-Asad AB, Iraq', lat: 33.79, lon: 42.44, country: 'IQ', type: 'Coalition Iraq FWD' },
    { name: 'Incirlik AB, Turkey', lat: 37.00, lon: 35.43, country: 'TR', type: 'NATO Turkey Hub' },
    { name: 'Kings Bay SSBN Base', lat: 30.80, lon: -81.55, country: 'US', type: 'US Trident SSBN East' },
  ];

  const nuclearSites = [
    { name: 'Zaporizhzhia NPP', lat: 47.51, lon: 34.59, country: 'UA', type: 'NPP — Warzone Risk', status: 'OCCUPIED' },
    { name: 'Bushehr NPP', lat: 28.83, lon: 50.91, country: 'IR', type: 'NPP — Iran', status: 'ACTIVE' },
    { name: 'Kudankulam NPP', lat: 8.17, lon: 77.71, country: 'IN', type: 'NPP Tamil Nadu', status: 'ACTIVE' },
    { name: 'Tarapur BARC', lat: 19.83, lon: 72.72, country: 'IN', type: 'BARC Research Reactor', status: 'ACTIVE' },
    { name: 'Yongbyon Complex', lat: 39.79, lon: 125.75, country: 'KP', type: 'DPRK Weapons Program', status: 'ACTIVE' },
    { name: 'Dimona Nuclear Centre', lat: 30.97, lon: 35.15, country: 'IL', type: 'Israel Weapons (est)', status: 'UNDECLARED' },
    { name: 'Natanz Enrichment', lat: 33.72, lon: 51.73, country: 'IR', type: 'Iran Enrichment', status: 'STRUCK' },
    { name: 'Fordow (Qom) Enrichment', lat: 34.88, lon: 49.14, country: 'IR', type: 'Iran Underground', status: 'STRUCK' },
    { name: 'Kola NPP', lat: 67.46, lon: 32.50, country: 'RU', type: 'Russia Arctic NPP', status: 'ACTIVE' },
    { name: 'Leningrad NPP', lat: 59.87, lon: 29.08, country: 'RU', type: 'Russia NPP', status: 'ACTIVE' },
    { name: 'Tianwan NPP', lat: 34.69, lon: 119.46, country: 'CN', type: 'China NPP (RU-built)', status: 'ACTIVE' },
    { name: 'Changjiang NPP, Hainan', lat: 19.49, lon: 108.73, country: 'CN', type: 'China NPP', status: 'ACTIVE' },
    { name: 'Bangor SSBN Base', lat: 47.73, lon: -122.70, country: 'US', type: 'US Trident SSBN Pacific', status: 'ACTIVE' },
    { name: 'Kings Bay SSBN Base', lat: 30.80, lon: -81.55, country: 'US', type: 'US Trident SSBN Atlantic', status: 'ACTIVE' },
    { name: 'Faslane SSBN Base', lat: 56.07, lon: -4.77, country: 'GB', type: 'UK Trident SSBN', status: 'ACTIVE' },
    { name: 'Île Longue SSBN Base', lat: 48.35, lon: -4.56, country: 'FR', type: 'France SSBN Base', status: 'ACTIVE' },
    { name: 'Gadzhiyevo SSBN Base', lat: 69.25, lon: 33.52, country: 'RU', type: 'Russia SSBN Northern', status: 'ACTIVE' },
    { name: 'Rybachiy SSBN Base', lat: 52.99, lon: 158.68, country: 'RU', type: 'Russia Pacific SSBN', status: 'ACTIVE' },
    { name: 'Yulin SSBN Base', lat: 18.22, lon: 109.75, country: 'CN', type: 'China SSBN Base', status: 'ACTIVE' },
    { name: 'Sellafield Complex', lat: 54.42, lon: -3.50, country: 'GB', type: 'UK Reprocessing', status: 'ACTIVE' },
    { name: 'La Hague Reprocessing', lat: 49.68, lon: -1.88, country: 'FR', type: 'France Reprocessing', status: 'ACTIVE' },
    { name: 'Kalpakkam PFBR', lat: 12.55, lon: 80.17, country: 'IN', type: 'India Fast Breeder', status: 'COMMISSIONING' },
    { name: 'Chashma NPP', lat: 32.39, lon: 71.46, country: 'PK', type: 'Pakistan NPP', status: 'ACTIVE' },
    { name: 'Khushab Plutonium', lat: 32.06, lon: 72.20, country: 'PK', type: 'Pakistan Weapons Fac', status: 'ACTIVE' },
    { name: 'Parchin Military Complex', lat: 35.52, lon: 51.77, country: 'IR', type: 'Iran Weapons (suspected)', status: 'SUSPECTED' },
    { name: 'Ulchin NPP', lat: 37.09, lon: 129.38, country: 'KR', type: 'South Korea NPP', status: 'ACTIVE' },
    { name: 'Cernavoda NPP', lat: 44.32, lon: 28.06, country: 'RO', type: 'Romania NPP', status: 'ACTIVE' },
    { name: 'Mongu / Karachi KANUPP', lat: 24.85, lon: 67.10, country: 'PK', type: 'Pakistan KANUPP', status: 'ACTIVE' },
  ];

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
          gap: '4px',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Zoom In"
          style={{
            width: '30px',
            height: '30px',
            background: 'rgba(4, 16, 30, 0.92)',
            border: '1px solid rgba(0, 212, 160, 0.35)',
            color: '#00d4a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontFamily: 'Share Tech Mono, monospace',
            lineHeight: 1,
            borderRadius: '3px',
            transition: 'background 0.15s, border-color 0.15s',
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
          title="Zoom Out"
          style={{
            width: '30px',
            height: '30px',
            background: 'rgba(4, 16, 30, 0.92)',
            border: '1px solid rgba(0, 212, 160, 0.35)',
            color: '#00d4a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontFamily: 'Share Tech Mono, monospace',
            lineHeight: 1,
            borderRadius: '3px',
            transition: 'background 0.15s, border-color 0.15s',
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
          title="Reset to Globe View"
          style={{
            width: '30px',
            height: '30px',
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
            borderRadius: '3px',
            letterSpacing: '0.02em',
            transition: 'background 0.15s, border-color 0.15s',
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
          <path
            d={
              'M' +
              LINE_OF_CONTROL.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join('L')
            }
            fill="none"
            stroke="#6fa8dc"
            strokeWidth="0.6"
            strokeDasharray="2,1.4"
            opacity="0.75"
            pointerEvents="none"
          />
          <path
            d={
              'M' +
              LINE_OF_ACTUAL_CONTROL.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join('L')
            }
            fill="none"
            stroke="#a4c2f4"
            strokeWidth="0.6"
            strokeDasharray="2,1.4"
            opacity="0.75"
            pointerEvents="none"
          />
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
          militaryBases.map((base) => {
            const x = lonToX(base.lon);
            const y = latToY(base.lat);
            return (
              <g key={base.name} style={{ cursor: 'pointer' }}>
                <rect
                  x={x - 3}
                  y={y - 3}
                  width="6"
                  height="6"
                  fill="#4A9EFF"
                  opacity="0.8"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `[${base.country}] ${base.name} — ${base.type}`)}
                  onMouseLeave={hideTooltip}
                />
              </g>
            );
          })}

        {layersEnabled.nuclear &&
          nuclearSites.map((site) => {
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
          disasters.slice(0, 30).map((disaster) => {
            const hash = disaster.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const stableLat = ((hash * 9301 + 49297) % 139) - 69;
            const stableLon = ((hash * 49297 + 233) % 299) - 149;
            const x = lonToX(stableLon);
            const y = latToY(stableLat);
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

        {layersEnabled.vessels &&
          vessels.map((v) => {
            if (!v.latitude || !v.longitude) return null;
            const x = lonToX(v.longitude);
            const y = latToY(v.latitude);
            const color = v.type === 'Military' ? '#FF2255' : v.type === 'Tanker' ? '#FFB800' : '#00BFFF';
            const courseRad = ((v.course || 0) * Math.PI) / 180;
            const tipX = x + Math.sin(courseRad) * 4;
            const tipY = y - Math.cos(courseRad) * 4;
            const leftX = x + Math.sin(courseRad - 2.2) * 2.5;
            const leftY = y - Math.cos(courseRad - 2.2) * 2.5;
            const rightX = x + Math.sin(courseRad + 2.2) * 2.5;
            const rightY = y - Math.cos(courseRad + 2.2) * 2.5;
            return (
              <g key={v.id} style={{ cursor: 'pointer' }}>
                <polygon
                  points={`${tipX},${tipY} ${leftX},${leftY} ${x},${y + 1} ${rightX},${rightY}`}
                  fill={color}
                  opacity="0.85"
                  filter="url(#glow)"
                  onMouseEnter={(e) => handleMarkerHover(e, `${v.name} [${v.type}] ${v.flag || ''} • ${v.speed?.toFixed(1) || '?'}kn → ${v.destination || '?'}`)}
                  onMouseLeave={hideTooltip}
                  onClick={() => handleMarkerClick(v.id, 'vessel')}
                />
              </g>
            );
          })}
      </svg>
    </div>
  );
}
