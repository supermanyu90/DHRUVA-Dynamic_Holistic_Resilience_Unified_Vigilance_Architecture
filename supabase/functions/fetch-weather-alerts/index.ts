/**
 * fetch-weather-alerts
 *
 * Free, no-credentials weather alert feed for the map and the WEATHER ALERTS
 * tab. Source: SACHET (India's NDMA National Disaster Alert Portal), the
 * official CAP aggregator for IMD / state SDMA warnings. Public, no API key,
 * India-wide, colour-coded (green/yellow/orange/red), and ships a centroid per
 * alert — so no geocoding is required.
 *
 * Runs server-side only because SACHET sends no CORS headers (the browser can't
 * call it cross-origin). No secrets involved.
 *
 * This function returns ONLY Orange and Red alerts — green/yellow are dropped
 * server-side, so the client never receives them. Expired alerts are dropped too.
 *
 * Upstream: GET https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails
 *   → JSON array; each record has severity_color, disaster_type, area_description,
 *     centroid ("lon,lat"), effective_start_time / effective_end_time (Java date
 *     strings in IST), severity_level, alert_source, identifier.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SACHET_URL = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails';
const ALERT_URL = 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=';
const FETCH_TIMEOUT_MS = 20_000;

// SACHET severity_color -> normalized severity. Only these two are kept.
const SEVERITY_BY_COLOR: Record<string, 'red' | 'orange'> = { red: 'red', orange: 'orange' };

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

interface SachetRecord {
  identifier?: string;
  severity_color?: string;
  severity_level?: string;
  disaster_type?: string;
  area_description?: string;
  centroid?: string;         // "lon,lat"
  effective_start_time?: string;
  effective_end_time?: string;
  alert_source?: string;
}

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

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

/** Parse SACHET's Java date string ("Thu Jul 09 15:15:00 IST 2026") to ISO. */
function parseIST(s: string): string | null {
  const m = s.match(/\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+IST\s+(\d{4})/);
  if (!m) return null;
  const mo = MONTHS[m[1]];
  if (!mo) return null;
  return `${m[6]}-${mo}-${m[2].padStart(2, '0')}T${m[3]}:${m[4]}:${m[5]}+05:30`;
}

/** "Kerala SDMA" -> "Kerala"; "IMD Raipur" kept as-is. */
function region(source: string): string {
  return source.replace(/\s+SDMA$/i, '').trim() || 'India';
}

function toAlert(r: SachetRecord): WeatherAlert | null {
  const severity = SEVERITY_BY_COLOR[str(r.severity_color).toLowerCase()];
  if (!severity) return null; // green / yellow -> dropped

  const parts = str(r.centroid).split(',');
  const lon = parts.length === 2 ? Number(parts[0]) : NaN;
  const lat = parts.length === 2 ? Number(parts[1]) : NaN;

  const toDate = parseIST(str(r.effective_end_time));
  // Drop expired alerts.
  if (toDate && new Date(toDate).getTime() < Date.now()) return null;

  const disaster = str(r.disaster_type) || 'Weather Alert';
  const src = str(r.alert_source);
  const area = str(r.area_description);
  const id = str(r.identifier);

  return {
    id: id || `${disaster}-${r.centroid}`,
    eventType: disaster,
    eventLabel: disaster,
    title: area.slice(0, 120) || `${disaster} — ${region(src)}`,
    country: region(src),
    severity,
    severityText: [str(r.severity_level), src].filter(Boolean).join(' · '),
    fromDate: parseIST(str(r.effective_start_time)),
    toDate,
    url: id ? ALERT_URL + id : 'https://sachet.ndma.gov.in/',
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
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
      upstream = await fetch(SACHET_URL, {
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
          message: `SACHET upstream returned HTTP ${upstream.status}.`,
          alerts: [],
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await upstream.json();
    const records: SachetRecord[] = Array.isArray(payload) ? payload : [];

    // Dedupe by identifier, keeping the more severe if an id ever repeats.
    const byId = new Map<string, WeatherAlert>();
    for (const rec of records) {
      const a = toAlert(rec);
      if (!a) continue;
      const existing = byId.get(a.id);
      if (!existing || (a.severity === 'red' && existing.severity === 'orange')) byId.set(a.id, a);
    }

    const alerts = [...byId.values()].sort((a, b) => {
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
        source: 'SACHET (NDMA)',
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
        message: aborted ? 'SACHET request timed out.' : String(err),
        alerts: [],
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
