/*
  # Fused alerts table

  ## Summary
  Stores one fused alert per cluster_id. Whenever the cluster-alerts engine
  runs, each cluster with more than one member (or any cluster with a single
  member that has never been fused) is processed by the fuse-alerts function,
  which produces a single enriched record here.

  Fused alerts are never deleted. When the underlying cluster is re-processed
  the row is upserted and a version counter is incremented.

  ## Schema

  | Column               | Type        | Description |
  |----------------------|-------------|-------------|
  | id                   | uuid PK     |             |
  | cluster_id           | uuid UNIQUE | FK to alert_clusters.id |
  | event_type           | text        | Canonical hazard type |
  | combined_severity    | text        | Highest severity across all members |
  | confidence           | text        | low / medium / high / confirmed |
  | confidence_score     | int         | 0–100 numeric score |
  | source_count         | int         | Number of distinct sources reporting |
  | sources              | text[]      | Array of source names (e.g. ['GDACS','SACHET']) |
  | location_name        | text        | Best resolved human-readable location |
  | country              | text        |             |
  | state                | text        |             |
  | district             | text        |             |
  | centroid_lat         | double      |             |
  | centroid_lon         | double      |             |
  | population_impact    | bigint      | Maximum across member alerts |
  | effective_time       | timestamptz | Earliest member effective_time |
  | expiry_time          | timestamptz | Latest member expiry_time |
  | enriched_description | text        | Synthesised multi-source description |
  | member_alert_ids     | uuid[]      | IDs of contributing unified_alerts |
  | primary_alert_id     | uuid        | The is_primary member's id |
  | priority_score       | int         | Highest member priority_score |
  | lifecycle_state      | text        | active / updated / expired |
  | version              | int         | Incremented on each re-fusion |
  | fused_at             | timestamptz | When this version was produced |
  | created_at           | timestamptz |             |
  | updated_at           | timestamptz |             |

  ## Confidence scoring rules
  | Sources | Severity bonus | Confidence level |
  |---------|---------------|------------------|
  | 1 src   | —             | low  (score 25)  |
  | 2 src   | —             | high (score 80)  |
  | 3+ src  | —             | confirmed (100)  |
  | + high severity on any member → +10 |
  | + population_impact > 1M → +5       |

  ## Security
  - RLS enabled; public SELECT; service_role INSERT/UPDATE
*/

CREATE TABLE IF NOT EXISTS fused_alerts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id           uuid        UNIQUE NOT NULL,
  event_type           text        NOT NULL DEFAULT '',
  combined_severity    text        NOT NULL DEFAULT 'low'
                                   CHECK (combined_severity IN ('low','moderate','high')),
  confidence           text        NOT NULL DEFAULT 'low'
                                   CHECK (confidence IN ('low','medium','high','confirmed')),
  confidence_score     integer     NOT NULL DEFAULT 0,
  source_count         integer     NOT NULL DEFAULT 1,
  sources              text[]      NOT NULL DEFAULT '{}',
  location_name        text        NOT NULL DEFAULT '',
  country              text        NOT NULL DEFAULT '',
  state                text        NOT NULL DEFAULT '',
  district             text        NOT NULL DEFAULT '',
  centroid_lat         double precision,
  centroid_lon         double precision,
  population_impact    bigint,
  effective_time       timestamptz NOT NULL DEFAULT now(),
  expiry_time          timestamptz,
  enriched_description text        NOT NULL DEFAULT '',
  member_alert_ids     uuid[]      NOT NULL DEFAULT '{}',
  primary_alert_id     uuid,
  priority_score       integer     NOT NULL DEFAULT 0,
  lifecycle_state      text        NOT NULL DEFAULT 'active'
                                   CHECK (lifecycle_state IN ('active','updated','expired')),
  version              integer     NOT NULL DEFAULT 1,
  fused_at             timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fused_alerts_cluster_idx      ON fused_alerts (cluster_id);
CREATE INDEX IF NOT EXISTS fused_alerts_event_type_idx   ON fused_alerts (event_type);
CREATE INDEX IF NOT EXISTS fused_alerts_severity_idx     ON fused_alerts (combined_severity);
CREATE INDEX IF NOT EXISTS fused_alerts_confidence_idx   ON fused_alerts (confidence);
CREATE INDEX IF NOT EXISTS fused_alerts_priority_idx     ON fused_alerts (priority_score DESC);
CREATE INDEX IF NOT EXISTS fused_alerts_lifecycle_idx    ON fused_alerts (lifecycle_state);
CREATE INDEX IF NOT EXISTS fused_alerts_fused_at_idx     ON fused_alerts (fused_at DESC);

CREATE OR REPLACE FUNCTION update_fused_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fused_alerts_updated_at'
  ) THEN
    CREATE TRIGGER trg_fused_alerts_updated_at
      BEFORE UPDATE ON fused_alerts
      FOR EACH ROW EXECUTE FUNCTION update_fused_alerts_updated_at();
  END IF;
END $$;

ALTER TABLE fused_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read fused alerts"
  ON fused_alerts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert fused alerts"
  ON fused_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update fused alerts"
  ON fused_alerts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
