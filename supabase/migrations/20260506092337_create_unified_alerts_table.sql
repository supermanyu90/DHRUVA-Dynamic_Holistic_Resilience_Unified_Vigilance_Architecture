/*
  # Create unified_alerts table

  ## Summary
  Establishes a single, source-agnostic alert table that normalises incoming
  disaster / emergency alerts from multiple upstream providers (currently
  GDACS and SACHET/NDMA) into a common schema.

  ## New Tables

  ### unified_alerts
  Stores every ingested alert regardless of origin.

  | Column           | Type        | Description |
  |------------------|-------------|-------------|
  | id               | uuid PK     | Internal row identifier |
  | alert_id         | text UNIQUE | Composite external key: "<SOURCE>:<provider_id>" |
  | source           | text        | Originating system: "GDACS" or "SACHET" |
  | event_type       | text        | Normalised hazard type (cyclone, flood, earthquake, heatwave, …) |
  | severity         | text        | Normalised severity: low / moderate / high |
  | urgency          | text        | immediate / expected / future / past / unknown |
  | certainty        | text        | observed / likely / possible / unlikely / unknown |
  | alert_level      | text        | Provider-native level (green / orange / red) |
  | location_name    | text        | Human-readable location string |
  | country          | text        | Country name |
  | state            | text        | State / province |
  | district         | text        | District / county |
  | latitude         | double      | Centroid latitude |
  | longitude        | double      | Centroid longitude |
  | geometry         | jsonb       | Optional GeoJSON geometry |
  | population_impact| bigint      | Estimated affected population (nullable) |
  | effective_time   | timestamptz | When the alert becomes / became active |
  | expiry_time      | timestamptz | When the alert expires (nullable) |
  | description      | text        | Full alert description |
  | raw_payload      | jsonb       | Original provider payload for audit / re-processing |
  | created_at       | timestamptz | Row insertion timestamp |
  | updated_at       | timestamptz | Row last-update timestamp |

  ## Security
  - RLS enabled; table is locked down by default
  - Public (anon) SELECT policy so the dashboard can read alerts
  - service_role INSERT / UPDATE for edge function ingestion
*/

CREATE TABLE IF NOT EXISTS unified_alerts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id         text        UNIQUE NOT NULL,
  source           text        NOT NULL CHECK (source IN ('GDACS', 'SACHET')),
  event_type       text        NOT NULL DEFAULT '',
  severity         text        NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'moderate', 'high')),
  urgency          text        NOT NULL DEFAULT 'unknown',
  certainty        text        NOT NULL DEFAULT 'unknown',
  alert_level      text,
  location_name    text        NOT NULL DEFAULT '',
  country          text        NOT NULL DEFAULT '',
  state            text        NOT NULL DEFAULT '',
  district         text        NOT NULL DEFAULT '',
  latitude         double precision,
  longitude        double precision,
  geometry         jsonb,
  population_impact bigint,
  effective_time   timestamptz NOT NULL DEFAULT now(),
  expiry_time      timestamptz,
  description      text        NOT NULL DEFAULT '',
  raw_payload      jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS unified_alerts_source_idx       ON unified_alerts (source);
CREATE INDEX IF NOT EXISTS unified_alerts_event_type_idx   ON unified_alerts (event_type);
CREATE INDEX IF NOT EXISTS unified_alerts_severity_idx     ON unified_alerts (severity);
CREATE INDEX IF NOT EXISTS unified_alerts_country_idx      ON unified_alerts (country);
CREATE INDEX IF NOT EXISTS unified_alerts_effective_idx    ON unified_alerts (effective_time DESC);
CREATE INDEX IF NOT EXISTS unified_alerts_coords_idx       ON unified_alerts (latitude, longitude);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_unified_alerts_updated_at()
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
    WHERE tgname = 'trg_unified_alerts_updated_at'
  ) THEN
    CREATE TRIGGER trg_unified_alerts_updated_at
      BEFORE UPDATE ON unified_alerts
      FOR EACH ROW EXECUTE FUNCTION update_unified_alerts_updated_at();
  END IF;
END $$;

-- Row Level Security
ALTER TABLE unified_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read unified alerts"
  ON unified_alerts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert unified alerts"
  ON unified_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update unified alerts"
  ON unified_alerts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
