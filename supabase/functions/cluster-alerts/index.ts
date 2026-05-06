/**
 * cluster-alerts
 *
 * Groups unified_alerts into event clusters using three criteria:
 *   1. Same event_type
 *   2. Centroids within 300 km of each other
 *   3. Effective time windows overlap (or are within 24 h of each other)
 *
 * For each cluster one alert is marked is_primary = true:
 *   - SACHET preferred when country = 'India' (or all members are India)
 *   - GDACS preferred otherwise
 *   - Tie-break: highest severity, then earliest effective_time
 *
 * The function is idempotent — safe to call repeatedly via cron or
 * immediately after each ingest run.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DISTANCE_KM   = 300;
const TIME_WINDOW_HOURS = 24; // alerts within this window can be co-clustered

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertRow {
  id: string;
  alert_id: string;
  source: 'GDACS' | 'SACHET';
  event_type: string;
  severity: 'low' | 'moderate' | 'high';
  country: string;
  latitude: number | null;
  longitude: number | null;
  effective_time: string;
  expiry_time: string | null;
  cluster_id: string | null;
  is_primary: boolean;
}

interface ClusterRow {
  id: string;
  event_type: string;
  primary_source: string;
  member_count: number;
  centroid_lat: number | null;
  centroid_lon: number | null;
  first_seen: string;
  last_seen: string;
  notified_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dG / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Returns true if the two alerts' time windows overlap or are within TIME_WINDOW_HOURS. */
function timesOverlap(a: AlertRow, b: AlertRow): boolean {
  const aStart = new Date(a.effective_time).getTime();
  const aEnd   = a.expiry_time ? new Date(a.expiry_time).getTime() : aStart + TIME_WINDOW_HOURS * 3_600_000;
  const bStart = new Date(b.effective_time).getTime();
  const bEnd   = b.expiry_time ? new Date(b.expiry_time).getTime() : bStart + TIME_WINDOW_HOURS * 3_600_000;
  // Overlap or within TIME_WINDOW_HOURS gap
  return aStart <= bEnd + TIME_WINDOW_HOURS * 3_600_000 &&
         bStart <= aEnd + TIME_WINDOW_HOURS * 3_600_000;
}

function withinRadius(a: AlertRow, b: AlertRow): boolean {
  if (a.latitude == null || a.longitude == null) return false;
  if (b.latitude == null || b.longitude == null) return false;
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) <= MAX_DISTANCE_KM;
}

function canCluster(a: AlertRow, b: AlertRow): boolean {
  return a.event_type === b.event_type && withinRadius(a, b) && timesOverlap(a, b);
}

const SEVERITY_RANK: Record<string, number> = { high: 3, moderate: 2, low: 1 };

/**
 * Pick the primary alert for a cluster.
 *
 * Preference rules (highest wins):
 *   1. India-only cluster  → prefer SACHET
 *   2. Global / mixed      → prefer GDACS
 *   3. Tie-break by severity (desc), then effective_time (asc)
 */
function pickPrimary(members: AlertRow[]): string {
  const allIndia = members.every(m => m.country === 'India');
  const preferredSource = allIndia ? 'SACHET' : 'GDACS';

  const sorted = [...members].sort((a, b) => {
    const srcA = a.source === preferredSource ? 1 : 0;
    const srcB = b.source === preferredSource ? 1 : 0;
    if (srcB !== srcA) return srcB - srcA;
    const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.effective_time).getTime() - new Date(b.effective_time).getTime();
  });

  return sorted[0].id;
}

// ─── Union-Find for clustering ─────────────────────────────────────────────────

class UnionFind {
  private parent: Map<string, string> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)!));
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx !== ry) this.parent.set(rx, ry);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load active/updated alerts from the last 7 days.
    // Expired alerts are excluded — they should not form or join new clusters.
    const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
    const { data: alerts, error: fetchErr } = await supabase
      .from('unified_alerts')
      .select('id, alert_id, source, event_type, severity, country, latitude, longitude, effective_time, expiry_time, cluster_id, is_primary')
      .in('lifecycle_state', ['active', 'updated'])
      .gte('effective_time', since)
      .order('effective_time', { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ ok: true, clusters: 0, alerts: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = alerts as AlertRow[];

    // ── Build clusters via Union-Find ─────────────────────────────────────────
    const uf = new UnionFind();

    // Group by event_type first to limit O(n²) comparisons
    const byType: Record<string, AlertRow[]> = {};
    for (const row of rows) {
      (byType[row.event_type] ??= []).push(row);
    }

    for (const group of Object.values(byType)) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (canCluster(group[i], group[j])) {
            uf.union(group[i].id, group[j].id);
          }
        }
      }
    }

    // ── Map root → members ────────────────────────────────────────────────────
    const clusters: Map<string, AlertRow[]> = new Map();
    for (const row of rows) {
      const root = uf.find(row.id);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(row);
    }

    // ── Load existing cluster records keyed by id ─────────────────────────────
    const { data: existingClusters } = await supabase
      .from('alert_clusters')
      .select('*');
    const existingMap = new Map<string, ClusterRow>(
      (existingClusters || []).map((c: ClusterRow) => [c.id, c])
    );

    // ── Build updates ─────────────────────────────────────────────────────────
    // We assign a stable cluster UUID by reusing existing cluster_id if present,
    // otherwise generating a new one.
    const alertUpdates: { id: string; cluster_id: string; is_primary: boolean }[] = [];
    const clusterUpserts: Omit<ClusterRow, 'notified_at'>[] = [];

    for (const [, members] of clusters) {
      // Stable cluster id: reuse first existing cluster_id in members
      const existingClusterId = members.find(m => m.cluster_id)?.cluster_id ?? null;
      const clusterId = existingClusterId ?? crypto.randomUUID();

      const primaryId = pickPrimary(members);
      const primaryAlert = members.find(m => m.id === primaryId)!;

      // Centroid
      const geoMembers = members.filter(m => m.latitude != null && m.longitude != null);
      const centLat = geoMembers.length
        ? geoMembers.reduce((s, m) => s + m.latitude!, 0) / geoMembers.length
        : null;
      const centLon = geoMembers.length
        ? geoMembers.reduce((s, m) => s + m.longitude!, 0) / geoMembers.length
        : null;

      const times = members.map(m => new Date(m.effective_time).getTime());
      const firstSeen = new Date(Math.min(...times)).toISOString();
      const lastSeen  = new Date(Math.max(...times)).toISOString();

      const allIndia   = members.every(m => m.country === 'India');
      const primarySrc = allIndia ? 'SACHET' : 'GDACS';

      const existing = existingMap.get(clusterId);
      clusterUpserts.push({
        id: clusterId,
        event_type: primaryAlert.event_type,
        primary_source: primarySrc,
        member_count: members.length,
        centroid_lat: centLat,
        centroid_lon: centLon,
        first_seen: firstSeen,
        last_seen: lastSeen,
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      for (const m of members) {
        const wantPrimary = m.id === primaryId;
        if (m.cluster_id !== clusterId || m.is_primary !== wantPrimary) {
          alertUpdates.push({ id: m.id, cluster_id: clusterId, is_primary: wantPrimary });
        }
      }
    }

    // ── Persist cluster records ────────────────────────────────────────────────
    if (clusterUpserts.length) {
      const { error } = await supabase
        .from('alert_clusters')
        .upsert(clusterUpserts, { onConflict: 'id' });
      if (error) throw error;
    }

    // ── Persist alert updates in batches of 100 ────────────────────────────────
    const BATCH = 100;
    for (let i = 0; i < alertUpdates.length; i += BATCH) {
      const batch = alertUpdates.slice(i, i + BATCH);
      // Build a case-when update via RPC isn't needed; we update row by row
      // but use Promise.all to parallelise within each batch.
      await Promise.all(
        batch.map(({ id, cluster_id, is_primary }) =>
          supabase
            .from('unified_alerts')
            .update({ cluster_id, is_primary })
            .eq('id', id)
        )
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        clusters: clusterUpserts.length,
        alerts_updated: alertUpdates.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
