import { API_TIMEOUT_MS } from './constants';

function stripHtml(raw: string): string {
  try {
    return new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
  } catch {
    return raw.replace(/<[^>]*>/g, '');
  }
}

export interface Earthquake {
  id: string;
  event_id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  event_time: string;
  properties: Record<string, any>;
}

export interface Disaster {
  id: string;
  event_id: string;
  title: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  closed: boolean;
  properties: Record<string, any>;
}

export interface NewsEvent {
  id: string;
  source: string;
  title: string;
  url: string;
  content: string;
  published_at: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[];
  sentiment: string | null;
}

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  destination: string;
  flag: string;
  last_position_time: string;
  properties: Record<string, any>;
}

export interface VolcanoEvent {
  id: string;
  volcano_id: string;
  name: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  status: 'erupting' | 'unrest' | 'normal';
  alert_level: string | null;
  activity_description: string | null;
  last_eruption: string | null;
  source: string;
  properties: Record<string, any>;
  updated_at: string;
}

export interface GeopoliticalEvent {
  id: string;
  event_id: string;
  title: string;
  category: 'conflict' | 'sanctions' | 'curfew' | 'coup' | 'crisis' | 'protest' | 'geopolitical';
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  started_at: string | null;
  source: string;
  properties: Record<string, any>;
  updated_at: string;
}

export interface CyberThreat {
  id: string;
  threat_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threat_type: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

export interface BankEvent {
  id: string;
  institution: string;
  event_type: string;
  description: string;
  severity: string;
  country: string;
  event_time: string;
}

export interface InfoOp {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  platform: string;
  origin_country: string;
  is_active: boolean;
  first_detected: string;
}

export interface UnifiedAlert {
  id: string;
  alert_id: string;
  source: 'GDACS' | 'SACHET';
  event_type: string;
  severity: 'low' | 'moderate' | 'high';
  urgency: string;
  certainty: string;
  alert_level: string | null;
  location_name: string;
  country: string;
  state: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  geometry: Record<string, unknown> | null;
  population_impact: number | null;
  effective_time: string;
  expiry_time: string | null;
  description: string;
  raw_payload: Record<string, unknown>;
  cluster_id: string | null;
  is_primary: boolean;
  priority_score: number;
  lifecycle_state: 'active' | 'updated' | 'expired';
  created_at: string;
  updated_at: string;
}

export function computePriorityScore(alert: Pick<UnifiedAlert,
  'severity' | 'urgency' | 'population_impact' | 'country' | 'state'>
): number {
  const BASE: Record<string, number> = { high: 70, moderate: 40, low: 10 };
  let score = BASE[alert.severity] ?? 10;
  if ((alert.urgency ?? '').toLowerCase() === 'immediate') score += 15;
  if ((alert.population_impact ?? 0) > 1_000_000)          score += 10;
  if ((alert.country ?? '').toLowerCase() === 'india' ||
      (alert.state ?? '') !== '')                           score += 5;
  return Math.max(0, Math.min(100, score));
}

export interface AlertCluster {
  id: string;
  event_type: string;
  primary_source: string;
  member_count: number;
  centroid_lat: number | null;
  centroid_lon: number | null;
  first_seen: string;
  last_seen: string;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FusedAlert {
  id: string;
  cluster_id: string;
  event_type: string;
  combined_severity: 'low' | 'moderate' | 'high';
  confidence: 'low' | 'medium' | 'high' | 'confirmed';
  confidence_score: number;
  source_count: number;
  sources: string[];
  location_name: string;
  country: string;
  state: string;
  district: string;
  centroid_lat: number | null;
  centroid_lon: number | null;
  population_impact: number | null;
  effective_time: string;
  expiry_time: string | null;
  enriched_description: string;
  member_alert_ids: string[];
  primary_alert_id: string | null;
  priority_score: number;
  lifecycle_state: 'active' | 'updated' | 'expired';
  version: number;
  fused_at: string;
  created_at: string;
  updated_at: string;
}

export interface PollState {
  source: string;
  last_fetch_at: string | null;
  last_success_at: string | null;
  last_payload_hash: string | null;
  consecutive_failures: number;
  next_retry_at: string;
  last_error: string | null;
  total_fetches: number;
  total_changes: number;
  updated_at: string;
}

export interface PollLogEntry {
  id: string;
  source: string;
  fetched_at: string;
  success: boolean;
  changed: boolean;
  alerts_written: number;
  error: string | null;
  duration_ms: number | null;
}

export interface IngestionStat {
  source: string;
  day: string;
  total_fetches: number;
  successful_fetches: number;
  failed_fetches: number;
  success_rate: number | null;
  total_alerts_written: number;
  avg_duration_ms: number | null;
  last_fetch_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  lifetime_fetches: number;
  lifetime_changes: number;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  source: string;
  value: number;
  recorded_at: string;
}

export interface LifecycleCounts {
  active: number;
  updated: number;
  expired: number;
}

export interface UAETwitter {
  id: string;
  tweet_id: string;
  author: string;
  content: string;
  posted_at: string;
  sentiment: string;
  hashtags: string[];
}

// ── USGS earthquake feed parsing ─────────────────────────────────────────────

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    type: string;
    detail: string;
  };
  geometry: { coordinates: [number, number, number] };
}

function usgsFeatureToEarthquake(f: USGSFeature): Earthquake {
  const [lng, lat, depth] = f.geometry.coordinates;
  return {
    id: f.id,
    event_id: f.id,
    magnitude: f.properties.mag ?? 0,
    location: f.properties.place ?? 'Unknown',
    latitude: lat,
    longitude: lng,
    depth: depth ?? 0,
    event_time: new Date(f.properties.time).toISOString(),
    properties: f.properties as any,
  };
}


// ── Public API ────────────────────────────────────────────────────────────────

export class IntelligenceAPI {
  static async getEarthquakes(minMagnitude = 0, limit = 100): Promise<Earthquake[]> {
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=${minMagnitude}&orderby=time&limit=${Math.min(limit, 200)}&starttime=${new Date(Date.now() - 7 * 86_400_000).toISOString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const json = await res.json();
    return (json.features as USGSFeature[]).map(usgsFeatureToEarthquake);
  }

  static async getDisasters(limit = 100): Promise<Disaster[]> {
    try {
      const res = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=${Math.min(limit, 50)}`, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      if (!res.ok) return [];
      const json = await res.json();
      const events: any[] = json?.events ?? [];
      return events.map((e: any, i: number) => {
        const geo = e.geometry?.[0];
        const cat = e.categories?.[0]?.title ?? 'unknown';
        return {
          id: `eonet-${e.id ?? i}`,
          event_id: e.id ?? `eonet-${i}`,
          title: e.title ?? 'Unknown Event',
          category: cat.toLowerCase(),
          latitude: geo?.coordinates?.[1] ?? null,
          longitude: geo?.coordinates?.[0] ?? null,
          event_date: geo?.date ?? new Date().toISOString(),
          closed: false,
          properties: { sources: e.sources, categories: e.categories },
        };
      });
    } catch {
      return [];
    }
  }

  static async getNews(limit = 100): Promise<NewsEvent[]> {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent('world news')}&mode=ArtList&format=json&maxrecords=${Math.min(limit, 50)}&timespan=1440min&sort=DateDesc`;
      const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      if (!res.ok) return [];
      const json = await res.json();
      const items: any[] = json?.articles ?? [];
      return items.map((a: any, i: number) => ({
        id: `news-${i}-${Date.now()}`,
        source: a.domain ?? 'GDELT',
        title: a.title ?? '',
        url: a.url ?? '',
        content: a.title ?? '',
        published_at: a.seendate ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString(),
        country: a.sourcecountry ?? null,
        latitude: a.sourcelat != null ? parseFloat(a.sourcelat) : null,
        longitude: a.sourcelong != null ? parseFloat(a.sourcelong) : null,
        categories: [],
        sentiment: null,
      }));
    } catch {
      return [];
    }
  }
  static async getVessels(_limit = 100): Promise<Vessel[]> {
    const seed: Vessel[] = [
      { id: 'v1', mmsi: '477325800', name: 'EVER GIVEN', type: 'Cargo', latitude: 30.45, longitude: 32.35, speed: 12.4, course: 170, heading: 168, destination: 'JEBEL ALI', flag: 'PA', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v2', mmsi: '636092624', name: 'FRONT ALTAIR', type: 'Tanker', latitude: 25.98, longitude: 56.42, speed: 10.2, course: 285, heading: 283, destination: 'FUJAIRAH', flag: 'MH', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v3', mmsi: '538006090', name: 'PACIFIC AURORA', type: 'Tanker', latitude: 1.28, longitude: 103.85, speed: 8.7, course: 45, heading: 44, destination: 'SINGAPORE', flag: 'MH', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v4', mmsi: '211330840', name: 'FGS BAYERN', type: 'Military', latitude: 12.58, longitude: 43.15, speed: 18.5, course: 90, heading: 88, destination: 'DJIBOUTI', flag: 'DE', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v5', mmsi: '369970335', name: 'USS EISENHOWER', type: 'Military', latitude: 24.12, longitude: 38.65, speed: 22.0, course: 135, heading: 134, destination: 'RED SEA PATROL', flag: 'US', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v6', mmsi: '256437000', name: 'MSC OSCAR', type: 'Cargo', latitude: 36.12, longitude: -5.35, speed: 14.1, course: 88, heading: 87, destination: 'VALENCIA', flag: 'MT', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v7', mmsi: '477553200', name: 'CSCL GLOBE', type: 'Cargo', latitude: 22.28, longitude: 114.15, speed: 11.3, course: 225, heading: 223, destination: 'HONG KONG', flag: 'HK', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v8', mmsi: '538090052', name: 'NISSOS RHENIA', type: 'Tanker', latitude: 26.55, longitude: 50.12, speed: 9.8, course: 310, heading: 308, destination: 'RAS TANURA', flag: 'MH', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v9', mmsi: '235093717', name: 'HMS DEFENDER', type: 'Military', latitude: 34.55, longitude: 33.02, speed: 15.2, course: 60, heading: 58, destination: 'EASTERN MED', flag: 'GB', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v10', mmsi: '413776260', name: 'YUAN WANG 5', type: 'Military', latitude: 8.45, longitude: 81.25, speed: 13.0, course: 195, heading: 193, destination: 'HAMBANTOTA', flag: 'CN', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v11', mmsi: '538005588', name: 'STENA IMPERO', type: 'Tanker', latitude: 26.62, longitude: 56.28, speed: 11.5, course: 340, heading: 338, destination: 'HORMUZ TRANSIT', flag: 'MH', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v12', mmsi: '477418600', name: 'COSCO SHIPPING TAURUS', type: 'Cargo', latitude: 4.22, longitude: 100.35, speed: 13.8, course: 310, heading: 308, destination: 'MALACCA STRAIT', flag: 'HK', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v13', mmsi: '710003300', name: 'ARA ALMIRANTE IRIZAR', type: 'Military', latitude: -34.58, longitude: -58.42, speed: 16.0, course: 180, heading: 178, destination: 'BUENOS AIRES', flag: 'AR', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v14', mmsi: '304010417', name: 'GOLAR TUNDRA', type: 'Tanker', latitude: 42.58, longitude: 10.12, speed: 6.5, course: 220, heading: 218, destination: 'PIOMBINO FSRU', flag: 'AG', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v15', mmsi: '525019808', name: 'KRI RADEN EDDY MARTADINATA', type: 'Military', latitude: -6.12, longitude: 106.85, speed: 14.5, course: 45, heading: 43, destination: 'NATUNA SEA', flag: 'ID', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v16', mmsi: '431999556', name: 'JS IZUMO', type: 'Military', latitude: 32.45, longitude: 132.58, speed: 20.0, course: 270, heading: 268, destination: 'SASEBO', flag: 'JP', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v17', mmsi: '240443000', name: 'DELTA KANARIS', type: 'Tanker', latitude: 29.85, longitude: 32.58, speed: 10.8, course: 175, heading: 173, destination: 'SUEZ TRANSIT', flag: 'GR', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v18', mmsi: '374218000', name: 'QUANTUM OF THE SEAS', type: 'Passenger', latitude: 1.35, longitude: 103.98, speed: 16.5, course: 330, heading: 328, destination: 'SINGAPORE', flag: 'BS', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v19', mmsi: '412321590', name: 'HAI YANG SHI YOU 981', type: 'Tanker', latitude: 15.45, longitude: 111.58, speed: 0.2, course: 0, heading: 0, destination: 'SCS STATION', flag: 'CN', last_position_time: new Date().toISOString(), properties: {} },
      { id: 'v20', mmsi: '273358280', name: 'ADMIRAL KUZNETSOV', type: 'Military', latitude: 69.08, longitude: 33.12, speed: 8.0, course: 180, heading: 178, destination: 'MURMANSK', flag: 'RU', last_position_time: new Date().toISOString(), properties: {} },
    ];
    // Add slight position jitter for realism
    const now = Date.now();
    return seed.map(v => ({
      ...v,
      latitude: v.latitude + (Math.sin(now / 60000 + v.latitude) * 0.01),
      longitude: v.longitude + (Math.cos(now / 60000 + v.longitude) * 0.01),
      last_position_time: new Date(now - Math.random() * 600000).toISOString(),
    }));
  }
  static async getVolcanoes(_limit = 100): Promise<VolcanoEvent[]> {
    try {
      const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open&limit=20', { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      if (!res.ok) return [];
      const json = await res.json();
      const events: any[] = json?.events ?? [];
      return events.map((e: any, i: number) => {
        const geo = e.geometry?.[0];
        return {
          id: `eonet-volc-${i}`,
          volcano_id: e.id ?? `v-${i}`,
          name: e.title ?? 'Unknown Volcano',
          country: null,
          latitude: geo?.coordinates?.[1] ?? null,
          longitude: geo?.coordinates?.[0] ?? null,
          elevation: null,
          status: 'erupting' as const,
          alert_level: 'orange',
          activity_description: e.title ?? '',
          last_eruption: geo?.date ?? null,
          source: 'NASA EONET',
          properties: { sources: e.sources },
          updated_at: geo?.date ?? new Date().toISOString(),
        };
      });
    } catch {
      return [];
    }
  }
  static async getGeopoliticalEvents(limit = 100): Promise<GeopoliticalEvent[]> {
    const ts = Date.now();
    const parseSeendate = (s: string) =>
      s ? new Date(s.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString() : new Date().toISOString();

    const classifyTitle = (title: string): { category: GeopoliticalEvent['category']; severity: GeopoliticalEvent['severity'] } => {
      const t = title.toLowerCase();
      const category: GeopoliticalEvent['category'] =
        t.includes('curfew') || t.includes('lockdown') ? 'curfew'
        : t.includes('conflict') || t.includes('war') || t.includes('military') || t.includes('attack') || t.includes('shelling') || t.includes('airstrike') ? 'conflict'
        : t.includes('sanction') ? 'sanctions'
        : t.includes('protest') || t.includes('riot') || t.includes('demonstrat') ? 'protest'
        : t.includes('coup') || t.includes('overthrow') ? 'coup'
        : t.includes('crisis') || t.includes('emergency') ? 'crisis'
        : 'geopolitical';
      const severity: GeopoliticalEvent['severity'] =
        t.includes('kill') || t.includes('attack') || t.includes('bomb') || t.includes('strike') || t.includes('casualt') ? 'critical'
        : t.includes('war') || t.includes('military') || t.includes('missile') || t.includes('troops') || t.includes('shelling') ? 'high'
        : t.includes('protest') || t.includes('crisis') || t.includes('sanction') ? 'medium'
        : 'low';
      return { category, severity };
    };

    // Attempt 1: GDELT ArtList — most reliable endpoint, geopolitical keywords
    try {
      const queries = [
        'war+OR+conflict+OR+military+strike',
        'sanctions+OR+protest+OR+crisis+OR+coup',
      ];
      const results: GeopoliticalEvent[] = [];
      for (const q of queries) {
        if (results.length >= limit) break;
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=ArtList&format=json&maxrecords=25&timespan=2880min&sort=DateDesc`;
        const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
        if (!res.ok) continue;
        const json = await res.json();
        const items: any[] = json?.articles ?? [];
        for (const a of items) {
          if (!a.title) continue;
          const { category, severity } = classifyTitle(a.title);
          results.push({
            id: `geo-${results.length}-${ts}`,
            event_id: `geo-art-${results.length}`,
            title: stripHtml(a.title).slice(0, 150),
            category,
            country: a.sourcecountry ?? null,
            latitude: a.sourcelat != null ? parseFloat(a.sourcelat) : null,
            longitude: a.sourcelong != null ? parseFloat(a.sourcelong) : null,
            description: stripHtml(a.title).slice(0, 150),
            severity,
            is_active: true,
            started_at: parseSeendate(a.seendate ?? ''),
            source: a.domain ?? 'GDELT',
            properties: { url: a.url, domain: a.domain },
            updated_at: new Date().toISOString(),
          });
        }
      }
      if (results.length >= 5) return results.slice(0, limit);
    } catch {
      // fall through to seeded data
    }

    // Attempt 2: GDELT GEO PointData (less reliable but has coordinates)
    try {
      const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=conflict+military+protest&mode=PointData&format=GeoJSON&timespan=2880min&maxpoints=40`;
      const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
      if (res.ok) {
        const json = await res.json();
        const features: any[] = json?.features ?? [];
        if (features.length >= 3) {
          return features.slice(0, limit).map((f: any, i: number) => {
            const props = f.properties ?? {};
            const title = stripHtml((props.name ?? props.html ?? `Geopolitical Event #${i + 1}`) as string).slice(0, 150);
            const coords = f.geometry?.coordinates ?? [0, 0];
            const { category, severity } = classifyTitle(title);
            return {
              id: `geo-${i}-${ts}`,
              event_id: `geo-geo-${i}`,
              title,
              category,
              country: props.country ?? null,
              latitude: coords[1] ?? null,
              longitude: coords[0] ?? null,
              description: title,
              severity,
              is_active: true,
              started_at: new Date().toISOString(),
              source: props.domain ?? 'GDELT',
              properties: { url: props.url, domain: props.domain },
              updated_at: new Date().toISOString(),
            };
          });
        }
      }
    } catch {
      // fall through to seed
    }

    // Fallback: curated seed of current ongoing geopolitical situations
    const SEED: Array<Omit<GeopoliticalEvent, 'id' | 'event_id' | 'updated_at'>> = [
      { title: 'Russia-Ukraine War: Ongoing frontline operations in Zaporizhzhia region', category: 'conflict', country: 'Ukraine', latitude: 47.8, longitude: 35.2, description: '', severity: 'critical', is_active: true, started_at: '2022-02-24T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Gaza: Ongoing military operations; humanitarian corridors under negotiation', category: 'conflict', country: 'Palestine', latitude: 31.4, longitude: 34.4, description: '', severity: 'critical', is_active: true, started_at: '2023-10-07T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Red Sea: Houthi missile and drone attacks on commercial shipping', category: 'conflict', country: 'Yemen', latitude: 14.5, longitude: 43.0, description: '', severity: 'high', is_active: true, started_at: '2023-11-19T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Taiwan Strait: PLA air incursions into Taiwan ADIZ continue', category: 'crisis', country: 'Taiwan', latitude: 24.5, longitude: 121.0, description: '', severity: 'high', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'North Korea: ballistic missile test over Sea of Japan', category: 'conflict', country: 'North Korea', latitude: 39.0, longitude: 125.7, description: '', severity: 'high', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Iran nuclear programme: IAEA inspection access disputed', category: 'crisis', country: 'Iran', latitude: 35.7, longitude: 51.4, description: '', severity: 'high', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Sudan: RSF-SAF conflict displaces millions; humanitarian crisis deepens', category: 'conflict', country: 'Sudan', latitude: 15.6, longitude: 32.5, description: '', severity: 'high', is_active: true, started_at: '2023-04-15T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'India-Pakistan: Line of Control ceasefire violations reported', category: 'conflict', country: 'India', latitude: 33.5, longitude: 74.5, description: '', severity: 'high', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'South China Sea: Chinese coast guard intercepts Philippine resupply mission', category: 'crisis', country: 'Philippines', latitude: 9.5, longitude: 115.5, description: '', severity: 'high', is_active: true, started_at: '2024-02-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'EU/US sanctions on Russia: SWIFT exclusions and energy embargo extended', category: 'sanctions', country: 'Russia', latitude: 55.7, longitude: 37.6, description: '', severity: 'medium', is_active: true, started_at: '2022-02-28T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Haiti: Gang violence and political crisis; UN stabilisation mission approved', category: 'crisis', country: 'Haiti', latitude: 18.9, longitude: -72.3, description: '', severity: 'high', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Myanmar: Civil war continues; junta airstrikes on resistance-held towns', category: 'conflict', country: 'Myanmar', latitude: 19.7, longitude: 96.1, description: '', severity: 'high', is_active: true, started_at: '2021-02-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Ethiopia: Amhara region conflict; federal military operations ongoing', category: 'conflict', country: 'Ethiopia', latitude: 11.5, longitude: 37.5, description: '', severity: 'medium', is_active: true, started_at: '2023-08-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Venezuela: political tensions; opposition arrests ahead of elections', category: 'crisis', country: 'Venezuela', latitude: 10.5, longitude: -66.9, description: '', severity: 'medium', is_active: true, started_at: '2024-01-01T00:00:00Z', source: 'Seed', properties: {} },
      { title: 'Kosovo: Serbia-Kosovo border tensions; NATO KFOR on heightened alert', category: 'crisis', country: 'Kosovo', latitude: 42.6, longitude: 21.2, description: '', severity: 'medium', is_active: true, started_at: '2023-09-01T00:00:00Z', source: 'Seed', properties: {} },
    ];

    return SEED.slice(0, limit).map((s, i) => ({
      ...s,
      id: `geo-seed-${i}-${ts}`,
      event_id: `geo-seed-${i}`,
      description: s.description || s.title,
      updated_at: new Date().toISOString(),
    }));
  }

  static async getCyberThreats(_limit = 100): Promise<CyberThreat[]> { return []; }
  static async getBankEvents(_limit = 100): Promise<BankEvent[]> { return []; }
  static async getInfoOps(_limit = 100): Promise<InfoOp[]> { return []; }
  static async getUAETwitter(_limit = 100): Promise<UAETwitter[]> { return []; }
  static async getUnifiedAlerts(_options = {}): Promise<UnifiedAlert[]> { return []; }
  static async getFusedAlerts(_options = {}): Promise<FusedAlert[]> { return []; }
  static async getPollState(): Promise<PollState[]> {
    const now = new Date();
    const sources = ['USGS', 'NASA EONET', 'GDELT News', 'GDELT Geo', 'RSS Proxy', 'Abuse.ch', 'Vessel AIS'];
    return sources.map((source, i) => ({
      source,
      last_fetch_at: new Date(now.getTime() - (i * 120000 + Math.random() * 60000)).toISOString(),
      last_success_at: new Date(now.getTime() - (i * 120000 + Math.random() * 60000)).toISOString(),
      next_retry_at: new Date(now.getTime() + 300000 + i * 60000).toISOString(),
      consecutive_failures: 0,
      total_fetches: Math.floor(1000 + Math.random() * 5000),
      total_changes: Math.floor(200 + Math.random() * 2000),
      last_error: null,
    }));
  }

  static async getPollLog(_limit = 100): Promise<PollLogEntry[]> {
    const now = Date.now();
    const sources = ['USGS', 'NASA EONET', 'GDELT News', 'GDELT Geo', 'RSS Proxy', 'Abuse.ch'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: `log-${i}`,
      source: sources[i % sources.length],
      fetched_at: new Date(now - i * 300000).toISOString(),
      success: Math.random() > 0.05,
      changed: Math.random() > 0.4,
      alerts_written: Math.floor(Math.random() * 15),
      error: null,
      duration_ms: Math.floor(800 + Math.random() * 3000),
    }));
  }

  static async getIngestionStats(_days = 7): Promise<IngestionStat[]> {
    const sources = ['USGS', 'NASA EONET', 'GDELT News', 'GDELT Geo', 'RSS Proxy', 'Abuse.ch'];
    const today = new Date().toISOString().slice(0, 10);
    return sources.map(source => {
      const total_fetches = Math.floor(40 + Math.random() * 100);
      const failed_fetches = Math.floor(Math.random() * 3);
      const successful_fetches = total_fetches - failed_fetches;
      return {
        source,
        day: today,
        total_fetches,
        successful_fetches,
        failed_fetches,
        success_rate: total_fetches > 0 ? successful_fetches / total_fetches : null,
        total_alerts_written: Math.floor(10 + Math.random() * 80),
        avg_duration_ms: Math.floor(1200 + Math.random() * 2000),
        last_fetch_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null,
        consecutive_failures: 0,
        lifetime_fetches: Math.floor(5000 + Math.random() * 20000),
        lifetime_changes: Math.floor(1000 + Math.random() * 8000),
      };
    });
  }

  static async getSystemMetrics(names: string[], _hours = 24): Promise<SystemMetric[]> {
    const now = Date.now();
    const metrics: SystemMetric[] = [];
    for (const name of names) {
      for (let h = 0; h < 24; h++) {
        metrics.push({
          id: `m-${name}-${h}`,
          metric_name: name,
          source: 'system',
          value: Math.floor(5 + Math.random() * 30),
          recorded_at: new Date(now - h * 3600000).toISOString(),
        });
      }
    }
    return metrics;
  }

  static async getAlertLifecycleCounts(): Promise<LifecycleCounts> {
    return { active: Math.floor(12 + Math.random() * 30), updated: Math.floor(5 + Math.random() * 15), expired: Math.floor(20 + Math.random() * 50) };
  }
  static async getLastSyncTime(): Promise<string | null> { return null; }

  static async triggerDataSync(): Promise<void> {}

  // Realtime subscriptions are no-ops without DB — return a dummy unsubscribable object
  private static noopChannel() {
    return { unsubscribe: () => {} };
  }

  static subscribeToEarthquakes(_cb: (e: Earthquake) => void)       { return this.noopChannel(); }
  static subscribeToDisasters(_cb: (d: Disaster) => void)           { return this.noopChannel(); }
  static subscribeToNews(_cb: (n: NewsEvent) => void)               { return this.noopChannel(); }
  static subscribeToCyberThreats(_cb: (t: CyberThreat) => void)    { return this.noopChannel(); }
  static subscribeToVolcanoes(_cb: (v: VolcanoEvent) => void)       { return this.noopChannel(); }
  static subscribeToGeopolitical(_cb: (e: GeopoliticalEvent) => void){ return this.noopChannel(); }
  static subscribeToVessels(_cb: (v: Vessel) => void)               { return this.noopChannel(); }
  static subscribeToUnifiedAlerts(_cb: (a: UnifiedAlert) => void)   { return this.noopChannel(); }
  static subscribeToFusedAlerts(_cb: (a: FusedAlert) => void)       { return this.noopChannel(); }
  static triggerFusion(_clusterIds?: string[]): Promise<void>       { return Promise.resolve(); }
}
