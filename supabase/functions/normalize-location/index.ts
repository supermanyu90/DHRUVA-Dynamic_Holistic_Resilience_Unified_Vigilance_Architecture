/**
 * normalize-location
 *
 * Resolves latitude/longitude for unified_alerts rows that are missing coordinates.
 *
 * Strategy per source:
 *
 * SACHET
 *   1. If the alert already has a polygon  → centroid already set by ingest; skip.
 *   2. Extract district/state tokens from: district column, state column,
 *      location_name, description.
 *   3. Look up each token in india_locations (district match first, state fallback).
 *   4. If multiple distinct districts resolve → compute centroid and store a
 *      merged geometry (MultiPoint).
 *   5. Write latitude, longitude, geometry back to unified_alerts.
 *
 * GDACS
 *   1. Coordinates are supplied by the feed; this function is a no-op for
 *      rows that already have lat/lon.
 *   2. For rare GDACS rows without coordinates, attempt to derive them from
 *      the country field using a static country→centroid table.
 *
 * The function is idempotent and processes only rows where latitude IS NULL.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationRow {
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  level: 'district' | 'state';
}

interface AlertRow {
  id: string;
  source: 'GDACS' | 'SACHET';
  location_name: string;
  country: string;
  state: string;
  district: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  geometry: Record<string, unknown> | null;
}

interface Resolved {
  latitude: number;
  longitude: number;
  geometry: Record<string, unknown> | null;
  district: string;
  state: string;
}

// ─── Country centroid fallback (for GDACS rows without coordinates) ───────────

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  'india': [20.5937, 78.9629],
  'pakistan': [30.3753, 69.3451],
  'bangladesh': [23.6850, 90.3563],
  'nepal': [28.3949, 84.1240],
  'sri lanka': [7.8731, 80.7718],
  'myanmar': [21.9162, 95.9560],
  'afghanistan': [33.9391, 67.7100],
  'china': [35.8617, 104.1954],
  'indonesia': [-0.7893, 113.9213],
  'philippines': [12.8797, 121.7740],
  'japan': [36.2048, 138.2529],
  'vietnam': [14.0583, 108.2772],
  'thailand': [15.8700, 100.9925],
  'malaysia': [4.2105, 101.9758],
  'iran': [32.4279, 53.6880],
  'turkey': [38.9637, 35.2433],
  'iraq': [33.2232, 43.6793],
  'saudi arabia': [23.8859, 45.0792],
  'kenya': [-0.0236, 37.9062],
  'ethiopia': [9.1450, 40.4897],
  'nigeria': [9.0820, 8.6753],
  'south africa': [-30.5595, 22.9375],
  'egypt': [26.8206, 30.8025],
  'mozambique': [-18.6657, 35.5296],
  'somalia': [5.1521, 46.1996],
  'madagascar': [-18.7669, 46.8691],
  'australia': [-25.2744, 133.7751],
  'usa': [37.0902, -95.7129],
  'united states': [37.0902, -95.7129],
  'mexico': [23.6345, -102.5528],
  'brazil': [-14.2350, -51.9253],
  'colombia': [4.5709, -74.2973],
  'peru': [-9.1900, -75.0152],
  'haiti': [18.9712, -72.2852],
  'cuba': [21.5218, -77.7812],
  'honduras': [15.1999, -86.2419],
  'guatemala': [15.7835, -90.2308],
  'el salvador': [13.7942, -88.8965],
  'nicaragua': [12.8654, -85.2072],
  'ecuador': [-1.8312, -78.1834],
  'chile': [-35.6751, -71.5430],
  'argentina': [-38.4161, -63.6167],
  'venezuela': [6.4238, -66.5897],
};

// ─── Text tokeniser ───────────────────────────────────────────────────────────

/**
 * Extract candidate district/state names from a free-text string.
 * Returns lowercase, deduplicated, non-empty tokens of 3+ chars.
 */
function extractLocationTokens(text: string): string[] {
  if (!text) return [];
  // Split on common separators and punctuation; keep multi-word phrases
  const raw = text
    .toLowerCase()
    .replace(/[^\w\s,;\/\-]/g, ' ')
    .split(/[,;\/\n\r]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3);

  // Also add whole phrases and individual words > 3 chars
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  return Array.from(new Set([...raw, ...words]));
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Score a candidate token against a stored location name.
 * Returns a score 0–3:
 *   3 = exact match
 *   2 = stored name starts with token (prefix match)
 *   1 = token contains stored name or vice-versa
 *   0 = no match
 */
function matchScore(token: string, stored: string): number {
  if (token === stored) return 3;
  if (stored.startsWith(token) || token.startsWith(stored)) return 2;
  if (stored.includes(token) || token.includes(stored)) return 1;
  return 0;
}

interface LookupResult extends LocationRow {
  score: number;
}

function findBestMatch(tokens: string[], locations: LocationRow[]): LookupResult | null {
  let best: LookupResult | null = null;

  for (const loc of locations) {
    for (const token of tokens) {
      const ds = loc.level === 'district' ? matchScore(token, loc.district) : 0;
      const ss = matchScore(token, loc.state);
      // Districts outrank states; add a bonus for district match
      const score = loc.level === 'district' ? ds * 2 + ss : ss;
      if (score > 0 && (!best || score > best.score)) {
        best = { ...loc, score };
      }
    }
  }

  return best;
}

// ─── Multi-district centroid ──────────────────────────────────────────────────

function computeCentroid(points: Array<[number, number]>): [number, number] {
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lon = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [lat, lon];
}

// ─── Main resolver ────────────────────────────────────────────────────────────

function resolveSACHET(alert: AlertRow, locations: LocationRow[]): Resolved | null {
  // If the ingest already set coordinates (from polygon), trust them
  if (alert.latitude != null && alert.longitude != null) return null;

  // Build candidate tokens from all text fields
  const candidateTexts = [alert.district, alert.state, alert.location_name, alert.description];
  const tokens = Array.from(new Set(candidateTexts.flatMap(extractLocationTokens)));

  if (!tokens.length) return null;

  // Collect all matching district-level results (for multi-district centroid)
  const districtMatches: LookupResult[] = [];

  for (const loc of locations) {
    if (loc.level !== 'district') continue;
    for (const token of tokens) {
      const ds = matchScore(token, loc.district);
      if (ds > 0) {
        const existing = districtMatches.find(m => m.district === loc.district && m.state === loc.state);
        if (!existing || ds > existing.score) {
          const idx = districtMatches.findIndex(m => m.district === loc.district && m.state === loc.state);
          const entry = { ...loc, score: ds };
          if (idx >= 0) districtMatches[idx] = entry;
          else districtMatches.push(entry);
        }
      }
    }
  }

  // Deduplicate by (district, state) pair
  const unique = districtMatches.filter(
    (m, i, arr) => arr.findIndex(x => x.district === m.district && x.state === m.state) === i
  );

  if (unique.length === 0) {
    // Fall back to state-level match
    const stateBest = findBestMatch(tokens, locations.filter(l => l.level === 'state'));
    if (!stateBest) return null;
    return {
      latitude: stateBest.latitude,
      longitude: stateBest.longitude,
      geometry: { type: 'Point', coordinates: [stateBest.longitude, stateBest.latitude] },
      district: stateBest.district,
      state: stateBest.state,
    };
  }

  if (unique.length === 1) {
    const m = unique[0];
    return {
      latitude: m.latitude,
      longitude: m.longitude,
      geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
      district: m.district,
      state: m.state,
    };
  }

  // Multiple districts → centroid + MultiPoint geometry
  const points = unique.map(m => [m.latitude, m.longitude] as [number, number]);
  const [clat, clon] = computeCentroid(points);
  return {
    latitude: clat,
    longitude: clon,
    geometry: {
      type: 'MultiPoint',
      coordinates: unique.map(m => [m.longitude, m.latitude]),
    },
    district: unique.map(m => m.district).join(', '),
    state: unique[0].state,
  };
}

function resolveGDACS(alert: AlertRow): Resolved | null {
  if (alert.latitude != null && alert.longitude != null) return null;
  const countryKey = (alert.country || '').toLowerCase().trim();
  const coords = COUNTRY_CENTROIDS[countryKey];
  if (!coords) return null;
  return {
    latitude: coords[0],
    longitude: coords[1],
    geometry: { type: 'Point', coordinates: [coords[1], coords[0]] },
    district: '',
    state: '',
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load the full india_locations table once (small, ~800 rows)
    const { data: locationRows, error: locErr } = await supabase
      .from('india_locations')
      .select('district, state, latitude, longitude, level');
    if (locErr) throw locErr;
    const locations: LocationRow[] = locationRows || [];

    // Fetch alerts missing coordinates (process up to 500 at a time)
    const { data: alerts, error: alertErr } = await supabase
      .from('unified_alerts')
      .select('id, source, location_name, country, state, district, description, latitude, longitude, geometry')
      .is('latitude', null)
      .order('created_at', { ascending: true })
      .limit(500);
    if (alertErr) throw alertErr;

    const rows = (alerts || []) as AlertRow[];
    let resolved = 0;
    let skipped  = 0;

    const updates: Array<{
      id: string;
      latitude: number;
      longitude: number;
      geometry: Record<string, unknown> | null;
      district: string;
      state: string;
    }> = [];

    for (const alert of rows) {
      const result =
        alert.source === 'SACHET' ? resolveSACHET(alert, locations)
        : resolveGDACS(alert);

      if (result) {
        updates.push({
          id: alert.id,
          latitude: result.latitude,
          longitude: result.longitude,
          geometry: result.geometry,
          district: result.district || alert.district,
          state: result.state || alert.state,
        });
        resolved++;
      } else {
        skipped++;
      }
    }

    // Apply updates in batches of 50
    const BATCH = 50;
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH);
      await Promise.all(
        batch.map(({ id, latitude, longitude, geometry, district, state }) =>
          supabase
            .from('unified_alerts')
            .update({ latitude, longitude, geometry, district, state })
            .eq('id', id)
        )
      );
    }

    return new Response(
      JSON.stringify({ ok: true, processed: rows.length, resolved, skipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
