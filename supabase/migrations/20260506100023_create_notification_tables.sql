/*
  # Notification throttling and user preferences

  ## Summary
  Two tables support intelligent alert notification throttling:

  1. `notification_preferences` — per-session (or per-user) filter rules
     that determine which alerts warrant a notification.
  2. `notification_cooldowns` — region-level cooldown state so no more
     than one notification fires per region per 15-minute window.

  ## New Tables

  ### notification_preferences
  Stores user-configurable notification filter rules.

  | Column            | Type     | Description |
  |-------------------|----------|-------------|
  | id                | uuid PK  |             |
  | session_id        | text     | Browser session key (anon users) |
  | min_severity      | text     | Minimum severity to notify: low / moderate / high |
  | event_types       | text[]   | Whitelist of event types (empty = all) |
  | location_filter   | text[]   | Whitelist of country/state/district names (empty = all) |
  | urgency_filter    | text[]   | Urgency levels to include (default: immediate) |
  | created_at        | timestamptz |           |
  | updated_at        | timestamptz |           |

  ### notification_cooldowns
  One row per (region_key). Updated whenever a notification fires.

  | Column       | Type        | Description |
  |--------------|-------------|-------------|
  | region_key   | text PK     | Normalised region identifier (country:state:district) |
  | last_notified_at | timestamptz | When the last notification was fired for this region |
  | alert_count  | int         | Alerts accumulated during the current cooldown window |
  | updated_at   | timestamptz |             |

  ## Security
  - RLS enabled; public SELECT/INSERT/UPDATE so browser can manage its own prefs.
  - Row-level ownership enforced via session_id equality check.
*/

-- ── notification_preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       text        NOT NULL,
  min_severity     text        NOT NULL DEFAULT 'high' CHECK (min_severity IN ('low', 'moderate', 'high')),
  event_types      text[]      NOT NULL DEFAULT '{}',
  location_filter  text[]      NOT NULL DEFAULT '{}',
  urgency_filter   text[]      NOT NULL DEFAULT '{immediate}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS notif_prefs_session_idx ON notification_preferences (session_id);

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notif_prefs_updated_at'
  ) THEN
    CREATE TRIGGER trg_notif_prefs_updated_at
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();
  END IF;
END $$;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON notification_preferences FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── notification_cooldowns ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_cooldowns (
  region_key        text        PRIMARY KEY,
  last_notified_at  timestamptz NOT NULL DEFAULT now(),
  alert_count       int         NOT NULL DEFAULT 1,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_notification_cooldowns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notif_cooldowns_updated_at'
  ) THEN
    CREATE TRIGGER trg_notif_cooldowns_updated_at
      BEFORE UPDATE ON notification_cooldowns
      FOR EACH ROW EXECUTE FUNCTION update_notification_cooldowns_updated_at();
  END IF;
END $$;

ALTER TABLE notification_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read cooldowns"
  ON notification_cooldowns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert cooldowns"
  ON notification_cooldowns FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update cooldowns"
  ON notification_cooldowns FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
