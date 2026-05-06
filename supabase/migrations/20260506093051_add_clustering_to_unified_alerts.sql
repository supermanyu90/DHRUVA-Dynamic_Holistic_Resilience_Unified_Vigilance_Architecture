/*
  # Add alert clustering columns to unified_alerts

  ## Summary
  Adds cross-source deduplication support to the unified_alerts table.
  Alerts that describe the same physical event (same hazard type, within
  300 km, overlapping time window) are grouped under a shared cluster_id.
  One alert per cluster is designated as primary.

  ## Changes to unified_alerts

  ### New columns
  - `cluster_id` (uuid, nullable) — shared identifier for all alerts in the
    same event cluster; NULL until clustering is run.
  - `is_primary` (boolean, default false) — true for the single canonical
    alert chosen to represent the cluster (GDACS preferred for global events,
    SACHET preferred for India-only events).

  ## New table: alert_clusters
  Tracks cluster-level metadata for fast lookups and notification gating.

  | Column         | Type        | Description |
  |----------------|-------------|-------------|
  | id             | uuid PK     | = cluster_id referenced by unified_alerts |
  | event_type     | text        | Hazard type shared by member alerts |
  | primary_source | text        | Source of the primary alert |
  | member_count   | int         | Number of alerts in cluster |
  | centroid_lat   | double      | Average latitude of members |
  | centroid_lon   | double      | Average longitude of members |
  | first_seen     | timestamptz | Earliest effective_time among members |
  | last_seen      | timestamptz | Latest effective_time among members |
  | notified_at    | timestamptz | When a notification was last fired for this cluster |
  | created_at     | timestamptz |
  | updated_at     | timestamptz |

  ## Security
  - RLS enabled; public SELECT, service_role INSERT/UPDATE
*/

-- ── Add columns to unified_alerts ────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unified_alerts' AND column_name = 'cluster_id'
  ) THEN
    ALTER TABLE unified_alerts ADD COLUMN cluster_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unified_alerts' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE unified_alerts ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS unified_alerts_cluster_idx    ON unified_alerts (cluster_id);
CREATE INDEX IF NOT EXISTS unified_alerts_is_primary_idx ON unified_alerts (is_primary) WHERE is_primary = true;

-- ── alert_clusters table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_clusters (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     text        NOT NULL DEFAULT '',
  primary_source text        NOT NULL DEFAULT '',
  member_count   int         NOT NULL DEFAULT 1,
  centroid_lat   double precision,
  centroid_lon   double precision,
  first_seen     timestamptz NOT NULL DEFAULT now(),
  last_seen      timestamptz NOT NULL DEFAULT now(),
  notified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_clusters_event_type_idx ON alert_clusters (event_type);
CREATE INDEX IF NOT EXISTS alert_clusters_first_seen_idx ON alert_clusters (first_seen DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_alert_clusters_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_alert_clusters_updated_at'
  ) THEN
    CREATE TRIGGER trg_alert_clusters_updated_at
      BEFORE UPDATE ON alert_clusters
      FOR EACH ROW EXECUTE FUNCTION update_alert_clusters_updated_at();
  END IF;
END $$;

ALTER TABLE alert_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read alert clusters"
  ON alert_clusters FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert alert clusters"
  ON alert_clusters FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update alert clusters"
  ON alert_clusters FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Postgres helper: haversine distance in km ─────────────────────────────────
-- Returns NULL when either coordinate is NULL.
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT
    2 * 6371 * asin(
      sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        power(sin(radians(lon2 - lon1) / 2), 2)
      )
    )
$$;
