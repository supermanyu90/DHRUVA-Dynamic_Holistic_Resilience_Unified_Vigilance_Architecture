/*
  # Configure app settings for cron jobs and update schedules

  ## Summary
  Sets the Supabase URL and anon key as database settings so cron jobs
  can call edge functions via pg_net. Updates existing cron schedules to use
  hardcoded values instead of current_setting() calls.

  ## Changes
  - Removes old schedules that use current_setting (which fail without app config)
  - Creates new schedules with hardcoded URLs for reliability
  - scheduler runs every 15 minutes
  - ingest-gov-announcements runs every 30 minutes
*/

SELECT cron.unschedule('run-scheduler');
SELECT cron.unschedule('run-ingest-gov-announcements');

SELECT cron.schedule(
  'run-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
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
  SELECT net.http_post(
    url := 'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-gov-announcements',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
