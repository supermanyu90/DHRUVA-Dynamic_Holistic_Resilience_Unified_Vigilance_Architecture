import { API_TIMEOUT_MS } from './constants';
import { supabase } from './supabase';

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
  static async getVessels(limit = 100): Promise<Vessel[]> {
    // NOTE: Real-time AIS vessel data requires a paid API key.
    // Recommended providers:
    //   - MarineTraffic API (https://www.marinetraffic.com/en/ais-api-services) — PAID
    //   - VesselFinder API (https://api.vesselfinder.com) — PAID
    //   - AISHub (https://www.aishub.net/api) — Free with registration, requires own AIS receiver or membership
    //   - AIS Stream (https://aisstream.io) — Free tier WebSocket feed (100 vessels/min)
    // To enable live vessel tracking, set VITE_AISSTREAM_API_KEY in your .env file and
    // this function will use the AIS Stream REST snapshot endpoint.
    const apiKey = (import.meta as any).env?.VITE_AISSTREAM_API_KEY as string | undefined;
    if (apiKey) {
      try {
        // AIS Stream bounding-box snapshot: covers key strategic chokepoints
        const bboxes = [
          [24.0, 55.0, 28.0, 58.0],   // Strait of Hormuz
          [29.0, 31.0, 31.5, 34.0],   // Suez Canal
          [1.0, 103.0, 2.0, 104.5],   // Malacca Strait
          [11.5, 42.5, 13.5, 44.5],   // Bab el-Mandeb
          [8.5, -80.5, 10.0, -78.5],  // Panama Canal
        ];
        const results: Vessel[] = [];
        for (const [minLat, minLon, maxLat, maxLon] of bboxes) {
          if (results.length >= limit) break;
          const res = await fetch('https://api.aisstream.io/v0/vesselSearch', {
            method: 'POST',
            headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Latitude: (minLat + maxLat) / 2, Longitude: (minLon + maxLon) / 2, Radius: 50 }),
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
          });
          if (!res.ok) continue;
          const json = await res.json();
          const vessels: any[] = json ?? [];
          for (const v of vessels) {
            if (!v.MMSI) continue;
            results.push({
              id: `ais-${v.MMSI}`,
              mmsi: String(v.MMSI),
              name: v.ShipName?.trim() || 'UNKNOWN',
              type: v.ShipType || 'Unknown',
              latitude: v.Latitude ?? 0,
              longitude: v.Longitude ?? 0,
              speed: v.Sog ?? 0,
              course: v.Cog ?? 0,
              heading: v.Heading ?? v.Cog ?? 0,
              destination: v.Destination?.trim() || '',
              flag: v.Flag || '',
              last_position_time: v.TimeUtc ? new Date(v.TimeUtc).toISOString() : new Date().toISOString(),
              properties: { imo: v.IMO, draught: v.Draught },
            });
          }
        }
        if (results.length > 0) return results.slice(0, limit);
      } catch {
        // fall through to notice
      }
    }

    // No API key configured — return empty list with a console notice
    console.warn(
      '[DHRUVA] Vessel tracking requires a live AIS API key.\n' +
      'Free option: Register at https://aisstream.io and set VITE_AISSTREAM_API_KEY in your .env\n' +
      'Paid options: MarineTraffic (https://www.marinetraffic.com/en/ais-api-services), VesselFinder (https://api.vesselfinder.com)'
    );
    return [];
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
      // fall through to ACLED attempt
    }

    // Attempt 3: ACLED (Armed Conflict Location & Event Data) — free with registration
    // NOTE: Requires a free API key from https://acleddata.com/register
    // Set VITE_ACLED_API_KEY and VITE_ACLED_EMAIL in your .env to enable this source.
    const acledKey   = (import.meta as any).env?.VITE_ACLED_API_KEY as string | undefined;
    const acledEmail = (import.meta as any).env?.VITE_ACLED_EMAIL as string | undefined;
    if (acledKey && acledEmail) {
      try {
        const url = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(acledKey)}&email=${encodeURIComponent(acledEmail)}&limit=${Math.min(limit, 50)}&fields=event_id_cnty|event_date|event_type|actor1|country|latitude|longitude|notes|fatalities&event_date=${new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)}|${new Date().toISOString().slice(0, 10)}&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
        if (res.ok) {
          const json = await res.json();
          const data: any[] = json?.data ?? [];
          if (data.length > 0) {
            return data.map((e: any, i: number) => {
              const title = `${e.event_type}: ${e.actor1 ?? ''} — ${e.country ?? ''}`.trim();
              const { category, severity } = classifyTitle(e.event_type ?? title);
              return {
                id: `acled-${i}-${ts}`,
                event_id: e.event_id_cnty ?? `acled-${i}`,
                title: title.slice(0, 150),
                category,
                country: e.country ?? null,
                latitude: e.latitude != null ? parseFloat(e.latitude) : null,
                longitude: e.longitude != null ? parseFloat(e.longitude) : null,
                description: (e.notes ?? title).slice(0, 300),
                severity,
                is_active: true,
                started_at: e.event_date ? new Date(e.event_date).toISOString() : new Date().toISOString(),
                source: 'ACLED',
                properties: { fatalities: e.fatalities },
                updated_at: new Date().toISOString(),
              };
            });
          }
        }
      } catch {
        // fall through
      }
    } else {
      console.warn(
        '[DHRUVA] Enhanced geopolitical conflict data available free from ACLED.\n' +
        'Register at https://acleddata.com/register and set VITE_ACLED_API_KEY and VITE_ACLED_EMAIL in your .env'
      );
    }

    // All sources exhausted — return empty (GDELT ArtList should have succeeded above)
    console.warn('[DHRUVA] All geopolitical data sources returned empty results.');
    return [];
  }

  // NOTE: CyberThreats from commercial threat feeds require paid API keys.
  // Free options: Abuse.ch feeds (used in CyberView component directly via CSV).
  // Paid options:
  //   - Recorded Future API (https://www.recordedfuture.com) — PAID
  //   - VirusTotal Intelligence (https://www.virustotal.com/gui/intelligence-overview) — PAID
  //   - Shodan (https://www.shodan.io/api) — Free tier (100 queries/month), paid for bulk
  //   Set VITE_SHODAN_API_KEY in .env to enable Shodan threat lookups.
  static async getCyberThreats(_limit = 100): Promise<CyberThreat[]> { return []; }

  // NOTE: Banking/financial event data requires paid licensed feeds.
  // Paid options:
  //   - Refinitiv/LSEG World-Check (https://www.refinitiv.com/en/financial-crime) — PAID
  //   - Bloomberg Terminal API — PAID
  //   - Open Sanctions (https://www.opensanctions.org/docs/api/) — Free API for sanctions data
  static async getBankEvents(_limit = 100): Promise<BankEvent[]> { return []; }

  // NOTE: Information operations detection data requires specialised OSINT providers.
  // Free options: GDELT (used in InfoOpsView component directly).
  // Paid/academic options:
  //   - Stanford Internet Observatory DFRLab datasets — Academic/research
  //   - Graphika reports (https://graphika.com) — PAID enterprise
  static async getInfoOps(_limit = 100): Promise<InfoOp[]> { return []; }

  // NOTE: Real-time Twitter/X data requires Twitter API v2 credentials.
  // Paid option: Twitter/X API Basic tier ($100/month) — https://developer.twitter.com/en/products/twitter-api
  // Free alternative: Set VITE_TWITTER_BEARER_TOKEN in .env for recent tweet search (limited free access).
  static async getUAETwitter(_limit = 100): Promise<UAETwitter[]> { return []; }

  static async getUnifiedAlerts(_options = {}): Promise<UnifiedAlert[]> {
    try {
      const { data, error } = await supabase
        .from('unified_alerts')
        .select('*')
        .eq('lifecycle_state', 'active')
        .order('effective_time', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as UnifiedAlert[];
    } catch {
      return [];
    }
  }

  static async getFusedAlerts(_options = {}): Promise<FusedAlert[]> {
    try {
      const { data, error } = await supabase
        .from('fused_alerts')
        .select('*')
        .eq('lifecycle_state', 'active')
        .order('priority_score', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FusedAlert[];
    } catch {
      return [];
    }
  }

  static async getPollState(): Promise<PollState[]> {
    try {
      const { data, error } = await supabase
        .from('alert_poll_state')
        .select('*')
        .order('source');
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        source: r.source,
        last_fetch_at: r.last_fetch_at,
        last_success_at: r.last_success_at,
        last_payload_hash: r.last_payload_hash,
        consecutive_failures: r.consecutive_failures ?? 0,
        next_retry_at: r.next_retry_at,
        last_error: r.last_error,
        total_fetches: r.total_fetches ?? 0,
        total_changes: r.total_changes ?? 0,
        updated_at: r.updated_at,
      }));
    } catch {
      return [];
    }
  }

  static async getPollLog(limit = 100): Promise<PollLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('alert_poll_log')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        source: r.source,
        fetched_at: r.fetched_at,
        success: r.success,
        changed: r.changed,
        alerts_written: r.alerts_written ?? 0,
        error: r.error,
        duration_ms: r.duration_ms,
      }));
    } catch {
      return [];
    }
  }

  static async getIngestionStats(days = 7): Promise<IngestionStat[]> {
    try {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('ingestion_stats')
        .select('*')
        .gte('day', since)
        .order('day', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        source: r.source,
        day: r.day,
        total_fetches: Number(r.total_fetches ?? 0),
        successful_fetches: Number(r.successful_fetches ?? 0),
        failed_fetches: Number(r.failed_fetches ?? 0),
        success_rate: r.success_rate != null ? Number(r.success_rate) : null,
        total_alerts_written: Number(r.total_alerts_written ?? 0),
        avg_duration_ms: r.avg_duration_ms != null ? Number(r.avg_duration_ms) : null,
        last_fetch_at: r.last_fetch_at,
        last_success_at: r.last_success_at,
        last_error: r.last_error,
        consecutive_failures: r.consecutive_failures ?? 0,
        lifetime_fetches: Number(r.lifetime_fetches ?? 0),
        lifetime_changes: Number(r.lifetime_changes ?? 0),
      }));
    } catch {
      return [];
    }
  }

  static async getSystemMetrics(names: string[], hours = 24): Promise<SystemMetric[]> {
    try {
      const since = new Date(Date.now() - hours * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .in('metric_name', names)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        metric_name: r.metric_name,
        source: r.source,
        value: Number(r.value),
        recorded_at: r.recorded_at,
      }));
    } catch {
      return [];
    }
  }

  static async getAlertLifecycleCounts(): Promise<LifecycleCounts> {
    try {
      const { data, error } = await supabase
        .from('unified_alerts')
        .select('lifecycle_state');
      if (error) throw error;
      const rows: any[] = data ?? [];
      return {
        active:  rows.filter(r => r.lifecycle_state === 'active').length,
        updated: rows.filter(r => r.lifecycle_state === 'updated').length,
        expired: rows.filter(r => r.lifecycle_state === 'expired').length,
      };
    } catch {
      return { active: 0, updated: 0, expired: 0 };
    }
  }

  static async getLastSyncTime(): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('alert_poll_state')
        .select('last_success_at')
        .order('last_success_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.last_success_at ?? null;
    } catch {
      return null;
    }
  }

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
