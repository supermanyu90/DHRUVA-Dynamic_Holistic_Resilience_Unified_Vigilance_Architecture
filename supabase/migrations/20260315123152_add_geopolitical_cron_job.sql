/*
  # Add geopolitical events cron job

  ## Summary
  Adds a dedicated pg_cron schedule to call ingest-geopolitical every 15 minutes,
  ensuring geopolitical events are always up to date alongside the main scheduler.

  ## Changes
  - Adds cron job 'run-ingest-geopolitical' running every 15 minutes
*/

SELECT cron.schedule(
  'run-ingest-geopolitical',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-geopolitical',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
