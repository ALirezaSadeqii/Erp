-- Heartbeat table — keeps exactly one row (id = 1) that records
-- the last time the external ping workflow successfully called the API.
-- Safe to run against an existing database: uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS heartbeat (
  id        INTEGER PRIMARY KEY,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the singleton row only if it does not already exist.
INSERT INTO heartbeat (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;
