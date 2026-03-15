/*
  # Fix RLS Initialization Plan and Drop Unused Indexes

  ## Summary
  Addresses security advisor warnings by:

  1. RLS Policy Fixes (user_alerts table)
     - Replaces auth.uid() with (select auth.uid()) in all 4 policies
     - This prevents per-row re-evaluation of auth functions, improving query performance

  2. Unused Index Cleanup
     - Drops all unused indexes across tables: volcanoes, geopolitical_events,
       gov_announcements, earthquakes, disasters, news_events, vessels,
       cyber_threats, bank_events, info_ops, uae_twitter_feed, data_cache,
       api_logs, user_alerts
     - These indexes consume storage and add write overhead without benefiting reads
*/

-- Fix RLS policies on user_alerts

DROP POLICY IF EXISTS "Users can read own alerts" ON public.user_alerts;
DROP POLICY IF EXISTS "Users can create own alerts" ON public.user_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.user_alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.user_alerts;

CREATE POLICY "Users can read own alerts"
  ON public.user_alerts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.user_alerts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.user_alerts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.user_alerts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop unused indexes

DROP INDEX IF EXISTS public.idx_volcanoes_updated;
DROP INDEX IF EXISTS public.idx_volcanoes_coords;
DROP INDEX IF EXISTS public.idx_geo_events_category;
DROP INDEX IF EXISTS public.idx_geo_events_active;
DROP INDEX IF EXISTS public.idx_geo_events_severity;
DROP INDEX IF EXISTS public.gov_announcements_country_idx;
DROP INDEX IF EXISTS public.gov_announcements_country_code_idx;
DROP INDEX IF EXISTS public.gov_announcements_region_idx;
DROP INDEX IF EXISTS public.idx_earthquakes_magnitude;
DROP INDEX IF EXISTS public.idx_earthquakes_coords;
DROP INDEX IF EXISTS public.idx_disasters_category;
DROP INDEX IF EXISTS public.idx_disasters_closed;
DROP INDEX IF EXISTS public.idx_news_source;
DROP INDEX IF EXISTS public.idx_news_country;
DROP INDEX IF EXISTS public.idx_news_categories;
DROP INDEX IF EXISTS public.idx_vessels_type;
DROP INDEX IF EXISTS public.idx_vessels_coords;
DROP INDEX IF EXISTS public.idx_cyber_threats_severity;
DROP INDEX IF EXISTS public.idx_cyber_threats_active;
DROP INDEX IF EXISTS public.idx_cyber_threats_first_seen;
DROP INDEX IF EXISTS public.idx_bank_events_time;
DROP INDEX IF EXISTS public.idx_bank_events_institution;
DROP INDEX IF EXISTS public.idx_bank_events_severity;
DROP INDEX IF EXISTS public.idx_info_ops_active;
DROP INDEX IF EXISTS public.idx_info_ops_platform;
DROP INDEX IF EXISTS public.idx_info_ops_first_detected;
DROP INDEX IF EXISTS public.idx_uae_twitter_posted;
DROP INDEX IF EXISTS public.idx_uae_twitter_relevance;
DROP INDEX IF EXISTS public.idx_uae_twitter_hashtags;
DROP INDEX IF EXISTS public.idx_cache_key;
DROP INDEX IF EXISTS public.idx_cache_expires;
DROP INDEX IF EXISTS public.idx_api_logs_created;
DROP INDEX IF EXISTS public.idx_api_logs_endpoint;
DROP INDEX IF EXISTS public.idx_api_logs_status;
DROP INDEX IF EXISTS public.idx_user_alerts_user;
DROP INDEX IF EXISTS public.idx_user_alerts_active;
DROP INDEX IF EXISTS public.idx_user_alerts_type;
