/*
  # pg_cron job: expire stale alerts every minute

  ## Summary
  Registers a pg_cron job that calls `expire_stale_alerts()` every minute.
  This ensures alerts whose expiry_time passes between ingest runs are
  transitioned to 'expired' within ~60 seconds, triggering the history
  trigger and keeping the dashboard accurate without waiting for the next
  ingest poll.

  ## Notes
  - The job is safe to re-register; unschedule guard prevents duplicates.
  - expire_stale_alerts() is a no-op when nothing needs expiring (fast path).
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-alerts') THEN
    PERFORM cron.unschedule('expire-stale-alerts');
  END IF;
END $$;

SELECT cron.schedule(
  'expire-stale-alerts',
  '* * * * *',
  $$ SELECT expire_stale_alerts(); $$
);
