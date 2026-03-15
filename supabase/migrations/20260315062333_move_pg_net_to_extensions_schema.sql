/*
  # Move pg_net extension to extensions schema

  ## Summary
  Moves the pg_net extension from the public schema to the extensions schema.
  Extensions should not live in the public schema as it exposes internal
  functions to all users.

  ## Changes
  - Drops pg_net from public schema
  - Reinstalls pg_net in the extensions schema
*/

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;
