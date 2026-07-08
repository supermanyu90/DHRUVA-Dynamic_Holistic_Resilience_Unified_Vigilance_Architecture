/**
 * fetch-imd-warnings
 *
 * Server-side proxy for the India Meteorological Department (IMD) district
 * warning API. Runs server-side for two reasons:
 *   1. api.imd.gov.in sends NO CORS headers, so the browser cannot call it.
 *   2. The API requires secret credentials that must never ship in client JS.
 *
 * IMD auth (verified against the live endpoint) requires BOTH:
 *   x-api-key:     <IMD_API_KEY>
 *   Authorization: Bearer <IMD_JWT_TOKEN>
 * Configure them as Supabase secrets:
 *   supabase secrets set IMD_API_KEY=...  IMD_JWT_TOKEN=...
 *
 * Source endpoint: GET https://api.imd.gov.in/api/v1/districtwarning
 * Response is a list of district objects with fields:
 *   Obj_id | Date | UTC | District | Day_1..Day_5 (warning codes)
 *                                   | Day1_Color..Day5_Color (severity)
 *
 * ── Severity colour codes for THIS endpoint (districtwarning) ──
 *   "1" = Red    (#FF0000)   <- most severe
 *   "2" = Orange (#FFA500)
 *   "3" = Yellow (#FFFF00)
 *   "4" = Green  (#7CFC00)
 * NOTE: the nowcast endpoints use the REVERSE order (1=Green..4=Red).
 *       This function only handles districtwarning, so it uses the map above.
 *
 * This function returns ONLY Orange and Red warnings — every green/yellow
 * value is dropped server-side, so the client never receives them.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const IMD_URL = 'https://api.imd.gov.in/api/v1/districtwarning';
const FETCH_TIMEOUT_MS = 15_000;

// districtwarning severity code -> normalized severity. Only these two are kept.
const SEVERITY_BY_CODE: Record<string, 'red' | 'orange'> = {
  '1': 'red',
  '2': 'orange',
};
const HEX_BY_SEVERITY = { red: '#FF0000', orange: '#FFA500' } as const;

// Best-effort labels for IMD district warning codes. Colour is authoritative
// for severity; this only adds human-readable context. Unknown codes fall back.
const WARNING_LABELS: Record<string, string> = {
  '1': 'No warning',
  '2': 'Heavy rain',
  '3': 'Heavy to very heavy rain',
  '4': 'Very heavy rain',
  '5': 'Extremely heavy rain',
  '6': 'Thunderstorm & lightning',
  '7': 'Thunderstorm, lightning & gusty winds',
  '8': 'Dust storm',
  '9': 'Dust raising winds',
  '10': 'Hailstorm',
  '11': 'Cold wave',
  '12': 'Heat wave',
  '13': 'Hot & humid weather',
  '14': 'Ground frost',
  '15': 'Fog',
  '16': 'Snowfall',
  '17': 'Extremely heavy rain',
};

interface DayWarning {
  day: number;          // 1..5
  severity: 'red' | 'orange';
  colorHex: string;
  code: string;
  label: string;
}

interface DistrictWarning {
  objId: string | number | null;
  district: string;
  date: string | null;
  utc: string | null;
  worstSeverity: 'red' | 'orange';
  days: DayWarning[];   // only the orange/red days, ordered by day
}

// Read a field case-insensitively (IMD casing has been observed to drift).
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] != null) return row[k];
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] != null) return row[found];
  }
  return null;
}

function normalizeColor(raw: unknown): 'red' | 'orange' | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  // Numeric code form ("1".."4")
  if (SEVERITY_BY_CODE[s]) return SEVERITY_BY_CODE[s];
  // Hex form (defensive — this endpoint uses codes, but guard anyway)
  if (s === '#ff0000' || s === 'red') return 'red';
  if (s === '#ffa500' || s === 'orange') return 'orange';
  return null; // green / yellow / unknown -> dropped
}

function toDistrictWarning(row: Record<string, unknown>): DistrictWarning | null {
  const district = String(pick(row, 'District', 'district') ?? '').trim();
  const days: DayWarning[] = [];

  for (let d = 1; d <= 5; d++) {
    const severity = normalizeColor(pick(row, `Day${d}_Color`, `day${d}_color`));
    if (!severity) continue; // keep only orange/red days
    const code = String(pick(row, `Day_${d}`, `day_${d}`, `Day${d}`) ?? '').trim();
    days.push({
      day: d,
      severity,
      colorHex: HEX_BY_SEVERITY[severity],
      code,
      label: WARNING_LABELS[code] ?? (code ? `Warning code ${code}` : 'Weather warning'),
    });
  }

  if (days.length === 0) return null; // no orange/red -> exclude entirely

  const worstSeverity: 'red' | 'orange' = days.some((x) => x.severity === 'red') ? 'red' : 'orange';

  return {
    objId: (pick(row, 'Obj_id', 'Obj_Id', 'obj_id') as string | number | null) ?? null,
    district,
    date: (pick(row, 'Date', 'date') as string | null) ?? null,
    utc: (pick(row, 'UTC', 'utc') as string | null) ?? null,
    worstSeverity,
    days,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('IMD_API_KEY');
  const jwt = Deno.env.get('IMD_JWT_TOKEN');

  if (!apiKey || !jwt) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'not_configured',
        message:
          'IMD credentials missing. Set IMD_API_KEY and IMD_JWT_TOKEN as Supabase secrets.',
        warnings: [],
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(IMD_URL, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/json',
          'User-Agent': 'DHRUVA/1.0 (+resilience-dashboard)',
        },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(tid);
    }

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      const authError = upstream.status === 401 || upstream.status === 403;
      return new Response(
        JSON.stringify({
          ok: false,
          error: authError ? 'auth_failed' : 'upstream_error',
          message: authError
            ? `IMD rejected the credentials (HTTP ${upstream.status}). The JWT token may be expired — refresh IMD_JWT_TOKEN.`
            : `IMD upstream returned HTTP ${upstream.status}.`,
          detail: body.slice(0, 300),
          warnings: [],
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await upstream.json();
    // The endpoint may return a bare array or wrap it in { data: [...] }.
    const rows: Record<string, unknown>[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    const warnings = rows
      .map(toDistrictWarning)
      .filter((w): w is DistrictWarning => w !== null)
      // Red districts first, then Orange, alphabetical within a tier.
      .sort((a, b) => {
        if (a.worstSeverity !== b.worstSeverity) return a.worstSeverity === 'red' ? -1 : 1;
        return a.district.localeCompare(b.district);
      });

    const counts = {
      red: warnings.filter((w) => w.worstSeverity === 'red').length,
      orange: warnings.filter((w) => w.worstSeverity === 'orange').length,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'IMD districtwarning',
        fetchedAt: new Date().toISOString(),
        counts,
        total: warnings.length,
        warnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        ok: false,
        error: aborted ? 'timeout' : 'fetch_failed',
        message: aborted ? 'IMD request timed out.' : String(err),
        warnings: [],
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
