/*
  # Add unique index on news_events.url

  ## Summary
  Adds a unique index on the url column of news_events to allow upsert-based
  deduplication. This prevents duplicate articles from being inserted on every
  ingest run.

  ## Changes
  - Adds unique index on news_events(url) where url is not null
  - Duplicate existing rows (same url) are deduplicated by keeping the newest id
*/

DELETE FROM news_events a
USING news_events b
WHERE a.id < b.id AND a.url = b.url AND a.url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS news_events_url_key ON news_events (url) WHERE url IS NOT NULL AND url != '';
