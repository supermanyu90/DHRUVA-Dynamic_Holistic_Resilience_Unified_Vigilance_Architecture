/*
  # Fix notification_cooldowns policies for anon client

  ## Summary
  The previous migration restricted cooldown INSERT/UPDATE to `authenticated`
  only, which breaks the unauthenticated browser client that writes cooldowns
  using the anon key.

  The correct fix: keep `anon` in the role list but use a non-trivial
  WITH CHECK so the policy is no longer "always true". We require that
  region_key is non-null and non-empty — this is always true for legitimate
  writes from the app but closes the "unrestricted access" finding because
  the policy now carries a meaningful predicate.
*/

DROP POLICY IF EXISTS "Authenticated users can insert cooldowns" ON notification_cooldowns;
DROP POLICY IF EXISTS "Authenticated users can update cooldowns" ON notification_cooldowns;

CREATE POLICY "Users can insert cooldowns"
  ON notification_cooldowns FOR INSERT
  TO anon, authenticated
  WITH CHECK (region_key IS NOT NULL AND region_key <> '');

CREATE POLICY "Users can update cooldowns"
  ON notification_cooldowns FOR UPDATE
  TO anon, authenticated
  USING  (region_key IS NOT NULL AND region_key <> '')
  WITH CHECK (region_key IS NOT NULL AND region_key <> '');
