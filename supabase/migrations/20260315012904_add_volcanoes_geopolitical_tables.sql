/*
  # Add Volcanoes and Geopolitical Events Tables

  ## New Tables

  ### volcanoes
  - Tracks active/erupting volcanoes from Smithsonian GVP / VAAC alerts
  - Columns: id, volcano_id (unique), name, country, latitude, longitude, elevation,
    status (erupting/unrest/normal), alert_level, activity_description,
    last_eruption, source, properties (jsonb), created_at, updated_at

  ### geopolitical_events
  - Tracks active geopolitical flashpoints: conflicts, sanctions, coups, curfews, crises
  - Columns: id, event_id (unique), title, category (conflict/sanctions/curfew/coup/crisis/protest),
    country, latitude, longitude, description, severity (critical/high/medium/low),
    is_active, started_at, updated_at, source, properties (jsonb), created_at

  ## Security
  - RLS enabled on both tables
  - Anonymous/authenticated users can read
  - Service role can insert/update
*/

CREATE TABLE IF NOT EXISTS volcanoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volcano_id text UNIQUE NOT NULL,
  name text NOT NULL,
  country text,
  latitude double precision,
  longitude double precision,
  elevation integer,
  status text DEFAULT 'normal' CHECK (status IN ('erupting', 'unrest', 'normal')),
  alert_level text,
  activity_description text,
  last_eruption text,
  source text DEFAULT 'smithsonian',
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volcanoes_status ON volcanoes(status);
CREATE INDEX IF NOT EXISTS idx_volcanoes_updated ON volcanoes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_volcanoes_coords ON volcanoes(latitude, longitude);

ALTER TABLE volcanoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read volcanoes"
  ON volcanoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service insert volcanoes"
  ON volcanoes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service update volcanoes"
  ON volcanoes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS geopolitical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  title text NOT NULL,
  category text DEFAULT 'crisis' CHECK (category IN ('conflict', 'sanctions', 'curfew', 'coup', 'crisis', 'protest', 'geopolitical')),
  country text,
  latitude double precision,
  longitude double precision,
  description text,
  severity text DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  is_active boolean DEFAULT true,
  started_at timestamptz,
  source text DEFAULT 'manual',
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_events_category ON geopolitical_events(category);
CREATE INDEX IF NOT EXISTS idx_geo_events_active ON geopolitical_events(is_active);
CREATE INDEX IF NOT EXISTS idx_geo_events_severity ON geopolitical_events(severity);
CREATE INDEX IF NOT EXISTS idx_geo_events_updated ON geopolitical_events(updated_at DESC);

ALTER TABLE geopolitical_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read geo events"
  ON geopolitical_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service insert geo events"
  ON geopolitical_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service update geo events"
  ON geopolitical_events FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
