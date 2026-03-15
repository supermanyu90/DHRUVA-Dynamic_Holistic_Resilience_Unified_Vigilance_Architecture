/*
  # DHRUVA Intelligence Dashboard - Database Schema

  ## Overview
  This migration creates the complete database schema for the DHRUVA geopolitical intelligence dashboard,
  supporting real-time monitoring of global events, disasters, news intelligence, vessel tracking, and cyber threats.

  ## New Tables

  ### 1. `earthquakes`
  Stores USGS earthquake data for seismic activity monitoring
  - `id` (uuid, primary key) - Unique identifier
  - `event_id` (text, unique) - USGS event identifier
  - `magnitude` (numeric) - Earthquake magnitude
  - `location` (text) - Location description
  - `latitude` (numeric) - Latitude coordinate
  - `longitude` (numeric) - Longitude coordinate
  - `depth` (numeric) - Depth in kilometers
  - `event_time` (timestamptz) - When earthquake occurred
  - `updated_at` (timestamptz) - Last update time
  - `properties` (jsonb) - Additional USGS properties
  - `created_at` (timestamptz) - Record creation time

  ### 2. `disasters`
  Stores NASA EONET natural disaster events
  - `id` (uuid, primary key) - Unique identifier
  - `event_id` (text, unique) - EONET event identifier
  - `title` (text) - Disaster title
  - `category` (text) - Event category (wildfire, storm, etc.)
  - `latitude` (numeric) - Latitude coordinate
  - `longitude` (numeric) - Longitude coordinate
  - `event_date` (timestamptz) - Event occurrence date
  - `closed` (boolean) - Whether event is closed
  - `properties` (jsonb) - Additional EONET properties
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 3. `news_events`
  Stores GDELT news intelligence and aggregated news feeds
  - `id` (uuid, primary key) - Unique identifier
  - `source` (text) - News source (gdelt, rss, etc.)
  - `title` (text) - News headline
  - `url` (text) - Article URL
  - `content` (text) - Article content/summary
  - `published_at` (timestamptz) - Publication time
  - `country` (text) - Related country
  - `latitude` (numeric) - Event latitude (if available)
  - `longitude` (numeric) - Event longitude (if available)
  - `tone` (numeric) - GDELT tone score
  - `goldstein_scale` (numeric) - GDELT Goldstein scale
  - `categories` (text[]) - Event categories/tags
  - `sentiment` (text) - Sentiment analysis result
  - `metadata` (jsonb) - Additional metadata
  - `created_at` (timestamptz) - Record creation time

  ### 4. `vessels`
  Stores AIS vessel tracking data
  - `id` (uuid, primary key) - Unique identifier
  - `mmsi` (text, unique) - Maritime Mobile Service Identity
  - `name` (text) - Vessel name
  - `type` (text) - Vessel type
  - `latitude` (numeric) - Current latitude
  - `longitude` (numeric) - Current longitude
  - `speed` (numeric) - Speed in knots
  - `course` (numeric) - Course in degrees
  - `heading` (numeric) - Heading in degrees
  - `destination` (text) - Destination port
  - `eta` (timestamptz) - Estimated time of arrival
  - `flag` (text) - Flag state
  - `last_position_time` (timestamptz) - Last position update
  - `properties` (jsonb) - Additional AIS data
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 5. `cyber_threats`
  Stores cybersecurity threat intelligence
  - `id` (uuid, primary key) - Unique identifier
  - `threat_id` (text, unique) - Unique threat identifier
  - `title` (text) - Threat title
  - `description` (text) - Threat description
  - `severity` (text) - Severity level (critical, high, medium, low)
  - `threat_type` (text) - Type of threat
  - `indicators` (jsonb) - IOCs (Indicators of Compromise)
  - `affected_systems` (text[]) - Affected systems/platforms
  - `source` (text) - Intelligence source
  - `first_seen` (timestamptz) - First detection time
  - `last_seen` (timestamptz) - Last detection time
  - `is_active` (boolean) - Whether threat is currently active
  - `metadata` (jsonb) - Additional threat metadata
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 6. `bank_events`
  Stores banking and financial monitoring events
  - `id` (uuid, primary key) - Unique identifier
  - `institution` (text) - Financial institution name
  - `event_type` (text) - Type of event
  - `description` (text) - Event description
  - `severity` (text) - Severity level
  - `country` (text) - Country code
  - `impact_score` (numeric) - Impact assessment score
  - `source` (text) - Data source
  - `event_time` (timestamptz) - Event occurrence time
  - `metadata` (jsonb) - Additional event data
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 7. `info_ops`
  Stores information operations and influence campaigns
  - `id` (uuid, primary key) - Unique identifier
  - `campaign_id` (text, unique) - Campaign identifier
  - `title` (text) - Campaign title
  - `description` (text) - Campaign description
  - `platform` (text) - Social media platform
  - `origin_country` (text) - Country of origin
  - `target_countries` (text[]) - Targeted countries
  - `narrative` (text) - Key narrative/messaging
  - `actors` (text[]) - Attributed actors
  - `confidence_level` (text) - Attribution confidence
  - `first_detected` (timestamptz) - First detection
  - `last_activity` (timestamptz) - Last known activity
  - `is_active` (boolean) - Campaign status
  - `metadata` (jsonb) - Additional campaign data
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 8. `uae_twitter_feed`
  Stores UAE-related Twitter/social media intelligence
  - `id` (uuid, primary key) - Unique identifier
  - `tweet_id` (text, unique) - Tweet identifier
  - `author` (text) - Tweet author
  - `content` (text) - Tweet content
  - `posted_at` (timestamptz) - Publication time
  - `engagement_score` (numeric) - Engagement metrics
  - `sentiment` (text) - Sentiment analysis
  - `hashtags` (text[]) - Associated hashtags
  - `mentions` (text[]) - User mentions
  - `relevance_score` (numeric) - Relevance to UAE intelligence
  - `metadata` (jsonb) - Additional social data
  - `created_at` (timestamptz) - Record creation time

  ### 9. `data_cache`
  Stores cached API responses for performance optimization
  - `id` (uuid, primary key) - Unique identifier
  - `cache_key` (text, unique) - Cache identifier
  - `data_type` (text) - Type of cached data
  - `data` (jsonb) - Cached data payload
  - `expires_at` (timestamptz) - Cache expiration time
  - `created_at` (timestamptz) - Cache creation time
  - `updated_at` (timestamptz) - Last update time

  ### 10. `api_logs`
  Stores API request logs for monitoring and analytics
  - `id` (uuid, primary key) - Unique identifier
  - `endpoint` (text) - API endpoint called
  - `method` (text) - HTTP method
  - `status_code` (integer) - Response status code
  - `response_time_ms` (numeric) - Response time in milliseconds
  - `user_id` (uuid) - User identifier (if authenticated)
  - `ip_address` (text) - Client IP address
  - `user_agent` (text) - Client user agent
  - `error_message` (text) - Error message (if any)
  - `created_at` (timestamptz) - Request time

  ### 11. `user_alerts`
  Stores user-configured alerts and notifications
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - User identifier
  - `alert_type` (text) - Type of alert
  - `conditions` (jsonb) - Alert trigger conditions
  - `notification_channels` (text[]) - Notification methods
  - `is_active` (boolean) - Whether alert is active
  - `last_triggered` (timestamptz) - Last trigger time
  - `created_at` (timestamptz) - Alert creation time
  - `updated_at` (timestamptz) - Last update time

  ## Security
  - Enable RLS on all tables
  - Create policies for authenticated users to read intelligence data
  - Create policies for service role to write data (via Edge Functions)
  - Implement row-level access control for user-specific data

  ## Indexes
  - Create indexes on frequently queried columns (coordinates, timestamps, event IDs)
  - Create composite indexes for common query patterns

  ## Notes
  - All timestamps stored in UTC with timezone awareness
  - JSONB fields used for flexible schema extensions
  - Default values ensure data integrity
  - Unique constraints prevent duplicate events
*/

-- Earthquakes table
CREATE TABLE IF NOT EXISTS earthquakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  magnitude numeric NOT NULL,
  location text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  depth numeric,
  event_time timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now(),
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_earthquakes_event_time ON earthquakes(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_earthquakes_magnitude ON earthquakes(magnitude DESC);
CREATE INDEX IF NOT EXISTS idx_earthquakes_coords ON earthquakes(latitude, longitude);

ALTER TABLE earthquakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read earthquake data"
  ON earthquakes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert earthquake data"
  ON earthquakes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update earthquake data"
  ON earthquakes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Disasters table
CREATE TABLE IF NOT EXISTS disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  latitude numeric,
  longitude numeric,
  event_date timestamptz NOT NULL,
  closed boolean DEFAULT false,
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disasters_event_date ON disasters(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_disasters_category ON disasters(category);
CREATE INDEX IF NOT EXISTS idx_disasters_closed ON disasters(closed);

ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read disaster data"
  ON disasters FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert disaster data"
  ON disasters FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update disaster data"
  ON disasters FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- News events table
CREATE TABLE IF NOT EXISTS news_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  title text NOT NULL,
  url text,
  content text,
  published_at timestamptz NOT NULL,
  country text,
  latitude numeric,
  longitude numeric,
  tone numeric,
  goldstein_scale numeric,
  categories text[] DEFAULT '{}',
  sentiment text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news_events(source);
CREATE INDEX IF NOT EXISTS idx_news_country ON news_events(country);
CREATE INDEX IF NOT EXISTS idx_news_categories ON news_events USING gin(categories);

ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read news data"
  ON news_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert news data"
  ON news_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Vessels table
CREATE TABLE IF NOT EXISTS vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi text UNIQUE NOT NULL,
  name text,
  type text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  speed numeric,
  course numeric,
  heading numeric,
  destination text,
  eta timestamptz,
  flag text,
  last_position_time timestamptz NOT NULL,
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vessels_last_position ON vessels(last_position_time DESC);
CREATE INDEX IF NOT EXISTS idx_vessels_type ON vessels(type);
CREATE INDEX IF NOT EXISTS idx_vessels_coords ON vessels(latitude, longitude);

ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vessel data"
  ON vessels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage vessel data"
  ON vessels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cyber threats table
CREATE TABLE IF NOT EXISTS cyber_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  threat_type text NOT NULL,
  indicators jsonb DEFAULT '{}',
  affected_systems text[] DEFAULT '{}',
  source text NOT NULL,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cyber_threats_severity ON cyber_threats(severity);
CREATE INDEX IF NOT EXISTS idx_cyber_threats_active ON cyber_threats(is_active);
CREATE INDEX IF NOT EXISTS idx_cyber_threats_first_seen ON cyber_threats(first_seen DESC);

ALTER TABLE cyber_threats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read threat data"
  ON cyber_threats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage threat data"
  ON cyber_threats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Bank events table
CREATE TABLE IF NOT EXISTS bank_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution text NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  country text,
  impact_score numeric,
  source text NOT NULL,
  event_time timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_events_time ON bank_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_bank_events_institution ON bank_events(institution);
CREATE INDEX IF NOT EXISTS idx_bank_events_severity ON bank_events(severity);

ALTER TABLE bank_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bank events"
  ON bank_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage bank events"
  ON bank_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Info ops table
CREATE TABLE IF NOT EXISTS info_ops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  platform text NOT NULL,
  origin_country text,
  target_countries text[] DEFAULT '{}',
  narrative text,
  actors text[] DEFAULT '{}',
  confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
  first_detected timestamptz NOT NULL,
  last_activity timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_info_ops_active ON info_ops(is_active);
CREATE INDEX IF NOT EXISTS idx_info_ops_platform ON info_ops(platform);
CREATE INDEX IF NOT EXISTS idx_info_ops_first_detected ON info_ops(first_detected DESC);

ALTER TABLE info_ops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read info ops"
  ON info_ops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage info ops"
  ON info_ops FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- UAE Twitter feed table
CREATE TABLE IF NOT EXISTS uae_twitter_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text UNIQUE NOT NULL,
  author text NOT NULL,
  content text NOT NULL,
  posted_at timestamptz NOT NULL,
  engagement_score numeric DEFAULT 0,
  sentiment text,
  hashtags text[] DEFAULT '{}',
  mentions text[] DEFAULT '{}',
  relevance_score numeric,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uae_twitter_posted ON uae_twitter_feed(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_uae_twitter_relevance ON uae_twitter_feed(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_uae_twitter_hashtags ON uae_twitter_feed USING gin(hashtags);

ALTER TABLE uae_twitter_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read UAE Twitter feed"
  ON uae_twitter_feed FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage UAE Twitter feed"
  ON uae_twitter_feed FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Data cache table
CREATE TABLE IF NOT EXISTS data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data_type text NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON data_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON data_cache(expires_at);

ALTER TABLE data_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache"
  ON data_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- API logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms numeric,
  user_id uuid,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status_code);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage API logs"
  ON api_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User alerts table
CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  conditions jsonb NOT NULL,
  notification_channels text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_user_alerts_type ON user_alerts(alert_type);

ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON user_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON user_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON user_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON user_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all alerts"
  ON user_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);