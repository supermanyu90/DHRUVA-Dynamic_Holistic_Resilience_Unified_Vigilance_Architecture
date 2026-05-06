/*
  # Alert lifecycle states and change history

  ## Summary
  Adds a `lifecycle_state` column to `unified_alerts` and an `alert_history`
  table that archives every version of an alert row whenever it transitions
  to a new state or its content changes. No alert row is ever deleted.

  ## Lifecycle states
  | State   | Meaning |
  |---------|---------|
  | active  | Alert is current and not yet expired |
  | updated | A newer version of this alert_id has arrived; this row is superseded |
  | expired | expiry_time is in the past (or manually marked by the expire job) |

  ## Changes to unified_alerts
  - New column `lifecycle_state` text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_state IN ('active', 'updated', 'expired'))
  - Index on (lifecycle_state) and (expiry_time) for the expiry sweep
  - Trigger `trg_unified_alerts_lifecycle_history` writes to alert_history on
    every UPDATE, capturing the OLD row state before the change.

  ## New table: alert_history
  Append-only archive. One row per state transition or content change.

  | Column          | Type        | Description |
  |-----------------|-------------|-------------|
  | id              | uuid PK     |             |
  | alert_id        | text        | External alert id (e.g. GDACS:123) |
  | unified_alert_id| uuid        | FK to unified_alerts.id |
  | previous_state  | text        | lifecycle_state before this transition |
  | new_state       | text        | lifecycle_state after this transition |
  | previous_hash   | text        | SHA-256 of previous raw_payload (from ingest) |
  | change_reason   | text        | 'expiry' | 'updated' | 'ingest' | 'manual' |
  | snapshot        | jsonb       | Full copy of the row at transition time |
  | changed_at      | timestamptz | When this history entry was created |

  ## DB-level auto-expiry function
  `expire_stale_alerts()` — marks all rows whose expiry_time < now() as
  'expired' if they are currently 'active' or 'updated'. Called by pg_cron
  every minute (see companion migration). Returns the count of rows changed.

  ## Security
  - RLS enabled on alert_history
  - Public SELECT (dashboard can read history)
  - service_role INSERT (trigger runs as definer = service_role equivalent)
*/

-- ── Add lifecycle_state to unified_alerts ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unified_alerts' AND column_name = 'lifecycle_state'
  ) THEN
    ALTER TABLE unified_alerts
      ADD COLUMN lifecycle_state text NOT NULL DEFAULT 'active'
        CHECK (lifecycle_state IN ('active', 'updated', 'expired'));
  END IF;
END $$;

-- Backfill: anything already past expiry_time → expired
UPDATE unified_alerts
  SET lifecycle_state = 'expired'
WHERE expiry_time IS NOT NULL
  AND expiry_time < now()
  AND lifecycle_state = 'active';

CREATE INDEX IF NOT EXISTS unified_alerts_lifecycle_idx
  ON unified_alerts (lifecycle_state);

CREATE INDEX IF NOT EXISTS unified_alerts_expiry_idx
  ON unified_alerts (expiry_time)
  WHERE expiry_time IS NOT NULL;

-- ── alert_history table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_history (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id          text        NOT NULL,
  unified_alert_id  uuid        NOT NULL,
  previous_state    text,
  new_state         text        NOT NULL,
  change_reason     text        NOT NULL DEFAULT 'ingest',
  snapshot          jsonb       NOT NULL DEFAULT '{}',
  changed_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_history_alert_id_idx       ON alert_history (alert_id);
CREATE INDEX IF NOT EXISTS alert_history_unified_id_idx     ON alert_history (unified_alert_id);
CREATE INDEX IF NOT EXISTS alert_history_changed_at_idx     ON alert_history (changed_at DESC);

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read alert history"
  ON alert_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert alert history"
  ON alert_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Trigger: write history entry on every UPDATE ───────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_unified_alerts_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reason text;
BEGIN
  -- Determine reason from the state transition
  IF NEW.lifecycle_state = 'expired' AND OLD.lifecycle_state <> 'expired' THEN
    v_reason := 'expiry';
  ELSIF NEW.lifecycle_state = 'updated' AND OLD.lifecycle_state <> 'updated' THEN
    v_reason := 'updated';
  ELSE
    v_reason := 'ingest';
  END IF;

  -- Only archive if state changed OR payload changed
  IF OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state
     OR OLD.raw_payload::text IS DISTINCT FROM NEW.raw_payload::text
     OR OLD.severity IS DISTINCT FROM NEW.severity
     OR OLD.urgency IS DISTINCT FROM NEW.urgency
  THEN
    INSERT INTO alert_history (
      alert_id,
      unified_alert_id,
      previous_state,
      new_state,
      change_reason,
      snapshot,
      changed_at
    ) VALUES (
      OLD.alert_id,
      OLD.id,
      OLD.lifecycle_state,
      NEW.lifecycle_state,
      v_reason,
      to_jsonb(OLD),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unified_alerts_history'
  ) THEN
    CREATE TRIGGER trg_unified_alerts_history
      AFTER UPDATE ON unified_alerts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_unified_alerts_history();
  END IF;
END $$;

-- ── Trigger: write INSERT history entry for brand-new rows ────────────────────

CREATE OR REPLACE FUNCTION trg_fn_unified_alerts_history_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO alert_history (
    alert_id,
    unified_alert_id,
    previous_state,
    new_state,
    change_reason,
    snapshot,
    changed_at
  ) VALUES (
    NEW.alert_id,
    NEW.id,
    NULL,
    NEW.lifecycle_state,
    'ingest',
    to_jsonb(NEW),
    now()
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unified_alerts_history_insert'
  ) THEN
    CREATE TRIGGER trg_unified_alerts_history_insert
      AFTER INSERT ON unified_alerts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_unified_alerts_history_insert();
  END IF;
END $$;

-- ── DB-level expiry sweep function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_stale_alerts()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE unified_alerts
    SET lifecycle_state = 'expired'
  WHERE lifecycle_state IN ('active', 'updated')
    AND expiry_time IS NOT NULL
    AND expiry_time < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
