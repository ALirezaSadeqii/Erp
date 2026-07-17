-- Change painted_parts_count and bodywork_parts_count from INTEGER to NUMERIC
-- so that decimal values (e.g. 2.5 parts) are accepted.
-- Existing integer values are automatically cast — no data loss.

ALTER TABLE visits
  ALTER COLUMN painted_parts_count TYPE NUMERIC,
  ALTER COLUMN bodywork_parts_count TYPE NUMERIC;
