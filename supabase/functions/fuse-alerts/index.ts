/**
 * fuse-alerts
 *
 * Alert fusion engine. For each cluster_id with active/updated member alerts,
 * merges data from all contributing sources into a single enriched FusedAlert.
 *
 * Fusion rules
 * ─────────────
 * combined_severity  : highest severity across all members
 * confidence_score   : base from source count + bonuses:
 *   1 source  → base 25
 *   2 sources → base 80
 *   3+ sources → base 100 (confirmed)
 *   + any high severity member → +10 (capped at 100)
 *   + population_impact > 1M   → +5  (capped at 100)
 * confidence (label) : score ≥ 90 → confirmed, ≥ 70 → high, ≥ 45 → medium, else low
 * location_name      : prefer SACHET for India, GDACS otherwise; fallback to any non-empty
 * population_impact  : maximum across members
 * effective_time     : earliest member effective_time
 * expiry_time        : latest member expiry_time (null if any member has no expiry)
 * enriched_description : synthesised paragraph naming each source, severity, and location
 * lifecycle_state    : 'active' if any active member; 'updated' if any updated; else 'expired'
 * priority_score     : highest member priority_score
 *
 * Invocation
 * ──────────
 * POST /fuse-alerts
 * Optional body: { "cluster_ids": ["uuid",...] }  – fuse only these clusters
 * Omitting body fuses all clusters that have had member changes since last fusion.
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberAlert {
  id: string;
  alert_id: string;
  source: string;
  event_type: string;
  severity: 'low' | 'moderate' | 'high';
  urgency: string;
  location_name: string;
  country: string;
  state: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  population_impact: number | null;
  effective_time: string;
  expiry_time: string | null;
  description: string;
  is_primary: boolean;
  priority_score: number;
  lifecycle_state: string;
  cluster_id: string;
}

interface ClusterMeta {
  id: string;
  event_type: string;
  centroid_lat: number | null;
  centroid_lon: number | null;
  updated_at: string;
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEV_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1 };

function combineSeverity(members: MemberAlert[]): 'low' | 'moderate' | 'high' {
  let max = 1;
  for (const m of members) max = Math.max(max, SEV_RANK[m.severity] ?? 1);
  if (max >= 3) return 'high';
  if (max >= 2) return 'moderate';
  return 'low';
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

function computeConfidence(members: MemberAlert[]): { score: number; label: string } {
  const sources = new Set(members.map(m => m.source));
  const srcCount = sources.size;

  let score = srcCount === 1 ? 25 : srcCount === 2 ? 80 : 100;

  const hasHigh = members.some(m => m.severity === 'high');
  const hasLargePop = members.some(m => (m.population_impact ?? 0) > 1_000_000);

  if (hasHigh)     score = Math.min(100, score + 10);
  if (hasLargePop) score = Math.min(100, score + 5);

  const label = score >= 90 ? 'confirmed' : score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, label };
}

// ─── Location resolution ──────────────────────────────────────────────────────

function bestLocation(members: MemberAlert[]): {
  location_name: string; country: string; state: string; district: string;
} {
  const allIndia = members.every(m => m.country === 'India');
  const preferred = allIndia ? 'SACHET' : 'GDACS';

  // Prefer primary member, then preferred-source member, then first non-empty
  const candidates = [
    members.find(m => m.is_primary),
    members.find(m => m.source === preferred),
    ...members,
  ].filter(Boolean) as MemberAlert[];

  for (const c of candidates) {
    if (c.location_name || c.country) {
      return {
        location_name: c.location_name,
        country:       c.country,
        state:         c.state,
        district:      c.district,
      };
    }
  }

  return { location_name: '', country: '', state: '', district: '' };
}

// ─── Description synthesis ────────────────────────────────────────────────────

function buildDescription(members: MemberAlert[], combinedSev: string, confidence: string): string {
  const sources = [...new Set(members.map(m => m.source))];
  const loc = bestLocation(members);
  const eventType = (members[0]?.event_type ?? 'event').replace(/_/g, ' ');
  const locationStr = [loc.district, loc.state, loc.country].filter(Boolean).join(', ')
    || loc.location_name || 'unknown location';

  const srcPhrase = sources.length === 1
    ? `reported by ${sources[0]}`
    : `corroborated by ${sources.join(' and ')}`;

  const popStr = (() => {
    const maxPop = Math.max(...members.map(m => m.population_impact ?? 0));
    if (maxPop > 1_000_000) return ` Estimated ${(maxPop / 1_000_000).toFixed(1)}M people affected.`;
    if (maxPop > 1_000)     return ` Estimated ${Math.round(maxPop / 1_000)}K people affected.`;
    return '';
  })();

  // Gather non-empty unique descriptions from members (truncated)
  const snippets = [...new Set(
    members
      .filter(m => m.description && m.description.length > 10)
      .map(m => m.description.slice(0, 180).trim())
  )].slice(0, 3);

  const detailStr = snippets.length
    ? ' ' + snippets.join(' | ')
    : '';

  return `${combinedSev.toUpperCase()} ${eventType} at ${locationStr}, `
    + `${srcPhrase} (confidence: ${confidence}).`
    + popStr
    + detailStr;
}

// ─── Lifecycle resolution ─────────────────────────────────────────────────────

function resolveLifecycle(members: MemberAlert[]): 'active' | 'updated' | 'expired' {
  if (members.some(m => m.lifecycle_state === 'active'))  return 'active';
  if (members.some(m => m.lifecycle_state === 'updated')) return 'updated';
  return 'expired';
}

// ─── Core fusion function ─────────────────────────────────────────────────────

function fuseCluster(cluster: ClusterMeta, members: MemberAlert[]): Record<string, unknown> {
  const sources   = [...new Set(members.map(m => m.source))];
  const severity  = combineSeverity(members);
  const conf      = computeConfidence(members);
  const loc       = bestLocation(members);
  const lifecycle = resolveLifecycle(members);

  const effectiveTimes = members.map(m => new Date(m.effective_time).getTime());
  const expiryTimes    = members
    .map(m => m.expiry_time ? new Date(m.expiry_time).getTime() : null)
    .filter((t): t is number => t !== null);

  const primaryMember = members.find(m => m.is_primary) ?? members[0];
  const maxPriority   = Math.max(...members.map(m => m.priority_score ?? 0));
  const maxPop        = members.reduce((mx, m) => Math.max(mx, m.population_impact ?? 0), 0) || null;

  return {
    cluster_id:           cluster.id,
    event_type:           cluster.event_type || members[0].event_type,
    combined_severity:    severity,
    confidence:           conf.label,
    confidence_score:     conf.score,
    source_count:         sources.length,
    sources,
    location_name:        loc.location_name,
    country:              loc.country,
    state:                loc.state,
    district:             loc.district,
    centroid_lat:         cluster.centroid_lat,
    centroid_lon:         cluster.centroid_lon,
    population_impact:    maxPop,
    effective_time:       new Date(Math.min(...effectiveTimes)).toISOString(),
    expiry_time:          expiryTimes.length ? new Date(Math.max(...expiryTimes)).toISOString() : null,
    enriched_description: buildDescription(members, severity, conf.label),
    member_alert_ids:     members.map(m => m.id),
    primary_alert_id:     primaryMember?.id ?? null,
    priority_score:       maxPriority,
    lifecycle_state:      lifecycle,
    fused_at:             new Date().toISOString(),
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Optional: fuse only specific cluster_ids
    let targetClusterIds: string[] | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (Array.isArray(body?.cluster_ids) && body.cluster_ids.length) {
          targetClusterIds = body.cluster_ids;
        }
      } catch { /* no body or not JSON — process all */ }
    }

    // ── Load clusters ──────────────────────────────────────────────────────────
    let clusterQuery = supabase
      .from('alert_clusters')
      .select('id, event_type, centroid_lat, centroid_lon, updated_at');

    if (targetClusterIds) {
      clusterQuery = clusterQuery.in('id', targetClusterIds);
    }

    const { data: clusters, error: clusterErr } = await clusterQuery;
    if (clusterErr) throw clusterErr;
    if (!clusters || clusters.length === 0) {
      return new Response(JSON.stringify({ ok: true, fused: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clusterIds = clusters.map((c: ClusterMeta) => c.id);

    // ── Load member alerts for all clusters ────────────────────────────────────
    const { data: members, error: memberErr } = await supabase
      .from('unified_alerts')
      .select(`id, alert_id, source, event_type, severity, urgency,
               location_name, country, state, district,
               latitude, longitude, population_impact,
               effective_time, expiry_time, description,
               is_primary, priority_score, lifecycle_state, cluster_id`)
      .in('cluster_id', clusterIds)
      .in('lifecycle_state', ['active', 'updated', 'expired']);

    if (memberErr) throw memberErr;

    // Group members by cluster_id
    const membersByCluster = new Map<string, MemberAlert[]>();
    for (const m of (members ?? []) as MemberAlert[]) {
      if (!membersByCluster.has(m.cluster_id)) membersByCluster.set(m.cluster_id, []);
      membersByCluster.get(m.cluster_id)!.push(m);
    }

    // ── Load existing fused records for version tracking ───────────────────────
    const { data: existing } = await supabase
      .from('fused_alerts')
      .select('cluster_id, version')
      .in('cluster_id', clusterIds);

    const existingVersions = new Map<string, number>(
      (existing ?? []).map((r: { cluster_id: string; version: number }) => [r.cluster_id, r.version])
    );

    // ── Fuse each cluster ──────────────────────────────────────────────────────
    const upserts: Record<string, unknown>[] = [];

    for (const cluster of clusters as ClusterMeta[]) {
      const clusterMembers = membersByCluster.get(cluster.id);
      if (!clusterMembers || clusterMembers.length === 0) continue;

      const fusedRow = fuseCluster(cluster, clusterMembers);
      const prevVersion = existingVersions.get(cluster.id) ?? 0;
      fusedRow.version = prevVersion + 1;

      upserts.push(fusedRow);
    }

    if (upserts.length === 0) {
      return new Response(JSON.stringify({ ok: true, fused: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert in batches of 50
    const BATCH = 50;
    let fusedCount = 0;
    let writeError: string | null = null;

    for (let i = 0; i < upserts.length && !writeError; i += BATCH) {
      const batch = upserts.slice(i, i + BATCH);
      const { error } = await supabase
        .from('fused_alerts')
        .upsert(batch, { onConflict: 'cluster_id' });
      if (error) { writeError = error.message; break; }
      fusedCount += batch.length;
    }

    if (writeError) throw new Error(writeError);

    return new Response(
      JSON.stringify({ ok: true, fused: fusedCount, clusters: clusters.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
