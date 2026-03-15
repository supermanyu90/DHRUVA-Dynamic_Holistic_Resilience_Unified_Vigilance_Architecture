/*
  # Enable pg_cron and set up automated ingestion schedules

  ## Summary
  Installs pg_cron and creates scheduled jobs to regularly refresh all intelligence feeds.

  ## Schedules
  - scheduler (all feeds): every 15 minutes
  - ingest-gov-announcements: every 30 minutes (separate, since not in scheduler)

  ## Notes
  - Uses pg_net's http_post to call edge functions directly
  - SUPABASE_URL is embedded; anon key used since functions have verifyJWT=false
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'run-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

SELECT cron.schedule(
  'run-ingest-gov-announcements',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ingest-gov-announcements',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
