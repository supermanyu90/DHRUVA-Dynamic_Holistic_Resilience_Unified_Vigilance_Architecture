/*
  # Fix all cron jobs to use correct net.http_post function

  ## Summary
  All existing cron jobs have been failing because they call `extensions.http_post`
  with named keyword arguments. The actual function is in the `net` schema and
  uses positional arguments: net.http_post(url, body, params, headers, timeout_ms).

  ## Changes
  - Unschedule and recreate all 5 cron jobs with correct net.http_post syntax:
    - run-scheduler (every 15 min)
    - run-ingest-geopolitical (every 15 min)
    - run-ingest-cyber-threats (every 15 min)
    - run-ingest-info-ops (every 15 min)
    - run-ingest-gov-announcements (every 30 min)

  ## Notes
  - net.http_post signature: (url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds int)
  - timeout set to 25000ms (25s) to allow edge functions enough time to complete
*/

SELECT cron.unschedule('run-scheduler') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduler');
SELECT cron.unschedule('run-ingest-geopolitical') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-geopolitical');
SELECT cron.unschedule('run-ingest-cyber-threats') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-cyber-threats');
SELECT cron.unschedule('run-ingest-info-ops') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-info-ops');
SELECT cron.unschedule('run-ingest-gov-announcements') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-ingest-gov-announcements');

SELECT cron.schedule(
  'run-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/scheduler',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);

SELECT cron.schedule(
  'run-ingest-geopolitical',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-geopolitical',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);

SELECT cron.schedule(
  'run-ingest-cyber-threats',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-cyber-threats',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);

SELECT cron.schedule(
  'run-ingest-info-ops',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-info-ops',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);

SELECT cron.schedule(
  'run-ingest-gov-announcements',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    'https://vimihczgbklcmjefovip.supabase.co/functions/v1/ingest-gov-announcements',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWloY3pnYmtsY21qZWZvdmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODg5NjYsImV4cCI6MjA4OTA2NDk2Nn0.BzsJDGaN4HXWrUsQupLZZSZ9kVyYX7ABSPhEAzfX9CI"}'::jsonb,
    25000
  );
  $$
);
