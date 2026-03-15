/*
  # Update cron jobs to use extensions schema for pg_net

  ## Summary
  Since pg_net was moved to the extensions schema, the cron job commands
  that reference net.http_post must be updated to use extensions.http_post.
*/

SELECT cron.unschedule('run-scheduler');
SELECT cron.unschedule('run-ingest-gov-announcements');

SELECT cron.schedule(
  'run-scheduler',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'run-ingest-gov-announcements',
  '*/30 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-gov-announcements',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
