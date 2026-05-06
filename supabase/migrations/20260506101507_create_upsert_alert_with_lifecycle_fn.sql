/*
  # Database function: upsert_alert_with_lifecycle

  ## Summary
  Provides an atomic single-row upsert that handles all lifecycle transitions:

  - INSERT (new alert_id):
      Sets lifecycle_state = 'active' (or 'expired' immediately when expiry_time < now()).

  - UPDATE (same alert_id already exists):
      1. If the existing row is NOT expired, marks it 'updated' so the history
         trigger captures the old version.
      2. Inserts/replaces the row with lifecycle_state = 'active'
         (or 'expired' if expiry_time already in the past).

  Called from the ingest-alerts edge function once per parsed alert, replacing
  the plain `.upsert()` call.

  Returns the new lifecycle_state as text.
*/

CREATE OR REPLACE FUNCTION upsert_alert_with_lifecycle(
  p_alert_id          text,
  p_source            text,
  p_event_type        text,
  p_severity          text,
  p_urgency           text,
  p_certainty         text,
  p_alert_level       text,
  p_location_name     text,
  p_country           text,
  p_state             text,
  p_district          text,
  p_latitude          double precision,
  p_longitude         double precision,
  p_geometry          jsonb,
  p_population_impact bigint,
  p_effective_time    timestamptz,
  p_expiry_time       timestamptz,
  p_description       text,
  p_raw_payload       jsonb
)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_existing_id   uuid;
  v_existing_state text;
  v_new_state     text;
BEGIN
  -- Determine the lifecycle_state for the incoming row
  IF p_expiry_time IS NOT NULL AND p_expiry_time < now() THEN
    v_new_state := 'expired';
  ELSE
    v_new_state := 'active';
  END IF;

  -- Check whether this alert_id already exists
  SELECT id, lifecycle_state
    INTO v_existing_id, v_existing_state
    FROM unified_alerts
   WHERE alert_id = p_alert_id
   LIMIT 1;

  IF v_existing_id IS NULL THEN
    -- Brand-new alert — straight insert
    INSERT INTO unified_alerts (
      alert_id, source, event_type, severity, urgency, certainty,
      alert_level, location_name, country, state, district,
      latitude, longitude, geometry, population_impact,
      effective_time, expiry_time, description, raw_payload,
      lifecycle_state
    ) VALUES (
      p_alert_id, p_source, p_event_type, p_severity, p_urgency, p_certainty,
      p_alert_level, p_location_name, p_country, p_state, p_district,
      p_latitude, p_longitude, p_geometry, p_population_impact,
      p_effective_time, p_expiry_time, p_description, p_raw_payload,
      v_new_state
    );

  ELSE
    -- Existing alert — transition old row to 'updated' (if not already expired/updated)
    -- This UPDATE fires the history trigger, archiving the OLD version.
    IF v_existing_state = 'active' THEN
      UPDATE unified_alerts
         SET lifecycle_state = 'updated',
             updated_at      = now()
       WHERE id = v_existing_id;
    END IF;

    -- Now overwrite the row with the incoming data
    UPDATE unified_alerts
       SET source            = p_source,
           event_type        = p_event_type,
           severity          = p_severity,
           urgency           = p_urgency,
           certainty         = p_certainty,
           alert_level       = p_alert_level,
           location_name     = p_location_name,
           country           = p_country,
           state             = p_state,
           district          = p_district,
           latitude          = p_latitude,
           longitude         = p_longitude,
           geometry          = p_geometry,
           population_impact = p_population_impact,
           effective_time    = p_effective_time,
           expiry_time       = p_expiry_time,
           description       = p_description,
           raw_payload       = p_raw_payload,
           lifecycle_state   = v_new_state,
           updated_at        = now()
     WHERE id = v_existing_id;
  END IF;

  RETURN v_new_state;
END;
$$;
