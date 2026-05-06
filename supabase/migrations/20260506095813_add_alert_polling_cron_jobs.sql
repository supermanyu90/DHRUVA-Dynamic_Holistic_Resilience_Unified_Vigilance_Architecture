/*
  # Add intelligent polling cron jobs for GDACS and SACHET

  ## Summary
  Registers two dedicated pg_cron jobs that call ingest-alerts with a
  single source each, at their required frequencies:
    - GDACS  every 5 minutes  (global disaster feed, lower-frequency updates)
    - SACHET every 3 minutes  (India CAP feed, higher-frequency updates)

  Each job calls ingest-alerts with a source-scoped body so only that
  source is polled; the function's built-in backoff gate silently skips
  the run when a previous attempt is still within its retry window.

  ## Notes
  - Uses the same net.http_post(url, body, params, headers, timeout_ms)
    signature as all other cron jobs in this project.
  - Existing unschedule guards prevent duplicate-job errors on re-run.
  - timeout_ms = 30 000 (30 s) — longer than other jobs because ingest-alerts
    waits for the remote feed before returning.
*/

-- Unschedule if already exist (safe re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'poll-gdacs') THEN
    PERFORM cron.unschedule('poll-gdacs');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'poll-sachet') THEN
    PERFORM cron.unschedule('poll-sachet');
  END IF;
END $$;

-- GDACS: every 5 minutes
SELECT cron.schedule(
  'poll-gdacs',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-alerts',
    '{"sources":["GDACS"]}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    30000
  );
  $$
);

-- SACHET: every 3 minutes
-- pg_cron minimum granularity is 1 minute; we use a compound schedule
-- "every minute but only on minutes divisible by 3" via mod arithmetic
-- expressed as: 0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57
SELECT cron.schedule(
  'poll-sachet',
  '0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-alerts',
    '{"sources":["SACHET"]}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    30000
  );
  $$
);
