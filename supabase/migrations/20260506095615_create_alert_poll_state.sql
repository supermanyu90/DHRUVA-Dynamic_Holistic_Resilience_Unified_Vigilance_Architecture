/*
  # Alert polling state table

  ## Summary
  Tracks per-source polling metadata for the GDACS and SACHET ingestion pipeline.
  Enables change detection (hash comparison), exponential-backoff retry logic,
  and a persistent audit trail of every fetch attempt.

  ## New Tables

  ### alert_poll_state
  One row per alert source. Updated on every poll attempt.

  | Column            | Type        | Description |
  |-------------------|-------------|-------------|
  | source            | text PK     | 'GDACS' or 'SACHET' |
  | last_fetch_at     | timestamptz | Timestamp of the last *attempted* fetch |
  | last_success_at   | timestamptz | Timestamp of the last *successful* fetch |
  | last_payload_hash | text        | SHA-256 hex of the raw response body from the last successful fetch |
  | consecutive_failures | int      | Counter reset to 0 on success; incremented on failure |
  | next_retry_at     | timestamptz | Earliest time the source should be polled again (backoff gate) |
  | last_error        | text        | Error message from the most recent failure (null on success) |
  | total_fetches     | bigint      | Lifetime fetch attempts |
  | total_changes     | bigint      | Lifetime count of fetches that produced a payload change |
  | updated_at        | timestamptz | Auto-updated by trigger |

  ### alert_poll_log
  Append-only log of every individual fetch attempt for audit / dashboarding.

  | Column       | Type        | Description |
  |--------------|-------------|-------------|
  | id           | uuid PK     |             |
  | source       | text        | 'GDACS' or 'SACHET' |
  | fetched_at   | timestamptz | When the fetch was executed |
  | success      | boolean     | Whether fetch & parse succeeded |
  | changed      | boolean     | Whether payload hash differed from previous |
  | alerts_written | int       | Number of alert rows upserted |
  | error        | text        | Error message if success = false |
  | duration_ms  | int         | Wall-clock time of the fetch in milliseconds |

  ## Security
  - RLS enabled on both tables
  - Public SELECT (dashboard can read poll status)
  - service_role INSERT/UPDATE for edge functions
*/

-- ── alert_poll_state ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_poll_state (
  source                text        PRIMARY KEY CHECK (source IN ('GDACS', 'SACHET')),
  last_fetch_at         timestamptz,
  last_success_at       timestamptz,
  last_payload_hash     text,
  consecutive_failures  int         NOT NULL DEFAULT 0,
  next_retry_at         timestamptz NOT NULL DEFAULT now(),
  last_error            text,
  total_fetches         bigint      NOT NULL DEFAULT 0,
  total_changes         bigint      NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_alert_poll_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_poll_state_updated_at'
  ) THEN
    CREATE TRIGGER trg_alert_poll_state_updated_at
      BEFORE UPDATE ON alert_poll_state
      FOR EACH ROW EXECUTE FUNCTION update_alert_poll_state_updated_at();
  END IF;
END $$;

ALTER TABLE alert_poll_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read alert poll state"
  ON alert_poll_state FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert alert poll state"
  ON alert_poll_state FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update alert poll state"
  ON alert_poll_state FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed empty rows so the upsert path always finds a row to update
INSERT INTO alert_poll_state (source) VALUES ('GDACS'), ('SACHET')
ON CONFLICT DO NOTHING;

-- ── alert_poll_log ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_poll_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text        NOT NULL CHECK (source IN ('GDACS', 'SACHET')),
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  success        boolean     NOT NULL DEFAULT false,
  changed        boolean     NOT NULL DEFAULT false,
  alerts_written int         NOT NULL DEFAULT 0,
  error          text,
  duration_ms    int
);

CREATE INDEX IF NOT EXISTS alert_poll_log_source_idx     ON alert_poll_log (source);
CREATE INDEX IF NOT EXISTS alert_poll_log_fetched_at_idx ON alert_poll_log (fetched_at DESC);

ALTER TABLE alert_poll_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read alert poll log"
  ON alert_poll_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert alert poll log"
  ON alert_poll_log FOR INSERT
  TO service_role
  WITH CHECK (true);
