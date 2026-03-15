/*
  # Create gov_announcements table

  ## Summary
  Replaces the UAE Twitter feed with a global government announcements feed
  sourced from official government RSS/Atom feeds.

  ## New Tables
  - `gov_announcements`
    - `id` (uuid, primary key)
    - `feed_key` (text) - unique feed identifier e.g. 'us-whitehouse'
    - `country` (text) - full country/org name e.g. 'United States'
    - `country_code` (text) - ISO code or abbreviation e.g. 'US'
    - `source` (text) - source label e.g. 'White House'
    - `region` (text) - geographic region e.g. 'Americas'
    - `category` (text) - announcement category e.g. 'Executive', 'Diplomatic', 'Defense'
    - `title` (text) - announcement headline
    - `url` (text) - link to original announcement
    - `content` (text) - summary/description
    - `published_at` (timestamptz) - publication timestamp
    - `created_at` (timestamptz) - ingestion timestamp

  ## Security
  - RLS enabled; public read-only (service role inserts via edge function)
*/

CREATE TABLE IF NOT EXISTS gov_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_key text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL DEFAULT '',
  source text NOT NULL,
  region text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Government',
  title text NOT NULL,
  url text NOT NULL,
  content text DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gov_announcements_url_idx ON gov_announcements (url);
CREATE INDEX IF NOT EXISTS gov_announcements_country_idx ON gov_announcements (country);
CREATE INDEX IF NOT EXISTS gov_announcements_country_code_idx ON gov_announcements (country_code);
CREATE INDEX IF NOT EXISTS gov_announcements_published_at_idx ON gov_announcements (published_at DESC);
CREATE INDEX IF NOT EXISTS gov_announcements_region_idx ON gov_announcements (region);

ALTER TABLE gov_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read gov announcements"
  ON gov_announcements
  FOR SELECT
  TO anon, authenticated
  USING (true);
