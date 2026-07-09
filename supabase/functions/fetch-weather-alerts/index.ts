/**
 * fetch-weather-alerts
 *
 * Free, no-credentials weather/hydro-meteorological alert feed for the map and
 * the WEATHER ALERTS tab. Source: GDACS (Global Disaster Alert & Coordination
 * System), which is public, global, needs no API key, uses the Green/Orange/Red
 * alert scheme, and ships coordinates — so no geocoding is required.
 *
 * Runs server-side only because GDACS sends no CORS headers (the browser can't
 * call it cross-origin). No secrets involved.
 *
 * This function returns ONLY Orange and Red alerts — Green is dropped
 * server-side, so the client never receives it. It is also scoped to
 * weather/climate hazards (tropical cyclone, flood, drought, wildfire);
 * earthquakes and volcanoes are excluded because the app has dedicated layers
 * for those.
 *
 * Upstream: GET https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP
 *   → GeoJSON FeatureCollection. IMPORTANT: the feed emits MANY features per
 *     event (track points, cones, wind polygons, lines). Only the single
 *     `Class: "Point_Centroid"` feature is the clean one-point-per-event marker
 *     with a valid Point geometry, so we keep only those (this both dedupes
 *     events and guarantees coordinates). Its properties include: eventtype,
 *     eventid, episodeid, alertlevel, name, country, fromdate, todate, url,
 *     severitydata{severitytext}.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP';
const FETCH_TIMEOUT_MS = 20_000;

// Weather / hydro-meteorological hazards only. EQ and VO are covered by the
// app's own earthquake / volcano layers, so they are excluded here.
const EVENT_LABELS: Record<string, string> = {
  TC: 'Tropical Cyclone',
  FL: 'Flood',
  DR: 'Drought',
  WF: 'Wildfire',
};
const WEATHER_TYPES = new Set(Object.keys(EVENT_LABELS));

// GDACS alertlevel -> normalized severity. Only these two are kept.
const SEVERITY_BY_LEVEL: Record<string, 'red' | 'orange'> = {
  red: 'red',
  orange: 'orange',
};

interface WeatherAlert {
  id: string;
  eventType: string;
  eventLabel: string;
  title: string;
  country: string;
  severity: 'red' | 'orange';
  severityText: string;
  fromDate: string | null;
  toDate: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GdacsFeature {
  geometry?: { coordinates?: [number, number] } | null;
  properties?: Record<string, unknown> | null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function toAlert(feature: GdacsFeature): WeatherAlert | null {
  const p = feature.properties;
  if (!p) return null;

  // Keep only the single centroid marker per event (see file header).
  if (str(p.Class) !== 'Point_Centroid') return null;

  const eventType = str(p.eventtype).toUpperCase();
  if (!WEATHER_TYPES.has(eventType)) return null;

  const severity = SEVERITY_BY_LEVEL[str(p.alertlevel).toLowerCase()];
  if (!severity) return null; // Green / unknown -> dropped

  const coords = feature.geometry?.coordinates;
  const lon = Array.isArray(coords) && Number.isFinite(coords[0]) ? coords[0] : null;
  const lat = Array.isArray(coords) && Number.isFinite(coords[1]) ? coords[1] : null;

  const sevData = p.severitydata as { severitytext?: string } | null | undefined;
  const severityText = str(sevData?.severitytext).replace(/\s+/g, ' ');

  return {
    id: `${eventType}-${str(p.eventid)}-${str(p.episodeid)}`,
    eventType,
    eventLabel: EVENT_LABELS[eventType] ?? eventType,
    title: str(p.name) || str(p.eventname) || str(p.description) || EVENT_LABELS[eventType] || 'Weather alert',
    country: str(p.country),
    severity,
    severityText: /^magnitude 0\b/i.test(severityText) ? '' : severityText,
    fromDate: str(p.fromdate) || null,
    toDate: str(p.todate) || null,
    url: str(p.url) || null,
    latitude: lat,
    longitude: lon,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(GDACS_URL, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'DHRUVA/1.0 (+resilience-dashboard)' },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(tid);
    }

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'upstream_error',
          message: `GDACS upstream returned HTTP ${upstream.status}.`,
          alerts: [],
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await upstream.json();
    const features: GdacsFeature[] = Array.isArray(payload?.features) ? payload.features : [];

    // Dedupe by event id (safety net — Point_Centroid is normally one per event),
    // keeping the more severe entry if the same event ever appears twice.
    const byId = new Map<string, WeatherAlert>();
    for (const feature of features) {
      const a = toAlert(feature);
      if (!a) continue;
      const existing = byId.get(a.id);
      if (!existing || (a.severity === 'red' && existing.severity === 'orange')) byId.set(a.id, a);
    }

    const alerts = [...byId.values()]
      // Red first, then Orange; most-recent first within a tier.
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'red' ? -1 : 1;
        return (b.fromDate ?? '').localeCompare(a.fromDate ?? '');
      });

    const counts = {
      red: alerts.filter((a) => a.severity === 'red').length,
      orange: alerts.filter((a) => a.severity === 'orange').length,
      geocoded: alerts.filter((a) => a.latitude != null && a.longitude != null).length,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'GDACS',
        fetchedAt: new Date().toISOString(),
        counts,
        total: alerts.length,
        alerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        ok: false,
        error: aborted ? 'timeout' : 'fetch_failed',
        message: aborted ? 'GDACS request timed out.' : String(err),
        alerts: [],
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
