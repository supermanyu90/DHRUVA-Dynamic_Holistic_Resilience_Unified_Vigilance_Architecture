/*
  # Monitoring schema

  ## Summary
  Adds two lightweight structures that the admin dashboard reads directly:

  1. `system_metrics` table — append-only time-series of named scalar metrics
     written by edge functions and DB triggers (ingestion counters, duplicate
     detection, notification counts).

  2. `ingestion_stats` view — aggregates `alert_poll_log` + `system_metrics`
     into the exact shape the AdminDashboard component expects, so the frontend
     can execute a single query per panel.

  ## New table: system_metrics

  | Column      | Type        | Description |
  |-------------|-------------|-------------|
  | id          | uuid PK     |             |
  | metric_name | text        | e.g. 'alerts_ingested', 'duplicates_detected', 'notifications_sent' |
  | source      | text        | 'GDACS' | 'SACHET' | 'system' |
  | value       | bigint      | Metric value for this sample |
  | recorded_at | timestamptz | When this row was written |

  Common metric_name values
  - alerts_ingested        — number of new/updated alert rows written per poll
  - duplicates_detected    — rows where upsert found an existing alert_id
  - notifications_sent     — incremented by the alert-notifier on each dispatch

  ## ingestion_stats view
  One row per source per day. Columns:
  - source, day (date), total_fetches, successful_fetches, failed_fetches,
    success_rate (0-1), total_alerts_written, avg_duration_ms, last_fetch_at,
    last_success_at, last_error, consecutive_failures

  ## Security
  - RLS on system_metrics: public SELECT, service_role INSERT
  - View inherits RLS from underlying tables
*/

-- ── system_metrics ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_metrics (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name  text        NOT NULL,
  source       text        NOT NULL DEFAULT 'system',
  value        bigint      NOT NULL DEFAULT 1,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_metrics_name_idx        ON system_metrics (metric_name);
CREATE INDEX IF NOT EXISTS system_metrics_source_idx      ON system_metrics (source);
CREATE INDEX IF NOT EXISTS system_metrics_recorded_at_idx ON system_metrics (recorded_at DESC);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read system metrics"
  ON system_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert system metrics"
  ON system_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── ingestion_stats view ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW ingestion_stats AS
SELECT
  l.source,
  date_trunc('day', l.fetched_at) AS day,
  count(*)                         AS total_fetches,
  count(*) FILTER (WHERE l.success)          AS successful_fetches,
  count(*) FILTER (WHERE NOT l.success)      AS failed_fetches,
  round(
    count(*) FILTER (WHERE l.success)::numeric /
    NULLIF(count(*), 0), 4
  )                                           AS success_rate,
  coalesce(sum(l.alerts_written), 0)          AS total_alerts_written,
  round(avg(l.duration_ms))                   AS avg_duration_ms,
  max(l.fetched_at)                           AS last_fetch_at,
  max(l.fetched_at) FILTER (WHERE l.success)  AS last_success_at,
  (array_agg(l.error ORDER BY l.fetched_at DESC)
    FILTER (WHERE l.error IS NOT NULL))[1]    AS last_error,
  s.consecutive_failures,
  s.total_fetches                              AS lifetime_fetches,
  s.total_changes                              AS lifetime_changes
FROM alert_poll_log l
LEFT JOIN alert_poll_state s ON s.source = l.source
GROUP BY l.source, date_trunc('day', l.fetched_at),
         s.consecutive_failures, s.total_fetches, s.total_changes;

-- ── DB trigger: record duplicate_detected metric on upsert ────────────────────
-- When upsert_alert_with_lifecycle finds an existing row (lifecycle_state
-- transitions to 'updated'), write a duplicate metric row.
-- We detect this by watching alert_history for reason = 'updated'.

CREATE OR REPLACE FUNCTION trg_fn_record_duplicate_metric()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.change_reason = 'updated' THEN
    INSERT INTO system_metrics (metric_name, source, value, recorded_at)
    SELECT
      'duplicates_detected',
      ua.source,
      1,
      now()
    FROM unified_alerts ua
    WHERE ua.id = NEW.unified_alert_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_history_duplicate_metric'
  ) THEN
    CREATE TRIGGER trg_alert_history_duplicate_metric
      AFTER INSERT ON alert_history
      FOR EACH ROW EXECUTE FUNCTION trg_fn_record_duplicate_metric();
  END IF;
END $$;
