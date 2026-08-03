-- ============================================================
-- Heartbeat table — keeps the Supabase Free project active
-- by being touched on a recurring schedule.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS heartbeat (
  id        INTEGER      PRIMARY KEY,
  last_ping TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed the singleton row (id = 1).
-- ON CONFLICT DO NOTHING makes this idempotent.
INSERT INTO heartbeat (id, last_ping)
VALUES (1, NOW())
ON CONFLICT (id) DO NOTHING;
