/*
  # Priority score for unified_alerts

  ## Summary
  Adds a computed `priority_score` column (0–100) to unified_alerts and a
  Postgres function that applies the scoring formula so the database is the
  single source of truth. A BEFORE INSERT/UPDATE trigger keeps every row
  up-to-date automatically.

  ## Scoring formula
  | Factor                          | Points |
  |---------------------------------|--------|
  | severity = high                 | 70     |
  | severity = moderate             | 40     |
  | severity = low                  | 10     |
  | urgency = immediate             | +15    |
  | population_impact > 1,000,000   | +10    |
  | country = 'India' OR state != ''| +5     |

  Total is clamped to [0, 100].

  ## Changes to unified_alerts
  - New column `priority_score` integer NOT NULL DEFAULT 0
  - New index `unified_alerts_priority_idx` (priority_score DESC) for fast ranking

  ## New DB objects
  - Function `compute_alert_priority_score(severity, urgency, population_impact, country, state)`
  - Trigger `trg_unified_alerts_priority` (BEFORE INSERT OR UPDATE)

  ## Notes
  - Backfill runs at the end of the migration over all existing rows.
*/

-- ── Add column ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unified_alerts' AND column_name = 'priority_score'
  ) THEN
    ALTER TABLE unified_alerts ADD COLUMN priority_score integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS unified_alerts_priority_idx ON unified_alerts (priority_score DESC);

-- ── Scoring function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_alert_priority_score(
  p_severity         text,
  p_urgency          text,
  p_population_impact bigint,
  p_country          text,
  p_state            text
) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Base score from severity
  CASE p_severity
    WHEN 'high'     THEN score := 70;
    WHEN 'moderate' THEN score := 40;
    WHEN 'low'      THEN score := 10;
    ELSE                 score := 10;
  END CASE;

  -- Urgency bonus
  IF lower(p_urgency) = 'immediate' THEN
    score := score + 15;
  END IF;

  -- Population bonus
  IF p_population_impact IS NOT NULL AND p_population_impact > 1000000 THEN
    score := score + 10;
  END IF;

  -- India relevance bonus (country = India OR state field populated = India domestic)
  IF lower(p_country) = 'india' OR (p_state IS NOT NULL AND p_state <> '') THEN
    score := score + 5;
  END IF;

  -- Clamp to [0, 100]
  RETURN GREATEST(0, LEAST(100, score));
END;
$$;

-- ── Trigger to auto-compute on insert/update ───────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_unified_alerts_priority()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.priority_score := compute_alert_priority_score(
    NEW.severity,
    NEW.urgency,
    NEW.population_impact,
    NEW.country,
    NEW.state
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_unified_alerts_priority'
  ) THEN
    CREATE TRIGGER trg_unified_alerts_priority
      BEFORE INSERT OR UPDATE OF severity, urgency, population_impact, country, state
      ON unified_alerts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_unified_alerts_priority();
  END IF;
END $$;

-- ── Backfill existing rows ─────────────────────────────────────────────────────

UPDATE unified_alerts
SET priority_score = compute_alert_priority_score(
  severity, urgency, population_impact, country, state
)
WHERE priority_score = 0;
