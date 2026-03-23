/*
  # Fix news_events URL unique index for ON CONFLICT upsert support

  ## Problem
  The existing unique index on news_events.url is a PARTIAL index
  (WHERE url IS NOT NULL AND url <> ''). PostgreSQL's ON CONFLICT (url)
  clause requires a full non-partial unique index or constraint — it cannot
  resolve against a partial index. This caused ALL upsert operations from the
  edge functions to fail silently, resulting in inserted=0 even when new
  articles were available from the RSS feeds.

  ## Fix
  Drop the partial index and create a plain full unique index on url.
  Articles with NULL urls are already filtered out in the edge function
  before the upsert call.

  ## Impact
  - ON CONFLICT (url) upserts will now work correctly
  - New articles will be inserted; duplicate URLs will be skipped
*/

DROP INDEX IF EXISTS public.news_events_url_key;

CREATE UNIQUE INDEX IF NOT EXISTS news_events_url_unique
  ON public.news_events (url);
