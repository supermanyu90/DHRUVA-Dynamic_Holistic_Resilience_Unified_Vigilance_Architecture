/*
  # Add cron job for News Intel ingestion

  ## Problem
  The ingest-news-intel edge function had no scheduled cron job, causing
  news data to go stale after the last manual run on 2026-03-15.

  ## Changes
  - Adds a pg_cron job "run-ingest-news-intel" that fires every 30 minutes
  - Uses the same pattern as other existing cron jobs (net.http_post)
  - Targets the ingest-news-intel edge function endpoint

  ## Notes
  - Other ingestion jobs (geopolitical, cyber, info-ops) already run every 15 min
  - News ingestion is heavier (12 RSS feeds + 11 GDELT themes) so 30 min is appropriate
  - Uses the anon key bearer token matching all other cron jobs in the project
*/

SELECT cron.schedule(
  'run-ingest-news-intel',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-news-intel',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);
