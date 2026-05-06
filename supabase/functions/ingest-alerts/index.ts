/**
 * ingest-alerts
 *
 * Intelligent polling engine for GDACS and SACHET alert feeds.
 *
 * Features:
 *   - Per-source change detection: SHA-256 hash of raw payload; skips
 *     processing when nothing changed.
 *   - Exponential backoff: after N consecutive failures the source is
 *     gated until next_retry_at; other sources continue unaffected.
 *   - Persistent state: alert_poll_state + alert_poll_log tables.
 *   - Isolation: one source failing never stops the other.
 *
 * Invocation:
 *   POST /ingest-alerts
 *   Body (optional): { "sources": ["GDACS", "SACHET"] }
 *   Omitting body runs both sources.
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ─── Backoff config ───────────────────────────────────────────────────────────

const BACKOFF_BASE_MS   = 60_000;   // 1 min base
const BACKOFF_MAX_MS    = 900_000;  // 15 min cap
const BACKOFF_EXPONENT  = 2;

function nextRetryDelay(consecutiveFailures: number): number {
  const delay = BACKOFF_BASE_MS * Math.pow(BACKOFF_EXPONENT, consecutiveFailures - 1);
  return Math.min(delay, BACKOFF_MAX_MS);
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface UnifiedAlert {
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
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

function xmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'));
  return m ? m[1].trim() : '';
}

function splitBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) blocks.push(m[0]);
  return blocks;
}

// ─── Event-type normalisation ─────────────────────────────────────────────────

function normaliseEventType(raw: string): string {
  const r = (raw || '').toLowerCase();
  if (r.includes('cyclone') || r.includes('tc') || r.includes('tropical')) return 'cyclone';
  if (r.includes('flood') || r === 'fl') return 'flood';
  if (r.includes('earthquake') || r === 'eq') return 'earthquake';
  if (r.includes('volcano') || r === 'vo') return 'volcano';
  if (r.includes('wildfire') || r.includes('fire') || r === 'wf') return 'wildfire';
  if (r.includes('drought') || r === 'dr') return 'drought';
  if (r.includes('storm') || r.includes('landslide') || r.includes('ls')) return 'landslide';
  if (r.includes('heat') || r.includes('heatwave')) return 'heatwave';
  if (r.includes('cold') || r.includes('cold wave')) return 'cold_wave';
  if (r.includes('tsunami') || r === 'ts') return 'tsunami';
  if (r.includes('lightning')) return 'lightning';
  return r.replace(/\s+/g, '_');
}

// ─── GDACS parser ─────────────────────────────────────────────────────────────

function gdacsSeverity(alertLevel: string): 'low' | 'moderate' | 'high' {
  const l = (alertLevel || '').toLowerCase();
  if (l === 'red') return 'high';
  if (l === 'orange') return 'moderate';
  return 'low';
}

function parseGDACS(xml: string): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];
  for (const item of splitBlocks(xml, 'item')) {
    try {
      const eventId    = xmlText(item, 'gdacs:eventid') || xmlAttr(item, 'gdacs:eventid', 'id');
      if (!eventId) continue;

      const eventType  = xmlText(item, 'gdacs:eventtype') || xmlText(item, 'gdacs:eventType');
      const alertLevel = xmlText(item, 'gdacs:alertlevel') || xmlText(item, 'gdacs:alertLevel');
      const country    = xmlText(item, 'gdacs:country');
      const title      = xmlText(item, 'title');
      const desc       = xmlText(item, 'description');
      const pubDate    = xmlText(item, 'pubDate');
      const population = parseInt(xmlText(item, 'gdacs:population') || '0', 10) || null;
      const expiryRaw  = xmlText(item, 'gdacs:todate') || xmlText(item, 'gdacs:expiredate');

      let lat: number | null = null;
      let lon: number | null = null;
      const geoPoint = xmlText(item, 'georss:point');
      if (geoPoint) {
        const [a, b] = geoPoint.trim().split(/\s+/);
        lat = parseFloat(a); lon = parseFloat(b);
      } else {
        const la = xmlText(item, 'geo:lat') || xmlText(item, 'gdacs:latitude');
        const lo = xmlText(item, 'geo:long') || xmlText(item, 'gdacs:longitude');
        if (la) lat = parseFloat(la);
        if (lo) lon = parseFloat(lo);
      }

      alerts.push({
        alert_id: `GDACS:${eventId}`,
        source: 'GDACS',
        event_type: normaliseEventType(eventType || title),
        severity: gdacsSeverity(alertLevel),
        urgency: 'expected',
        certainty: 'observed',
        alert_level: alertLevel ? alertLevel.toLowerCase() : null,
        location_name: title,
        country,
        state: '',
        district: '',
        latitude: lat !== null && !isNaN(lat) ? lat : null,
        longitude: lon !== null && !isNaN(lon) ? lon : null,
        geometry: null,
        population_impact: population !== null && !isNaN(population) ? population : null,
        effective_time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        expiry_time: expiryRaw ? new Date(expiryRaw).toISOString() : null,
        description: desc,
        raw_payload: { item: item.slice(0, 4000) },
      });
    } catch { /* skip malformed item */ }
  }
  return alerts;
}

// ─── SACHET parser ────────────────────────────────────────────────────────────

function parseSACHET(xml: string): UnifiedAlert[] {
  const alerts: UnifiedAlert[] = [];
  for (const block of splitBlocks(xml, 'alert')) {
    try {
      const identifier = xmlText(block, 'identifier');
      const sent       = xmlText(block, 'sent');
      const status     = xmlText(block, 'status');
      const msgType    = xmlText(block, 'msgType');
      if (!identifier || status === 'Test') continue;

      const infoBlocks = splitBlocks(block, 'info');
      if (!infoBlocks.length) continue;
      const infoBlock = infoBlocks.find(b => xmlText(b, 'language').toLowerCase().startsWith('en')) || infoBlocks[0];

      const event       = xmlText(infoBlock, 'event');
      const headline    = xmlText(infoBlock, 'headline');
      const description = xmlText(infoBlock, 'description');
      const urgency     = xmlText(infoBlock, 'urgency').toLowerCase() || 'unknown';
      const severity    = xmlText(infoBlock, 'severity').toLowerCase();
      const certainty   = xmlText(infoBlock, 'certainty');
      const effective   = xmlText(infoBlock, 'effective') || sent;
      const expires     = xmlText(infoBlock, 'expires');

      const areaBlock = splitBlocks(infoBlock, 'area')[0] || '';
      const areaDesc  = xmlText(areaBlock, 'areaDesc');
      const polygon   = xmlText(areaBlock, 'polygon');
      const gcBlocks  = splitBlocks(areaBlock, 'geocode');

      let state = '', district = '';
      for (const gc of gcBlocks) {
        const name = xmlText(gc, 'valueName');
        const val  = xmlText(gc, 'value');
        if (name === 'state')    state    = val;
        if (name === 'district') district = val;
      }

      let lat: number | null = null;
      let lon: number | null = null;
      let geometry: Record<string, unknown> | null = null;
      if (polygon) {
        const pairs = polygon.trim().split(/\s+/);
        const coords = pairs.map(p => {
          const [a, b] = p.split(',');
          return [parseFloat(b), parseFloat(a)] as [number, number];
        }).filter(([a, b]) => !isNaN(a) && !isNaN(b));
        if (coords.length) {
          lat = coords.reduce((s, [, la]) => s + la, 0) / coords.length;
          lon = coords.reduce((s, [lo]) => s + lo, 0) / coords.length;
          geometry = { type: 'Polygon', coordinates: [coords] };
        }
      }

      let normSeverity: 'low' | 'moderate' | 'high' = 'low';
      if (severity === 'extreme' || severity === 'severe') normSeverity = 'high';
      else if (severity === 'moderate') normSeverity = 'moderate';

      alerts.push({
        alert_id: `SACHET:${identifier}`,
        source: 'SACHET',
        event_type: normaliseEventType(event || headline),
        severity: normSeverity,
        urgency,
        certainty,
        alert_level: null,
        location_name: headline || areaDesc,
        country: 'India',
        state,
        district,
        latitude: lat,
        longitude: lon,
        geometry,
        population_impact: null,
        effective_time: effective ? new Date(effective).toISOString() : new Date().toISOString(),
        expiry_time: expires ? new Date(expires).toISOString() : null,
        description: description || headline,
        raw_payload: { identifier, sent, msgType, event, areaDesc, polygon },
      });
    } catch { /* skip malformed alert */ }
  }
  return alerts;
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 20_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Per-source poll ──────────────────────────────────────────────────────────

interface PollResult {
  source: 'GDACS' | 'SACHET';
  success: boolean;
  changed: boolean;
  skipped: boolean;   // true when backoff gate prevented this run
  alertsWritten: number;
  error: string | null;
  durationMs: number;
}

async function pollSource(
  source: 'GDACS' | 'SACHET',
  supabase: SupabaseClient,
): Promise<PollResult> {
  const t0 = Date.now();

  // Load current poll state
  const { data: stateRow } = await supabase
    .from('alert_poll_state')
    .select('*')
    .eq('source', source)
    .maybeSingle();

  const state = stateRow ?? {
    source,
    last_payload_hash: null,
    consecutive_failures: 0,
    next_retry_at: new Date(0).toISOString(),
  };

  // Backoff gate — respect next_retry_at
  if (state.next_retry_at && new Date(state.next_retry_at) > new Date()) {
    return { source, success: false, changed: false, skipped: true, alertsWritten: 0, error: 'backoff', durationMs: 0 };
  }

  const feedUrl = source === 'GDACS'
    ? 'https://www.gdacs.org/xml/rss.xml'
    : 'https://sachet.ndma.gov.in/CapFeed';

  const fetchHeaders: Record<string, string> = {
    'User-Agent': 'DhruvaIntelligence/1.0',
    'Accept': 'application/xml, text/xml, */*',
  };

  let rawXml = '';
  try {
    const res = await fetchWithTimeout(feedUrl, fetchHeaders);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    rawXml = await res.text();
  } catch (e: any) {
    const failures = (state.consecutive_failures ?? 0) + 1;
    const delay    = nextRetryDelay(failures);
    const nextRetry = new Date(Date.now() + delay).toISOString();

    await supabase.from('alert_poll_state').upsert({
      source,
      last_fetch_at: new Date().toISOString(),
      consecutive_failures: failures,
      next_retry_at: nextRetry,
      last_error: e.message,
      total_fetches: (state.total_fetches ?? 0) + 1,
    }, { onConflict: 'source' });

    const dur = Date.now() - t0;
    await supabase.from('alert_poll_log').insert({
      source, fetched_at: new Date().toISOString(),
      success: false, changed: false, alerts_written: 0,
      error: e.message, duration_ms: dur,
    });

    return { source, success: false, changed: false, skipped: false, alertsWritten: 0, error: e.message, durationMs: dur };
  }

  // Change detection
  const newHash = await sha256hex(rawXml);
  const changed = newHash !== state.last_payload_hash;

  if (!changed) {
    // Payload unchanged — update timestamp only, no processing needed
    await supabase.from('alert_poll_state').upsert({
      source,
      last_fetch_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      consecutive_failures: 0,
      next_retry_at: new Date().toISOString(),
      last_error: null,
      total_fetches: (state.total_fetches ?? 0) + 1,
    }, { onConflict: 'source' });

    const dur = Date.now() - t0;
    await supabase.from('alert_poll_log').insert({
      source, fetched_at: new Date().toISOString(),
      success: true, changed: false, alerts_written: 0,
      error: null, duration_ms: dur,
    });

    return { source, success: true, changed: false, skipped: false, alertsWritten: 0, error: null, durationMs: dur };
  }

  // Parse
  const alerts = source === 'GDACS' ? parseGDACS(rawXml) : parseSACHET(rawXml);
  let alertsWritten = 0;
  let duplicatesDetected = 0;
  let writeError: string | null = null;

  if (alerts.length) {
    // Use the lifecycle-aware DB function instead of a plain upsert.
    // Process in batches of 10 to avoid overwhelming the DB connection pool.
    const BATCH = 10;
    for (let i = 0; i < alerts.length && writeError === null; i += BATCH) {
      const batch = alerts.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(a =>
          supabase.rpc('upsert_alert_with_lifecycle', {
            p_alert_id:          a.alert_id,
            p_source:            a.source,
            p_event_type:        a.event_type,
            p_severity:          a.severity,
            p_urgency:           a.urgency,
            p_certainty:         a.certainty,
            p_alert_level:       a.alert_level ?? null,
            p_location_name:     a.location_name,
            p_country:           a.country,
            p_state:             a.state,
            p_district:          a.district,
            p_latitude:          a.latitude ?? null,
            p_longitude:         a.longitude ?? null,
            p_geometry:          a.geometry ?? null,
            p_population_impact: a.population_impact ?? null,
            p_effective_time:    a.effective_time,
            p_expiry_time:       a.expiry_time ?? null,
            p_description:       a.description,
            p_raw_payload:       a.raw_payload,
          })
        )
      );
      // First pass: detect hard errors
      for (const r of results) {
        if (r.status === 'rejected') { writeError = r.reason?.message ?? 'Unknown error'; break; }
        if (r.status === 'fulfilled' && r.value.error) { writeError = r.value.error.message; break; }
      }
      // Second pass: tally written + duplicates
      for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.error) {
          alertsWritten++;
          // upsert_alert_with_lifecycle returns 'updated' when an existing row was superseded
          if (r.value.data === 'updated') duplicatesDetected++;
        }
      }
    }
  }

  const dur = Date.now() - t0;
  const success = writeError === null;

  // Write ingestion metrics (fire-and-forget — never blocks poll-state update)
  if (success && alertsWritten > 0) {
    const metricRows = [
      { metric_name: 'alerts_ingested', source, value: alertsWritten },
    ];
    if (duplicatesDetected > 0) {
      metricRows.push({ metric_name: 'duplicates_detected', source, value: duplicatesDetected });
    }
    supabase.from('system_metrics').insert(metricRows).then(() => {}).catch(() => {});
  }

  await supabase.from('alert_poll_state').upsert({
    source,
    last_fetch_at: new Date().toISOString(),
    last_success_at: success ? new Date().toISOString() : (state.last_success_at ?? null),
    last_payload_hash: success ? newHash : state.last_payload_hash,
    consecutive_failures: success ? 0 : (state.consecutive_failures ?? 0) + 1,
    next_retry_at: success
      ? new Date().toISOString()
      : new Date(Date.now() + nextRetryDelay((state.consecutive_failures ?? 0) + 1)).toISOString(),
    last_error: writeError,
    total_fetches: (state.total_fetches ?? 0) + 1,
    total_changes: (state.total_changes ?? 0) + (success && changed ? 1 : 0),
  }, { onConflict: 'source' });

  await supabase.from('alert_poll_log').insert({
    source, fetched_at: new Date().toISOString(),
    success, changed, alerts_written: alertsWritten,
    error: writeError, duration_ms: dur,
  });

  return { source, success, changed, skipped: false, alertsWritten, error: writeError, durationMs: dur };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const sources: Array<'GDACS' | 'SACHET'> = body.sources ?? ['GDACS', 'SACHET'];

    // Run sources independently — one failure cannot cancel the other
    const results = await Promise.allSettled(
      sources.map(src => pollSource(src, supabase))
    );

    const summary = results.map(r =>
      r.status === 'fulfilled' ? r.value : { source: 'unknown', success: false, error: (r as PromiseRejectedResult).reason?.message }
    );

    const anyChanged = summary.some((s: any) => s.changed);

    // Trigger location normalisation → clustering only when something changed
    if (anyChanged) {
      const baseUrl  = Deno.env.get('SUPABASE_URL');
      const svcKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const bgHdrs   = { 'Authorization': `Bearer ${svcKey}`, 'Content-Type': 'application/json' };
      EdgeRuntime.waitUntil(
        fetch(`${baseUrl}/functions/v1/normalize-location`, { method: 'POST', headers: bgHdrs })
          .then(() => fetch(`${baseUrl}/functions/v1/cluster-alerts`, { method: 'POST', headers: bgHdrs }))
          .catch(() => { /* background failures must not affect response */ })
      );
    }

    return new Response(JSON.stringify({ ok: true, sources: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
