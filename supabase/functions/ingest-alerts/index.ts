import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gdacsSeverity(alertLevel: string): 'low' | 'moderate' | 'high' {
  const l = (alertLevel || '').toLowerCase();
  if (l === 'red') return 'high';
  if (l === 'orange') return 'moderate';
  return 'low';
}

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
  return raw.toLowerCase().replace(/\s+/g, '_');
}

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

// ─── GDACS ingestion ──────────────────────────────────────────────────────────

async function ingestGDACS(): Promise<UnifiedAlert[]> {
  const url = 'https://www.gdacs.org/xml/rss.xml';
  const res = await fetch(url, { headers: { 'User-Agent': 'DhruvaIntelligence/1.0' } });
  if (!res.ok) throw new Error(`GDACS fetch failed: ${res.status}`);
  const xml = await res.text();

  const items = splitBlocks(xml, 'item');
  const alerts: UnifiedAlert[] = [];

  for (const item of items) {
    try {
      const eventId   = xmlText(item, 'gdacs:eventid') || xmlAttr(item, 'gdacs:eventid', 'id');
      const eventType = xmlText(item, 'gdacs:eventtype') || xmlText(item, 'gdacs:eventType');
      const alertLevel = xmlText(item, 'gdacs:alertlevel') || xmlText(item, 'gdacs:alertLevel');
      const country   = xmlText(item, 'gdacs:country');
      const title     = xmlText(item, 'title');
      const desc      = xmlText(item, 'description');
      const pubDate   = xmlText(item, 'pubDate');
      const population = parseInt(xmlText(item, 'gdacs:population') || '0', 10) || null;

      // coordinates from georss:point or geo:lat/long
      let lat: number | null = null;
      let lon: number | null = null;
      const geoPoint = xmlText(item, 'georss:point');
      if (geoPoint) {
        const [a, b] = geoPoint.trim().split(/\s+/);
        lat = parseFloat(a);
        lon = parseFloat(b);
      } else {
        const la = xmlText(item, 'geo:lat') || xmlText(item, 'gdacs:latitude');
        const lo = xmlText(item, 'geo:long') || xmlText(item, 'gdacs:longitude');
        if (la) lat = parseFloat(la);
        if (lo) lon = parseFloat(lo);
      }

      const expiryRaw = xmlText(item, 'gdacs:todate') || xmlText(item, 'gdacs:expiredate');

      if (!eventId) continue;

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
        latitude: isNaN(lat as number) ? null : lat,
        longitude: isNaN(lon as number) ? null : lon,
        geometry: null,
        population_impact: isNaN(population as number) ? null : population,
        effective_time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        expiry_time: expiryRaw ? new Date(expiryRaw).toISOString() : null,
        description: desc,
        raw_payload: { item: item.slice(0, 4000) },
      });
    } catch {
      // skip malformed items
    }
  }

  return alerts;
}

// ─── SACHET (NDMA CAP) ingestion ──────────────────────────────────────────────

async function ingestSACHET(): Promise<UnifiedAlert[]> {
  const feedUrl = 'https://sachet.ndma.gov.in/CapFeed';
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'DhruvaIntelligence/1.0', 'Accept': 'application/xml, text/xml, */*' },
  });
  if (!res.ok) throw new Error(`SACHET fetch failed: ${res.status}`);
  const xml = await res.text();

  // The CAP feed is a list of <alert> elements (or an <alerts> wrapper with <alert> children)
  const alertBlocks = splitBlocks(xml, 'alert');
  const alerts: UnifiedAlert[] = [];

  for (const block of alertBlocks) {
    try {
      const identifier = xmlText(block, 'identifier');
      const sent       = xmlText(block, 'sent');
      const status     = xmlText(block, 'status');
      const msgType    = xmlText(block, 'msgType');
      if (!identifier || status === 'Test') continue;

      // CAP <info> block (take the first English one, or any)
      const infoBlocks = splitBlocks(block, 'info');
      if (!infoBlocks.length) continue;

      // Prefer English
      const infoBlock = infoBlocks.find(b => xmlText(b, 'language').toLowerCase().startsWith('en')) || infoBlocks[0];

      const event       = xmlText(infoBlock, 'event');
      const headline    = xmlText(infoBlock, 'headline');
      const description = xmlText(infoBlock, 'description');
      const urgency     = xmlText(infoBlock, 'urgency').toLowerCase() || 'unknown';
      const severity    = xmlText(infoBlock, 'severity').toLowerCase();
      const certainty   = xmlText(infoBlock, 'certainty');
      const effective   = xmlText(infoBlock, 'effective') || sent;
      const expires     = xmlText(infoBlock, 'expires');

      // Area
      const areaBlock = splitBlocks(infoBlock, 'area')[0] || '';
      const areaDesc  = xmlText(areaBlock, 'areaDesc');
      const polygon   = xmlText(areaBlock, 'polygon');
      const geoCodeBlocks = splitBlocks(areaBlock, 'geocode');

      let state    = '';
      let district = '';
      for (const gc of geoCodeBlocks) {
        const name  = xmlText(gc, 'valueName');
        const value = xmlText(gc, 'value');
        if (name === 'state')    state    = value;
        if (name === 'district') district = value;
      }

      // Try to extract centroid from polygon
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
          const sumLat = coords.reduce((s, [, la]) => s + la, 0);
          const sumLon = coords.reduce((s, [lo]) => s + lo, 0);
          lat = sumLat / coords.length;
          lon = sumLon / coords.length;
          geometry = { type: 'Polygon', coordinates: [coords] };
        }
      }

      // Map CAP severity → our scale
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
    } catch {
      // skip malformed alerts
    }
  }

  return alerts;
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
    const sources: string[] = body.sources || ['GDACS', 'SACHET'];

    const results: Record<string, { ingested: number; errors: string[] }> = {};

    if (sources.includes('GDACS')) {
      const errs: string[] = [];
      let gdacsAlerts: UnifiedAlert[] = [];
      try {
        gdacsAlerts = await ingestGDACS();
      } catch (e: any) {
        errs.push(e.message);
      }

      if (gdacsAlerts.length) {
        const { error } = await supabase
          .from('unified_alerts')
          .upsert(gdacsAlerts, { onConflict: 'alert_id', ignoreDuplicates: false });
        if (error) errs.push(error.message);
      }
      results.GDACS = { ingested: gdacsAlerts.length, errors: errs };
    }

    if (sources.includes('SACHET')) {
      const errs: string[] = [];
      let sachetAlerts: UnifiedAlert[] = [];
      try {
        sachetAlerts = await ingestSACHET();
      } catch (e: any) {
        errs.push(e.message);
      }

      if (sachetAlerts.length) {
        const { error } = await supabase
          .from('unified_alerts')
          .upsert(sachetAlerts, { onConflict: 'alert_id', ignoreDuplicates: false });
        if (error) errs.push(error.message);
      }
      results.SACHET = { ingested: sachetAlerts.length, errors: errs };
    }

    const baseUrl = Deno.env.get('SUPABASE_URL');
    const svcKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const bgHeaders = { 'Authorization': `Bearer ${svcKey}`, 'Content-Type': 'application/json' };

    // Normalise locations first, then cluster — both run in background
    EdgeRuntime.waitUntil(
      fetch(`${baseUrl}/functions/v1/normalize-location`, { method: 'POST', headers: bgHeaders })
        .then(() => fetch(`${baseUrl}/functions/v1/cluster-alerts`, { method: 'POST', headers: bgHeaders }))
        .catch(() => { /* background failures must not affect response */ })
    );

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
