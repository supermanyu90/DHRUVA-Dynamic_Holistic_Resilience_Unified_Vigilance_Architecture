/*
  # Add dedicated cron jobs for cyber threats and info ops

  ## Summary
  Adds dedicated pg_cron schedules to call ingest-cyber-threats and ingest-info-ops
  every 15 minutes independently of the main scheduler, ensuring these feeds are
  always regularly refreshed.

  ## Changes
  - Adds cron job 'run-ingest-cyber-threats' running every 15 minutes
  - Adds cron job 'run-ingest-info-ops' running every 15 minutes
  - Uses SELECT cron.unschedule first to avoid duplicate job errors on re-run
*/

SELECT cron.unschedule('run-ingest-cyber-threats') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-cyber-threats'
);

SELECT cron.unschedule('run-ingest-info-ops') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-info-ops'
);

SELECT cron.schedule(
  'run-ingest-cyber-threats',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-cyber-threats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'run-ingest-info-ops',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-info-ops',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
