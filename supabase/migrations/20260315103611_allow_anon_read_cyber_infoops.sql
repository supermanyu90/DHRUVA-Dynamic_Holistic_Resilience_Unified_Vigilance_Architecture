/*
  # Allow anonymous read access for cyber_threats and info_ops

  ## Summary
  The cyber_threats and info_ops tables had SELECT policies only for the
  'authenticated' role. Since DHRUVA is a read-only intelligence dashboard
  accessed without user authentication, the anon role also needs SELECT access.

  ## Changes
  - Add SELECT policy for anon role on cyber_threats
  - Add SELECT policy for anon role on info_ops
*/

CREATE POLICY "Anon users can read threat data"
  ON cyber_threats
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can read info ops"
  ON info_ops
  FOR SELECT
  TO anon
  USING (true);
