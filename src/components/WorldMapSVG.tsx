import { useEffect, useRef, useState, useMemo } from 'react';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES } from '../lib/cable-data';
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
    // ── US AIR BASES ──────────────────────────────────────────────────────────
    { name: 'Andrews AFB (Joint Base)', lat: 38.81, lon: -76.87, country: 'US', type: 'AIR — USAF Presidential/CMD' },
    { name: 'Langley AFB', lat: 37.08, lon: -76.36, country: 'US', type: 'AIR — USAF ACC HQ' },
    { name: 'Nellis AFB', lat: 36.24, lon: -115.03, country: 'US', type: 'AIR — USAF Warfare Center' },
    { name: 'Edwards AFB', lat: 34.91, lon: -117.88, country: 'US', type: 'AIR — USAF Test Wing' },
    { name: 'Barksdale AFB', lat: 32.50, lon: -93.66, country: 'US', type: 'AIR — USAF Global Strike CMD' },
    { name: 'Minot AFB', lat: 48.41, lon: -101.35, country: 'US', type: 'AIR — USAF ICBM/Bomber' },
    { name: 'F.E. Warren AFB', lat: 41.12, lon: -104.86, country: 'US', type: 'AIR — USAF ICBM Wing' },
    { name: 'Malmstrom AFB', lat: 47.51, lon: -111.19, country: 'US', type: 'AIR — USAF ICBM Wing' },
    { name: 'Whiteman AFB', lat: 38.72, lon: -93.55, country: 'US', type: 'AIR — USAF B-2 Spirit Wing' },
    { name: 'Dyess AFB', lat: 32.42, lon: -99.85, country: 'US', type: 'AIR — USAF B-1 Lancer Wing' },
    { name: 'Ellsworth AFB', lat: 44.15, lon: -103.10, country: 'US', type: 'AIR — USAF B-1 Wing' },
    { name: 'Moody AFB', lat: 30.97, lon: -83.19, country: 'US', type: 'AIR — USAF A-10/F-16 Wing' },
    { name: 'Shaw AFB', lat: 33.97, lon: -80.47, country: 'US', type: 'AIR — USAF F-16 Strike Wing' },
    { name: 'Seymour Johnson AFB', lat: 35.34, lon: -77.96, country: 'US', type: 'AIR — USAF F-15E Wing' },
    { name: 'Mountain Home AFB', lat: 43.04, lon: -115.87, country: 'US', type: 'AIR — USAF F-15E Wing' },
    { name: 'Eielson AFB', lat: 64.66, lon: -147.10, country: 'US', type: 'AIR — USAF Arctic F-35A' },
    { name: 'Elmendorf-Richardson', lat: 61.25, lon: -149.80, country: 'US', type: 'AIR — USAF/Army Alaska' },
    { name: 'Hickam AFB (Joint Base Pearl)', lat: 21.34, lon: -157.94, country: 'US', type: 'AIR — USAF PACAF HQ' },
    { name: 'Andersen AFB — Guam', lat: 13.58, lon: 144.93, country: 'GU', type: 'AIR — USAF Pacific Strike' },
    { name: 'Ramstein AB', lat: 49.44, lon: 7.60, country: 'DE', type: 'AIR — USAF Europe HQ' },
    { name: 'Spangdahlem AB', lat: 50.13, lon: 6.69, country: 'DE', type: 'AIR — USAF F-16 Europe' },
    { name: 'Lakenheath RAF', lat: 52.41, lon: 0.56, country: 'GB', type: 'AIR — USAF F-35A Europe' },
    { name: 'Mildenhall RAF', lat: 52.36, lon: 0.49, country: 'GB', type: 'AIR — USAF Tanker/ISR' },
    { name: 'Aviano AB', lat: 46.03, lon: 12.60, country: 'IT', type: 'AIR — USAF F-16 South Europe' },
    { name: 'Incirlik AB', lat: 37.00, lon: 35.43, country: 'TR', type: 'AIR — NATO Turkey/B61 Nuclear' },
    { name: 'Al Udeid AB', lat: 25.12, lon: 51.31, country: 'QA', type: 'AIR — USCENTCOM FWD / B-52' },
    { name: 'Ali Al Salem AB', lat: 29.34, lon: 47.52, country: 'KW', type: 'AIR — USAF Kuwait' },
    { name: 'Al Dhafra AB', lat: 24.25, lon: 54.55, country: 'AE', type: 'AIR — USAF UAE / F-35A' },
    { name: 'Prince Sultan AB', lat: 24.06, lon: 47.58, country: 'SA', type: 'AIR — USAF Saudi Arabia' },
    { name: 'Kadena AB', lat: 26.36, lon: 127.77, country: 'JP', type: 'AIR — USAF Pacific Hub' },
    { name: 'Misawa AB', lat: 40.70, lon: 141.37, country: 'JP', type: 'AIR — USAF/JASDF ISR' },
    { name: 'Osan AB', lat: 37.09, lon: 127.03, country: 'KR', type: 'AIR — USAF Korea' },
    { name: 'Kunsan AB', lat: 35.90, lon: 126.62, country: 'KR', type: 'AIR — USAF F-16 Korea' },
    // ── US NAVAL BASES ────────────────────────────────────────────────────────
    { name: 'Norfolk Naval Station', lat: 36.94, lon: -76.30, country: 'US', type: 'NAVAL — US Atlantic Fleet HQ' },
    { name: 'Pearl Harbor (Joint Base)', lat: 21.37, lon: -157.97, country: 'US', type: 'NAVAL — US Pacific Fleet' },
    { name: 'Yokosuka Naval Base', lat: 35.29, lon: 139.67, country: 'JP', type: 'NAVAL — US 7th Fleet HQ' },
    { name: 'Sasebo Naval Base', lat: 33.16, lon: 129.72, country: 'JP', type: 'NAVAL — US Amphibious' },
    { name: 'San Diego Naval Base', lat: 32.68, lon: -117.13, country: 'US', type: 'NAVAL — US Pacific Surface' },
    { name: 'Bremerton / Puget Sound NS', lat: 47.56, lon: -122.63, country: 'US', type: 'NAVAL — US Pacific Carrier' },
    { name: 'Mayport Naval Station', lat: 30.39, lon: -81.42, country: 'US', type: 'NAVAL — US Atlantic Carrier' },
    { name: 'Kings Bay SSBN Base', lat: 30.80, lon: -81.55, country: 'US', type: 'NAVAL — US Trident SSBN East' },
    { name: 'Bangor SSBN Base', lat: 47.73, lon: -122.70, country: 'US', type: 'NAVAL — US Trident SSBN Pacific' },
    { name: 'Guantanamo Bay NAS', lat: 19.90, lon: -75.13, country: 'US', type: 'NAVAL — US Cuba Station' },
    { name: 'Diego Garcia', lat: -7.31, lon: 72.41, country: 'IO', type: 'NAVAL — US-UK Indian Ocean' },
    { name: 'NSA Bahrain (5th Fleet)', lat: 26.21, lon: 50.61, country: 'BH', type: 'NAVAL — US 5th Fleet HQ' },
    { name: 'Camp Lemonnier / Chabelley', lat: 11.55, lon: 43.16, country: 'DJ', type: 'NAVAL/AIR — US AFRICOM FWD' },
    { name: 'Manda Bay NAS, Kenya', lat: -2.26, lon: 41.20, country: 'KE', type: 'NAVAL/AIR — US Africa Ops' },
    { name: 'Rota Naval Station', lat: 36.64, lon: -6.35, country: 'ES', type: 'NAVAL — US Spain (Destroyer Sq)' },
    { name: 'Sigonella NAS', lat: 37.41, lon: 14.92, country: 'IT', type: 'NAVAL/AIR — US Med Hub' },
    { name: 'Naples Support Site', lat: 40.72, lon: 14.19, country: 'IT', type: 'NAVAL — US 6th Fleet HQ' },
    { name: 'Souda Bay', lat: 35.53, lon: 24.07, country: 'GR', type: 'NAVAL — US/NATO Crete' },
    // ── US ARMY / LAND BASES ──────────────────────────────────────────────────
    { name: 'Pentagon / Fort Myer', lat: 38.87, lon: -77.06, country: 'US', type: 'LAND — DoD/Army CMD HQ' },
    { name: 'Fort Liberty (Bragg)', lat: 35.14, lon: -79.01, country: 'US', type: 'LAND — US Army XVIII Airborne' },
    { name: 'Fort Campbell', lat: 36.67, lon: -87.47, country: 'US', type: 'LAND — US Army 101st Airborne' },
    { name: 'Fort Hood (Cavazos)', lat: 31.14, lon: -97.78, country: 'US', type: 'LAND — US Army III Corps' },
    { name: 'Fort Benning (Moore)', lat: 32.35, lon: -84.99, country: 'US', type: 'LAND — US Army Infantry/Rangers' },
    { name: 'Fort Wainwright', lat: 64.83, lon: -147.62, country: 'US', type: 'LAND — US Army Alaska' },
    { name: 'Camp Humphreys', lat: 36.96, lon: 126.97, country: 'KR', type: 'LAND — US Army Korea CMD' },
    { name: 'Camp Casey, Korea', lat: 37.90, lon: 127.07, country: 'KR', type: 'LAND — US Army DMZ' },
    { name: 'Grafenwoehr Training Area', lat: 49.70, lon: 11.91, country: 'DE', type: 'LAND — US Army Europe Training' },
    { name: 'Wiesbaden Army Airfield', lat: 50.05, lon: 8.33, country: 'DE', type: 'LAND — USAREUR-AF HQ' },
    { name: 'Vicenza (Ederle/Del Din)', lat: 45.52, lon: 11.56, country: 'IT', type: 'LAND — US Army Italy/173rd ABN' },
    { name: 'Camp Bondsteel, Kosovo', lat: 42.36, lon: 21.40, country: 'XK', type: 'LAND — US Army Kosovo' },
    // ── NATO / ALLIED AIR BASES ────────────────────────────────────────────────
    { name: 'SHAPE — Mons', lat: 50.45, lon: 3.84, country: 'BE', type: 'AIR/LAND — NATO Supreme HQ' },
    { name: 'Mihail Kogalniceanu AB', lat: 44.36, lon: 28.49, country: 'RO', type: 'AIR — NATO Eastern Flank' },
    { name: 'Lask AB', lat: 51.55, lon: 19.18, country: 'PL', type: 'AIR — NATO Poland F-16' },
    { name: 'Malbork AB', lat: 54.02, lon: 19.13, country: 'PL', type: 'AIR — NATO Poland Air Defense' },
    { name: 'Lielvarde AB', lat: 56.67, lon: 24.99, country: 'LV', type: 'AIR — NATO Baltic Flank' },
    { name: 'Amari AB', lat: 59.26, lon: 24.20, country: 'EE', type: 'AIR — NATO Estonia' },
    { name: 'Siauliai AB', lat: 55.89, lon: 23.40, country: 'LT', type: 'AIR — NATO Baltic Air Policing' },
    { name: 'Geilenkirchen NATO AB', lat: 50.96, lon: 6.04, country: 'DE', type: 'AIR — NATO AWACS Base' },
    { name: 'Kleine Brogel AB', lat: 51.17, lon: 5.47, country: 'BE', type: 'AIR — NATO Belgium / B61 Nuclear' },
    { name: 'Volkel AB', lat: 51.66, lon: 5.71, country: 'NL', type: 'AIR — NATO Netherlands / B61 Nuclear' },
    { name: 'Ghedi AB', lat: 45.43, lon: 10.27, country: 'IT', type: 'AIR — NATO Italy / B61 Nuclear' },
    { name: 'Büchel AB', lat: 50.17, lon: 7.06, country: 'DE', type: 'AIR — NATO Germany / B61 Nuclear' },
    { name: 'RAF Akrotiri', lat: 34.59, lon: 32.99, country: 'CY', type: 'AIR — UK RAF East Med' },
    { name: 'RAF Brize Norton', lat: 51.76, lon: -1.58, country: 'GB', type: 'AIR — UK Strategic Airlift' },
    { name: 'RAF Marham', lat: 52.65, lon: 0.55, country: 'GB', type: 'AIR — UK F-35B Wing' },
    { name: 'RAF Coningsby', lat: 53.09, lon: -0.17, country: 'GB', type: 'AIR — UK Typhoon FGR4' },
    { name: 'RAF Lossiemouth', lat: 57.71, lon: -3.34, country: 'GB', type: 'AIR — UK Typhoon/P-8 Maritime' },
    { name: 'Istres AB', lat: 43.52, lon: 4.92, country: 'FR', type: 'AIR — France Nuclear Strike (ASMP-A)' },
    { name: 'Mont-de-Marsan AB', lat: 43.91, lon: -0.50, country: 'FR', type: 'AIR — France Rafale Test/OCU' },
    { name: 'Orange-Caritat AB', lat: 44.14, lon: 4.87, country: 'FR', type: 'AIR — France Rafale Strike' },
    { name: 'Évreux-Fauville AB', lat: 49.03, lon: 1.22, country: 'FR', type: 'AIR — France Transport/SOF' },
    { name: 'Dassault/Cazaux AB', lat: 44.53, lon: -1.13, country: 'FR', type: 'AIR — France Test Wing' },
    { name: 'Cologne/Bonn AB (LTG)', lat: 50.87, lon: 7.14, country: 'DE', type: 'AIR — Germany Airlift CMD' },
    { name: 'Rostock-Laage AB', lat: 53.92, lon: 12.28, country: 'DE', type: 'AIR — Germany Typhoon EF2000' },
    { name: 'Neuburg AB', lat: 48.71, lon: 11.21, country: 'DE', type: 'AIR — Germany Eurofighter Wing' },
    { name: 'Norvenich AB', lat: 50.83, lon: 6.66, country: 'DE', type: 'AIR — Germany Tornado Strike' },
    { name: 'Decimomannu AB', lat: 39.35, lon: 8.97, country: 'IT', type: 'AIR — NATO Multi-nation Training' },
    { name: 'Trapani-Birgi AB', lat: 37.91, lon: 12.50, country: 'IT', type: 'AIR — Italy Eurofighter' },
    { name: 'Grosseto AB', lat: 42.76, lon: 11.07, country: 'IT', type: 'AIR — Italy Eurofighter' },
    { name: 'Cervia AB', lat: 44.22, lon: 12.31, country: 'IT', type: 'AIR — Italy Strike' },
    { name: 'Araxos AB', lat: 38.15, lon: 21.42, country: 'GR', type: 'AIR — Greece F-16 Block 52+' },
    { name: 'Tanagra AB', lat: 38.34, lon: 23.56, country: 'GR', type: 'AIR — Greece F-16 / Rafale' },
    { name: 'Larissa AB', lat: 39.65, lon: 22.41, country: 'GR', type: 'AIR — Greece F-16' },
    { name: 'Andravida AB', lat: 37.92, lon: 21.29, country: 'GR', type: 'AIR — Greece F-16 Wing' },
    { name: 'Konya AB', lat: 37.98, lon: 32.56, country: 'TR', type: 'AIR — Turkey F-16 Wing' },
    { name: 'Eskisehir AB', lat: 39.78, lon: 30.58, country: 'TR', type: 'AIR — Turkey F-16 Wing' },
    { name: 'Bandirma AB', lat: 40.32, lon: 27.98, country: 'TR', type: 'AIR — Turkey F-16' },
    { name: 'Balikesir AB', lat: 39.62, lon: 27.93, country: 'TR', type: 'AIR — Turkey F-16' },
    { name: 'Diyarbakir AB', lat: 37.89, lon: 40.20, country: 'TR', type: 'AIR — Turkey F-16 SE' },
    { name: 'Erhac/Malatya AB', lat: 38.44, lon: 38.09, country: 'TR', type: 'AIR — Turkey F-16 East' },
    { name: 'Korvela / Karup AB', lat: 56.30, lon: 9.18, country: 'DK', type: 'AIR — Denmark F-35A' },
    { name: 'Skrydstrup AB', lat: 55.22, lon: 9.26, country: 'DK', type: 'AIR — Denmark F-35A Wing' },
    { name: 'Florennes AB', lat: 50.24, lon: 4.65, country: 'BE', type: 'AIR — Belgium F-35A Wing' },
    { name: 'Volkel AB', lat: 51.65, lon: 5.71, country: 'NL', type: 'AIR — Netherlands F-35A' },
    { name: 'Leeuwarden AB', lat: 53.23, lon: 5.76, country: 'NL', type: 'AIR — Netherlands F-35A' },
    { name: 'Orland AB', lat: 63.70, lon: 9.60, country: 'NO', type: 'AIR — Norway F-35A Wing' },
    { name: 'Evenes AB', lat: 68.49, lon: 16.68, country: 'NO', type: 'AIR — Norway F-35A Arctic' },
    { name: 'Lulea-Kallax AB', lat: 65.54, lon: 22.12, country: 'SE', type: 'AIR — Sweden Gripen Arctic' },
    { name: 'Söderhamn AB (F15)', lat: 61.26, lon: 17.10, country: 'SE', type: 'AIR — Sweden Gripen' },
    { name: 'Satenas AB', lat: 58.43, lon: 12.72, country: 'SE', type: 'AIR — Sweden Gripen' },
    { name: 'Rissala AB', lat: 63.66, lon: 27.83, country: 'FI', type: 'AIR — Finland F/A-18 / F-35A incoming' },
    { name: 'Tampere-Pirkkala AB', lat: 61.42, lon: 23.60, country: 'FI', type: 'AIR — Finland HN Wing' },
    { name: 'Kuopio-Rissala AB', lat: 63.01, lon: 27.80, country: 'FI', type: 'AIR — Finland Air CMD' },
    // ── NATO NAVAL ────────────────────────────────────────────────────────────
    { name: 'Faslane HMNB (Trident)', lat: 56.07, lon: -4.77, country: 'GB', type: 'NAVAL — UK Trident SSBN Base' },
    { name: 'Portsmouth HMNB', lat: 50.80, lon: -1.11, country: 'GB', type: 'NAVAL — UK Fleet HQ' },
    { name: 'Devonport HMNB', lat: 50.37, lon: -4.18, country: 'GB', type: 'NAVAL — UK Major Naval Base' },
    { name: 'Toulon Naval Base', lat: 43.11, lon: 5.93, country: 'FR', type: 'NAVAL — France Med Fleet / CVN' },
    { name: 'Île Longue SSBN Base', lat: 48.35, lon: -4.56, country: 'FR', type: 'NAVAL — France Trident SSBN' },
    { name: 'Brest Naval Base', lat: 48.39, lon: -4.49, country: 'FR', type: 'NAVAL — France Atlantic Fleet' },
    { name: 'Kiel Naval Base', lat: 54.33, lon: 10.15, country: 'DE', type: 'NAVAL — Germany Baltic Fleet' },
    { name: 'Wilhelmshaven Naval Base', lat: 53.54, lon: 8.15, country: 'DE', type: 'NAVAL — Germany North Sea Fleet' },
    { name: 'Taranto Naval Base', lat: 40.47, lon: 17.23, country: 'IT', type: 'NAVAL — Italy CVH/Destroyer' },
    { name: 'Augusta Naval Base', lat: 37.19, lon: 15.22, country: 'IT', type: 'NAVAL — Italy Med' },
    { name: 'Ferrol Naval Base', lat: 43.49, lon: -8.25, country: 'ES', type: 'NAVAL — Spain Atlantic Fleet' },
    { name: 'Cartegena Naval Base', lat: 37.60, lon: -0.98, country: 'ES', type: 'NAVAL — Spain Med Fleet' },
    { name: 'Lisbon Naval Base', lat: 38.70, lon: -9.16, country: 'PT', type: 'NAVAL — Portugal Atlantic' },
    { name: 'Lajes Field (Azores)', lat: 38.76, lon: -27.09, country: 'PT', type: 'NAVAL/AIR — US-PT Azores Hub' },
    { name: 'Piraeus / Salamis Naval Base', lat: 37.94, lon: 23.64, country: 'GR', type: 'NAVAL — Greece Hellenic Navy' },
    { name: 'Souda Bay NAS', lat: 35.53, lon: 24.07, country: 'GR', type: 'NAVAL — US/NATO Crete' },
    { name: 'Hakonby / Haakonsvern', lat: 60.36, lon: 5.22, country: 'NO', type: 'NAVAL — Norway Fleet HQ' },
    { name: 'Karlskrona Naval Base', lat: 56.16, lon: 15.59, country: 'SE', type: 'NAVAL — Sweden Baltic Fleet' },
    { name: 'Porkalla / Upinniemi', lat: 59.99, lon: 24.38, country: 'FI', type: 'NAVAL — Finland Navy' },
    // ── RUSSIA AIR BASES ──────────────────────────────────────────────────────
    { name: 'Kubinka AB', lat: 55.61, lon: 36.66, country: 'RU', type: 'AIR — Russia MiG-29/Su-27 Aerobatics' },
    { name: 'Lipetsk AB', lat: 52.70, lon: 39.53, country: 'RU', type: 'AIR — Russia Combat Training CMD' },
    { name: 'Savasleika AB', lat: 55.56, lon: 43.62, country: 'RU', type: 'AIR — Russia MiG-31' },
    { name: 'Maryanovka AB (Engels-2)', lat: 51.14, lon: 46.17, country: 'RU', type: 'AIR — Russia Tu-160/Tu-95 Bombers' },
    { name: 'Olenya AB (Kola)', lat: 68.15, lon: 33.46, country: 'RU', type: 'AIR — Russia Tu-22M3 Arctic' },
    { name: 'Tiksi AB', lat: 71.70, lon: 128.90, country: 'RU', type: 'AIR — Russia Arctic MiG-31' },
    { name: 'Vorkuta AB', lat: 67.49, lon: 64.00, country: 'RU', type: 'AIR — Russia Arctic Strike' },
    { name: 'Anadyr AB', lat: 64.73, lon: 177.74, country: 'RU', type: 'AIR — Russia Far East / Bomber FWD' },
    { name: 'Ukrainka AB (Ukrainsky)', lat: 51.17, lon: 128.47, country: 'RU', type: 'AIR — Russia Tu-95 Far East' },
    { name: 'Dzemgi AB (Komsomolsk)', lat: 50.61, lon: 137.08, country: 'RU', type: 'AIR — Russia Su-35/Su-57 Dev' },
    { name: 'Saki AB (Novofedorivka)', lat: 45.09, lon: 33.59, country: 'RU', type: 'AIR — Russia Crimea (Occupied)' },
    { name: 'Belbek AB', lat: 44.69, lon: 33.57, country: 'RU', type: 'AIR — Russia Crimea Fighter' },
    { name: 'Hmeimim AB (Latakia)', lat: 35.40, lon: 35.95, country: 'SY', type: 'AIR — Russia Syria Ops/Su-35' },
    { name: 'Kant AB (Kyrgyzstan)', lat: 42.85, lon: 74.85, country: 'KG', type: 'AIR — Russia CSTO Central Asia' },
    { name: 'Morozovsk AB', lat: 48.36, lon: 41.81, country: 'RU', type: 'AIR — Russia Su-25 Strike' },
    { name: 'Krymsk AB', lat: 44.96, lon: 38.00, country: 'RU', type: 'AIR — Russia Su-27 South' },
    { name: 'Primorsko-Akhtarsk AB', lat: 46.05, lon: 38.18, country: 'RU', type: 'AIR — Russia Black Sea Su-24' },
    { name: 'Chelyabinsk (Shagol) AB', lat: 55.52, lon: 61.24, country: 'RU', type: 'AIR — Russia MiG-31 Ural' },
    { name: 'Novosibirsk (Tolmachevo)', lat: 55.01, lon: 82.65, country: 'RU', type: 'AIR — Russia Siberian Fighter' },
    { name: 'Domna AB (Chita)', lat: 51.99, lon: 113.30, country: 'RU', type: 'AIR — Russia East Siberia' },
    { name: 'Spassk-Dalny AB', lat: 44.60, lon: 132.67, country: 'RU', type: 'AIR — Russia Pacific Su-27' },
    { name: 'Centralnaya Uglovaya AB', lat: 43.40, lon: 132.17, country: 'RU', type: 'AIR — Russia Vladivostok' },
    { name: 'Besovets AB (Petrozavodsk)', lat: 61.88, lon: 34.16, country: 'RU', type: 'AIR — Russia Northwest MiG-31' },
    { name: 'Shatalovo AB', lat: 54.35, lon: 33.00, country: 'RU', type: 'AIR — Russia Frontal Aviation' },
    // ── RUSSIA NAVAL ──────────────────────────────────────────────────────────
    { name: 'Severomorsk Naval Base', lat: 69.07, lon: 33.42, country: 'RU', type: 'NAVAL — Russia Northern Fleet HQ' },
    { name: 'Gadzhiyevo SSBN Base', lat: 69.25, lon: 33.52, country: 'RU', type: 'NAVAL — Russia SSBN Northern' },
    { name: 'Polyarny Sub Base', lat: 69.20, lon: 33.07, country: 'RU', type: 'NAVAL — Russia SSN Kola' },
    { name: 'Vidyayevo Sub Base', lat: 69.35, lon: 32.97, country: 'RU', type: 'NAVAL — Russia SSN Arctic' },
    { name: 'Kronstadt Naval Base', lat: 59.99, lon: 29.77, country: 'RU', type: 'NAVAL — Russia Baltic Fleet' },
    { name: 'Baltiysk Naval Base', lat: 54.65, lon: 19.90, country: 'RU', type: 'NAVAL — Russia Baltic Fleet Fwd' },
    { name: 'Novorossiysk Naval Base', lat: 44.72, lon: 37.77, country: 'RU', type: 'NAVAL — Russia Black Sea Fleet' },
    { name: 'Sevastopol Naval Base', lat: 44.62, lon: 33.53, country: 'RU', type: 'NAVAL — Russia Black Sea HQ (Crimea)' },
    { name: 'Tartus Naval Facility', lat: 34.89, lon: 35.87, country: 'SY', type: 'NAVAL — Russia Med Logistics' },
    { name: 'Fokino / Vladivostok Fleet', lat: 42.97, lon: 132.40, country: 'RU', type: 'NAVAL — Russia Pacific Fleet HQ' },
    { name: 'Rybachiy SSBN Base (Vilyuchinsk)', lat: 52.93, lon: 158.39, country: 'RU', type: 'NAVAL — Russia Pacific SSBN' },
    { name: 'Magadan Naval Base', lat: 59.57, lon: 150.78, country: 'RU', type: 'NAVAL — Russia Pacific North' },
    // ── CHINA AIR BASES ───────────────────────────────────────────────────────
    { name: 'Wuhan AB (Huanghua)', lat: 30.78, lon: 114.21, country: 'CN', type: 'AIR — PLAAF Central Theater' },
    { name: 'Dingxin Test Base', lat: 40.28, lon: 99.89, country: 'CN', type: 'AIR — PLAAF/PLAN Test & Eval' },
    { name: 'Lintao AB', lat: 35.50, lon: 103.85, country: 'CN', type: 'AIR — PLAAF Western Theater' },
    { name: 'Gonghe AB', lat: 36.53, lon: 100.63, country: 'CN', type: 'AIR — PLAAF Western Theater' },
    { name: 'Hotan AB', lat: 37.03, lon: 79.86, country: 'CN', type: 'AIR — PLAAF Xinjiang Strike' },
    { name: 'Kashgar AB', lat: 39.54, lon: 76.02, country: 'CN', type: 'AIR — PLAAF Xinjiang South' },
    { name: 'Ngari Gunsa AB', lat: 32.10, lon: 80.05, country: 'CN', type: 'AIR — PLAAF Tibet Strike (India FWD)' },
    { name: 'Shigatse Peace AB', lat: 29.32, lon: 88.91, country: 'CN', type: 'AIR — PLAAF Tibet J-16' },
    { name: 'Lhasa Gonggar AB', lat: 29.30, lon: 90.91, country: 'CN', type: 'AIR — PLAAF Tibet Airlift' },
    { name: 'Dachen AB (South Tibet)', lat: 28.41, lon: 97.47, country: 'CN', type: 'AIR — PLAAF Arunachal FWD' },
    { name: 'Lanzhou AB', lat: 36.52, lon: 103.62, country: 'CN', type: 'AIR — PLAAF J-10 NW Theater' },
    { name: 'Xian-Yanliang AB', lat: 34.65, lon: 109.12, country: 'CN', type: 'AIR — PLAAF Bomber/Transport CMD' },
    { name: 'Wuhu AB', lat: 31.39, lon: 118.36, country: 'CN', type: 'AIR — PLAAF Eastern J-10C' },
    { name: 'Shantou AB', lat: 23.42, lon: 116.76, country: 'CN', type: 'AIR — PLAAF South Sea Strike' },
    { name: 'Zhangzhou AB', lat: 24.33, lon: 117.85, country: 'CN', type: 'AIR — PLAAF J-20 Taiwan Strait' },
    { name: 'Longtian AB (Fuzhou)', lat: 25.67, lon: 119.66, country: 'CN', type: 'AIR — PLAAF J-11 Taiwan FWD' },
    { name: 'Jinan AB', lat: 36.79, lon: 117.06, country: 'CN', type: 'AIR — PLAAF Northern J-10' },
    { name: 'Changchun AB (Dafang Shen)', lat: 43.89, lon: 125.22, country: 'CN', type: 'AIR — PLAAF Northeast Fighter' },
    { name: 'Mudanjiang AB', lat: 44.52, lon: 129.58, country: 'CN', type: 'AIR — PLAAF Russia Border' },
    { name: 'Guilin-Liangjiang AB', lat: 25.22, lon: 110.04, country: 'CN', type: 'AIR — PLAAF J-10 South' },
    { name: 'Nanning AB', lat: 22.61, lon: 108.17, country: 'CN', type: 'AIR — PLAAF South Vietnam Border' },
    { name: 'Ledong AB (Hainan)', lat: 18.74, lon: 109.06, country: 'CN', type: 'AIR — PLAAF SCS Strike' },
    { name: 'Lingshui AB (Hainan)', lat: 18.49, lon: 110.04, country: 'CN', type: 'AIR — PLAAF/PLAN J-11 SCS' },
    { name: 'Sansha/Yongxing Island AB', lat: 16.83, lon: 112.34, country: 'CN', type: 'AIR — PLAAF Paracel Islands' },
    { name: 'Fiery Cross Reef AB', lat: 9.55, lon: 114.29, country: 'CN', type: 'AIR — PLAN SCS (Disputed)' },
    { name: 'Mischief Reef AB', lat: 9.91, lon: 115.54, country: 'CN', type: 'AIR — PLAN SCS (Disputed)' },
    { name: 'Subi Reef AB', lat: 10.93, lon: 114.08, country: 'CN', type: 'AIR — PLAN SCS (Disputed)' },
    // ── CHINA NAVAL ───────────────────────────────────────────────────────────
    { name: 'Qingdao Naval Base', lat: 36.04, lon: 120.31, country: 'CN', type: 'NAVAL — PLAN North Sea Fleet HQ' },
    { name: 'Zhoushan Naval Base', lat: 30.02, lon: 122.09, country: 'CN', type: 'NAVAL — PLAN East Sea Fleet HQ' },
    { name: 'Sanya Naval Base', lat: 18.22, lon: 109.51, country: 'CN', type: 'NAVAL — PLAN South Sea Fleet HQ' },
    { name: 'Yulin Naval Base (SSBN)', lat: 18.22, lon: 109.75, country: 'CN', type: 'NAVAL — PLAN SSBN Base' },
    { name: 'Huludao Sub Building Yard', lat: 40.72, lon: 120.85, country: 'CN', type: 'NAVAL — PLAN Sub Construction' },
    { name: 'Lushun / Dalian Naval', lat: 38.91, lon: 121.67, country: 'CN', type: 'NAVAL — PLAN Carrier/Destroyer' },
    { name: 'Wusong (Shanghai) Naval', lat: 31.40, lon: 121.47, country: 'CN', type: 'NAVAL — PLAN Amphibious' },
    { name: 'PLA Djibouti Base', lat: 11.56, lon: 43.14, country: 'DJ', type: 'NAVAL — China Overseas Support Base' },
    { name: 'Gwadar (Pakistan)', lat: 25.12, lon: 62.33, country: 'PK', type: 'NAVAL — China CPEC Port Access' },
    { name: 'Ream Naval Base (Cambodia)', lat: 10.52, lon: 103.68, country: 'KH', type: 'NAVAL — China Access (Reported)' },
    { name: 'Hambantota Port (Sri Lanka)', lat: 6.12, lon: 81.12, country: 'LK', type: 'NAVAL — China BRI Port (Leased)' },
    // ── INDIA AIR BASES ───────────────────────────────────────────────────────
    { name: 'Hindon AB', lat: 28.70, lon: 77.36, country: 'IN', type: 'AIR — IAF Western Air CMD HQ' },
    { name: 'Ambala AB', lat: 30.37, lon: 76.82, country: 'IN', type: 'AIR — IAF Rafale Wing' },
    { name: 'Halwara AB', lat: 30.74, lon: 75.63, country: 'IN', type: 'AIR — IAF MiG-21 (Upgrading)' },
    { name: 'Adampur AB', lat: 31.43, lon: 75.76, country: 'IN', type: 'AIR — IAF Su-30MKI' },
    { name: 'Pathankot AB', lat: 32.23, lon: 75.64, country: 'IN', type: 'AIR — IAF Strike FWD NW' },
    { name: 'Awantipur AB', lat: 33.96, lon: 75.00, country: 'IN', type: 'AIR — IAF Kashmir Valley' },
    { name: 'Srinagar AB', lat: 34.00, lon: 74.77, country: 'IN', type: 'AIR — IAF J&K Ops' },
    { name: 'Leh AB (Kushok Bakula)', lat: 34.14, lon: 77.55, country: 'IN', type: 'AIR — IAF Ladakh High Altitude' },
    { name: 'Thoise AB', lat: 35.47, lon: 76.88, country: 'IN', type: 'AIR — IAF Siachen Ops' },
    { name: 'Sarsawa AB', lat: 29.97, lon: 77.41, country: 'IN', type: 'AIR — IAF AN-32/Mi-17' },
    { name: 'Agra AB', lat: 27.16, lon: 77.96, country: 'IN', type: 'AIR — IAF Airlift/Para' },
    { name: 'Gwalior AB', lat: 26.29, lon: 78.23, country: 'IN', type: 'AIR — IAF MiG-29/Rafale incoming' },
    { name: 'Kalaikunda AB', lat: 22.33, lon: 87.18, country: 'IN', type: 'AIR — IAF Eastern CMD' },
    { name: 'Bagdogra AB', lat: 26.68, lon: 88.33, country: 'IN', type: 'AIR — IAF NE Corridor' },
    { name: 'Hashimara AB', lat: 26.71, lon: 89.38, country: 'IN', type: 'AIR — IAF NE China FWD' },
    { name: 'Chabua AB', lat: 27.48, lon: 95.12, country: 'IN', type: 'AIR — IAF Assam NE' },
    { name: 'Jorhat AB', lat: 26.73, lon: 94.18, country: 'IN', type: 'AIR — IAF NE Transport' },
    { name: 'Tezpur AB', lat: 26.71, lon: 92.78, country: 'IN', type: 'AIR — IAF Brahmaputra Su-30MKI' },
    { name: 'Pune AB (Lohegaon)', lat: 18.58, lon: 73.90, country: 'IN', type: 'AIR — IAF Western Air CMD' },
    { name: 'Jamnagar AB', lat: 22.47, lon: 70.01, country: 'IN', type: 'AIR — IAF Su-30MKI West Coast' },
    { name: 'Naliya AB', lat: 23.22, lon: 68.83, country: 'IN', type: 'AIR — IAF Pakistan Border FWD' },
    { name: 'Bhuj AB', lat: 23.29, lon: 69.67, country: 'IN', type: 'AIR — IAF Strike FWD West' },
    { name: 'Jodhpur AB', lat: 26.25, lon: 73.05, country: 'IN', type: 'AIR — IAF MiG-21/Su-30 NW' },
    { name: 'Uttarlai AB', lat: 25.74, lon: 71.81, country: 'IN', type: 'AIR — IAF Rajasthan Desert' },
    { name: 'Bidar AB', lat: 17.91, lon: 77.49, country: 'IN', type: 'AIR — IAF South Strike' },
    { name: 'Yelahanka AB (Bengaluru)', lat: 13.20, lon: 77.60, country: 'IN', type: 'AIR — IAF Southern Air CMD' },
    { name: 'Tambaram AB', lat: 12.92, lon: 80.13, country: 'IN', type: 'AIR — IAF Chennai Strike' },
    { name: 'Thanjavur AB', lat: 10.72, lon: 79.10, country: 'IN', type: 'AIR — IAF Maritime Patrol/Su-30' },
    // ── INDIA NAVAL ───────────────────────────────────────────────────────────
    { name: 'INS Kadamba, Karwar', lat: 14.82, lon: 74.14, country: 'IN', type: 'NAVAL — India West Fleet/Carrier' },
    { name: 'INS Hansa, Goa (Dabolim)', lat: 15.38, lon: 73.83, country: 'IN', type: 'NAVAL — India INAS West' },
    { name: 'INS Shikra, Mumbai', lat: 18.96, lon: 72.82, country: 'IN', type: 'NAVAL — India Western Fleet HQ' },
    { name: 'INS Vikramaditya Berth', lat: 15.42, lon: 73.83, country: 'IN', type: 'NAVAL — India Carrier Air Group' },
    { name: 'INS Circars, Visakhapatnam', lat: 17.68, lon: 83.29, country: 'IN', type: 'NAVAL — India Eastern Fleet HQ' },
    { name: 'INS Rajali, Arakkonam', lat: 13.06, lon: 79.68, country: 'IN', type: 'NAVAL — India INAS East P-8I' },
    { name: 'INS Baaz, Campbell Bay', lat: 7.00, lon: 93.92, country: 'IN', type: 'NAVAL — India Andaman FWD' },
    { name: 'INS Kohassa, Shibpur', lat: 13.66, lon: 93.01, country: 'IN', type: 'NAVAL — India Andaman North' },
    { name: 'Andaman CMD, Port Blair', lat: 11.62, lon: 92.72, country: 'IN', type: 'NAVAL — India Tri-CMD Andaman' },
    // ── PAKISTAN AIR & LAND ───────────────────────────────────────────────────
    { name: 'PAF Mushaf AB (Sargodha)', lat: 32.05, lon: 72.67, country: 'PK', type: 'AIR — PAF HQ Strike / Nuclear' },
    { name: 'PAF Minhas AB (Kamra)', lat: 33.87, lon: 72.40, country: 'PK', type: 'AIR — PAF Production/F-16' },
    { name: 'PAF Nur Khan AB', lat: 33.62, lon: 73.10, country: 'PK', type: 'AIR — PAF Transport/ISR' },
    { name: 'PAF Masroor AB', lat: 24.90, lon: 66.94, country: 'PK', type: 'AIR — PAF Karachi Strike' },
    { name: 'PAF Shahbaz AB', lat: 28.28, lon: 68.88, country: 'PK', type: 'AIR — PAF JF-17 South' },
    { name: 'PAF Samungli AB', lat: 29.33, lon: 66.78, country: 'PK', type: 'AIR — PAF Balochistan' },
    { name: 'PAF Rafiqui AB', lat: 30.76, lon: 72.28, country: 'PK', type: 'AIR — PAF F-7PG' },
    { name: 'PAF Peshawar AB', lat: 33.99, lon: 71.51, country: 'PK', type: 'AIR — PAF NW Frontier' },
    // ── IRAN AIR & NAVAL ─────────────────────────────────────────────────────
    { name: 'Mehrabad AB', lat: 35.69, lon: 51.31, country: 'IR', type: 'AIR — IRIAF Tehran CMD' },
    { name: 'Isfahan AB (8th Tactical)', lat: 32.45, lon: 51.86, country: 'IR', type: 'AIR — IRIAF Su-24/F-14' },
    { name: 'Shahid Nojeh AB (Hamedan)', lat: 35.21, lon: 48.65, country: 'IR', type: 'AIR — IRIAF Strike West' },
    { name: 'Tabriz AB (2nd Tactical)', lat: 38.13, lon: 46.24, country: 'IR', type: 'AIR — IRIAF NW F-14' },
    { name: 'Khatami AB (Yazd)', lat: 32.02, lon: 54.28, country: 'IR', type: 'AIR — IRIAF Su-24 Central' },
    { name: 'Bandar Abbas AB', lat: 27.22, lon: 56.37, country: 'IR', type: 'AIR/NAVAL — Iran Strait of Hormuz' },
    { name: 'Chahbahar Naval Base', lat: 25.29, lon: 60.64, country: 'IR', type: 'NAVAL — Iran Indian Ocean' },
    { name: 'Bushehr Naval Base', lat: 28.97, lon: 50.84, country: 'IR', type: 'NAVAL — Iran IRGCN Persian Gulf' },
    // ── NORTH KOREA ───────────────────────────────────────────────────────────
    { name: 'Sunchon AB', lat: 39.42, lon: 125.87, country: 'KP', type: 'AIR — KPAF MiG-29' },
    { name: 'Hwangju AB', lat: 38.63, lon: 125.80, country: 'KP', type: 'AIR — KPAF Strike' },
    { name: 'Pukchang AB', lat: 39.27, lon: 125.88, country: 'KP', type: 'AIR — KPAF IL-28 Bomber' },
    { name: 'Wonsan Kalma AB', lat: 39.18, lon: 127.48, country: 'KP', type: 'AIR — KPAF East Coast' },
    { name: 'Hamhung AB', lat: 39.85, lon: 127.53, country: 'KP', type: 'AIR — KPAF MiG-21' },
    { name: 'Nampo Naval Base', lat: 38.74, lon: 125.35, country: 'KP', type: 'NAVAL — DPRK West Sea' },
    { name: 'Wonsan Naval Base', lat: 39.15, lon: 127.44, country: 'KP', type: 'NAVAL — DPRK East Sea Sub' },
    // ── ISRAEL AIR & LAND ──────────────────────────────────────────────────────
    { name: 'Nevatim AB', lat: 31.21, lon: 35.02, country: 'IL', type: 'AIR — IAF F-35I Adir Wing' },
    { name: 'Hatzerim AB', lat: 31.23, lon: 34.66, country: 'IL', type: 'AIR — IAF F-16I Sufa Wing' },
    { name: 'Ramat David AB', lat: 32.66, lon: 35.18, country: 'IL', type: 'AIR — IAF F-16 North' },
    { name: 'Tel Nof AB', lat: 31.84, lon: 34.82, country: 'IL', type: 'AIR — IAF F-15I Ra\'am Wing' },
    { name: 'Palmachim AB', lat: 31.90, lon: 34.69, country: 'IL', type: 'AIR — IAF UAV / Space Launch' },
    { name: 'Ovda AB', lat: 29.94, lon: 34.94, country: 'IL', type: 'AIR — IAF Reserve / Negev' },
    // ── SAUDI ARABIA ──────────────────────────────────────────────────────────
    { name: 'King Abdulaziz AB (Dhahran)', lat: 26.27, lon: 50.16, country: 'SA', type: 'AIR — RSAF Eastern Province' },
    { name: 'King Faisal AB (Tabuk)', lat: 28.37, lon: 36.62, country: 'SA', type: 'AIR — RSAF Typhoon NW' },
    { name: 'King Khalid AB (Khamis Mushait)', lat: 18.30, lon: 42.80, country: 'SA', type: 'AIR — RSAF F-15S South' },
    { name: 'King Salman AB (Riyadh)', lat: 24.71, lon: 46.73, country: 'SA', type: 'AIR — RSAF CMD HQ' },
    { name: 'King Fahd AB (Jeddah)', lat: 21.72, lon: 39.15, country: 'SA', type: 'AIR — RSAF West' },
    // ── UAE & GULF STATES ─────────────────────────────────────────────────────
    { name: 'Al Dhafra AB (Abu Dhabi)', lat: 24.25, lon: 54.55, country: 'AE', type: 'AIR — UAE/USAF F-35A/E-8C' },
    { name: 'Al Minhad AB (Dubai)', lat: 25.03, lon: 55.37, country: 'AE', type: 'AIR — UAE Mirage 2000-9' },
    { name: 'Al Maktoum AB', lat: 24.90, lon: 55.16, country: 'AE', type: 'AIR — UAE Airlift' },
    { name: 'Muharraq AB (Bahrain)', lat: 26.27, lon: 50.64, country: 'BH', type: 'AIR — Bahrain/US F-16 Gulf' },
    // ── JAPAN & SOUTH KOREA ───────────────────────────────────────────────────
    { name: 'Hyakuri AB', lat: 36.18, lon: 140.42, country: 'JP', type: 'AIR — JASDF F-2A East' },
    { name: 'Matsushima AB', lat: 38.41, lon: 141.22, country: 'JP', type: 'AIR — JASDF F-2 Training' },
    { name: 'Chitose AB', lat: 42.79, lon: 141.67, country: 'JP', type: 'AIR — JASDF F-35A Hokkaido' },
    { name: 'Nyutabaru AB', lat: 32.08, lon: 131.45, country: 'JP', type: 'AIR — JASDF F-15 South' },
    { name: 'Naha AB (Okinawa)', lat: 26.20, lon: 127.65, country: 'JP', type: 'AIR — JASDF F-15 Southwest' },
    { name: 'Futenma MCAS (Okinawa)', lat: 26.28, lon: 127.76, country: 'JP', type: 'AIR — USMC Okinawa' },
    { name: 'Iwakuni MCAS', lat: 34.14, lon: 132.24, country: 'JP', type: 'AIR — USMC F-35B Japan' },
    { name: 'Yokota AB', lat: 35.75, lon: 139.35, country: 'JP', type: 'AIR — USFJ HQ / USAF Airlift' },
    { name: 'Cheongju AB', lat: 36.72, lon: 127.49, country: 'KR', type: 'AIR — ROKAF F-15K' },
    { name: 'Suwon AB', lat: 37.24, lon: 127.01, country: 'KR', type: 'AIR — ROKAF KF-21' },
    { name: 'Daegu AB', lat: 35.88, lon: 128.66, country: 'KR', type: 'AIR — ROKAF F-35A' },
    { name: 'Gwangju AB', lat: 35.13, lon: 126.81, country: 'KR', type: 'AIR — ROKAF F-5' },
    { name: 'Sacheon AB', lat: 35.09, lon: 128.07, country: 'KR', type: 'AIR — ROKAF T-50' },
    // ── AUSTRALIA ─────────────────────────────────────────────────────────────
    { name: 'RAAF Tindal', lat: -14.52, lon: 132.38, country: 'AU', type: 'AIR — RAAF F/A-18F NT' },
    { name: 'RAAF Darwin', lat: -12.42, lon: 130.87, country: 'AU', type: 'AIR — RAAF / USAF Rotation' },
    { name: 'RAAF Williamtown', lat: -32.79, lon: 151.84, country: 'AU', type: 'AIR — RAAF F-35A Wing' },
    { name: 'RAAF Amberley', lat: -27.63, lon: 152.71, country: 'AU', type: 'AIR — RAAF F/A-18A Super Hornet' },
    { name: 'RAAF Pearce', lat: -31.67, lon: 116.02, country: 'AU', type: 'AIR — RAAF Training/P-8A' },
    { name: 'RAAF Edinburgh', lat: -34.71, lon: 138.62, country: 'AU', type: 'AIR — RAAF ISR / P-8A' },
    { name: 'HMAS Stirling (Garden Island)', lat: -32.26, lon: 115.68, country: 'AU', type: 'NAVAL — RAN West Fleet / SSN incoming' },
    { name: 'HMAS Coonawarra (Darwin)', lat: -12.47, lon: 130.84, country: 'AU', type: 'NAVAL — RAN North Patrol' },
    { name: 'HMAS Albatross (Nowra)', lat: -34.95, lon: 150.54, country: 'AU', type: 'NAVAL — RAN P-8 INAS' },
    { name: 'Pine Gap JDSC', lat: -23.80, lon: 133.74, country: 'AU', type: 'INTEL — US-AU SIGINT/FORNSAT' },
    // ── MISCELLANEOUS STRATEGIC ───────────────────────────────────────────────
    { name: 'Ain Al-Asad AB, Iraq', lat: 33.79, lon: 42.44, country: 'IQ', type: 'AIR — Coalition Iraq FWD' },
    { name: 'Al-Asad AB (expanded)', lat: 33.78, lon: 42.44, country: 'IQ', type: 'AIR — US Air Iraq' },
    { name: 'Erbil Air Base', lat: 36.24, lon: 43.96, country: 'IQ', type: 'AIR — US Coalition Kurdistan' },
    { name: 'Al-Tanf Garrison, Syria', lat: 33.49, lon: 38.65, country: 'SY', type: 'LAND — US SOF Syria Garrison' },
    { name: 'Camp Simba, Manda Bay', lat: -2.26, lon: 41.20, country: 'KE', type: 'LAND/AIR — US Africa SOF' },
    { name: 'Agadez AB (Niger 201)', lat: 16.97, lon: 8.00, country: 'NE', type: 'AIR — US AFRICOM (Withdrawn 2024)' },
    { name: 'Dikhil Forward AB (Djibouti)', lat: 11.10, lon: 42.37, country: 'DJ', type: 'AIR — US UAV FWD' },
    { name: 'Thumrait AB, Oman', lat: 17.67, lon: 54.02, country: 'OM', type: 'AIR — US/UK Oman Access' },
    { name: 'Masirah Island AB', lat: 20.67, lon: 58.90, country: 'OM', type: 'AIR — US Oman Indian Ocean' },
    { name: 'Moi International / Mombasa', lat: -4.03, lon: 39.59, country: 'KE', type: 'NAVAL — US Logistics Access' },
    { name: 'Djibouti-Ambouli Intl/Mil', lat: 11.55, lon: 43.16, country: 'DJ', type: 'AIR — Multi-nation (US/FR/JP/CN)' },
    { name: 'Sembawang Naval Base', lat: 1.44, lon: 103.83, country: 'SG', type: 'NAVAL — US 7th Fleet Logistics' },
    { name: 'Changi Naval Base', lat: 1.33, lon: 104.00, country: 'SG', type: 'NAVAL — RSAF/US Singapore' },
    { name: 'Ubon Ratchathani AB', lat: 15.25, lon: 104.87, country: 'TH', type: 'AIR — US Thailand FWD (Hist.)' },
    { name: 'Clark AB (JBOS Mabalacat)', lat: 15.19, lon: 120.56, country: 'PH', type: 'AIR — US Philippines Access' },
    { name: 'Subic Bay (Philippines)', lat: 14.80, lon: 120.27, country: 'PH', type: 'NAVAL — US Philippines Naval' },
    { name: 'Antonio Bautista AB', lat: 9.31, lon: 118.04, country: 'PH', type: 'AIR — US Philippines SCS' },
    { name: 'Lumbia AB (Cagayan de Oro)', lat: 8.41, lon: 124.61, country: 'PH', type: 'AIR — Philippines-US Ops' },
    { name: 'Palawan / Camilo Osias AB', lat: 10.11, lon: 118.74, country: 'PH', type: 'AIR — US Philippines Mindanao' },
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
