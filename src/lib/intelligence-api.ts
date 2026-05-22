const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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

// ── GDACS disaster feed parsing ───────────────────────────────────────────────

interface GDACSEntry {
  guid: string;
  title: string;
  'gdacs:eventtype': string;
  'gdacs:latitude': string;
  'gdacs:longitude': string;
  pubDate: string;
}

function gdacsEntryToDisaster(e: GDACSEntry): Disaster {
  return {
    id: e.guid,
    event_id: e.guid,
    title: e.title,
    category: e['gdacs:eventtype'] ?? 'unknown',
    latitude: parseFloat(e['gdacs:latitude'] ?? '0') || null,
    longitude: parseFloat(e['gdacs:longitude'] ?? '0') || null,
    event_date: e.pubDate ? new Date(e.pubDate).toISOString() : new Date().toISOString(),
    closed: false,
    properties: e as any,
  };
}

// ── Edge function helper ──────────────────────────────────────────────────────

async function callEdgeFunction<T>(slug: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${FUNCTIONS_URL}/${slug}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Edge function ${slug} returned ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? []);
}

// ── Public API ────────────────────────────────────────────────────────────────

export class IntelligenceAPI {
  static async getEarthquakes(minMagnitude = 0, limit = 100): Promise<Earthquake[]> {
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=${minMagnitude}&orderby=time&limit=${Math.min(limit, 200)}&starttime=${new Date(Date.now() - 7 * 86_400_000).toISOString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const json = await res.json();
    return (json.features as USGSFeature[]).map(usgsFeatureToEarthquake);
  }

  static async getDisasters(limit = 100): Promise<Disaster[]> {
    const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Green&fromDate=${new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0,10)}&toDate=${new Date().toISOString().slice(0,10)}&orderby=alertscore&pagesize=${Math.min(limit, 100)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`GDACS ${res.status}`);
    const json = await res.json();
    const items: GDACSEntry[] = json?.features ?? json?.Results ?? [];
    return items.map(gdacsEntryToDisaster);
  }

  static async getNews(limit = 100): Promise<NewsEvent[]> {
    try {
      return await callEdgeFunction<NewsEvent>('ingest-news-intel', { limit: String(limit) });
    } catch {
      return [];
    }
  }

  static async getVessels(limit = 100): Promise<Vessel[]> {
    try {
      return await callEdgeFunction<Vessel>('ingest-vessels', { limit: String(limit) });
    } catch {
      return [];
    }
  }

  static async getVolcanoes(limit = 100): Promise<VolcanoEvent[]> {
    try {
      return await callEdgeFunction<VolcanoEvent>('ingest-volcanoes', { limit: String(limit) });
    } catch {
      return [];
    }
  }

  static async getGeopoliticalEvents(limit = 100): Promise<GeopoliticalEvent[]> {
    try {
      return await callEdgeFunction<GeopoliticalEvent>('ingest-geopolitical', { limit: String(limit) });
    } catch {
      return [];
    }
  }

  static async getCyberThreats(_limit = 100): Promise<CyberThreat[]> { return []; }
  static async getBankEvents(_limit = 100): Promise<BankEvent[]> { return []; }
  static async getInfoOps(_limit = 100): Promise<InfoOp[]> { return []; }
  static async getUAETwitter(_limit = 100): Promise<UAETwitter[]> { return []; }
  static async getUnifiedAlerts(_options = {}): Promise<UnifiedAlert[]> { return []; }
  static async getFusedAlerts(_options = {}): Promise<FusedAlert[]> { return []; }
  static async getPollState(): Promise<PollState[]> { return []; }
  static async getPollLog(_limit = 100): Promise<PollLogEntry[]> { return []; }
  static async getIngestionStats(_days = 7): Promise<IngestionStat[]> { return []; }
  static async getSystemMetrics(_names: string[], _hours = 24): Promise<SystemMetric[]> { return []; }
  static async getAlertLifecycleCounts(): Promise<LifecycleCounts> { return { active: 0, updated: 0, expired: 0 }; }
  static async getLastSyncTime(): Promise<string | null> { return null; }

  static async triggerDataSync(): Promise<void> {
    await fetch(`${FUNCTIONS_URL}/scheduler`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ANON_KEY}` },
    });
  }

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
