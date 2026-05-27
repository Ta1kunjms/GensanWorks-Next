-- ============================================================
-- Add corrections column to job_match_scores
-- Stores AI skill correction and role equivalence data used
-- during matching, for audit trail and debugging.
-- ============================================================

ALTER TABLE job_match_scores
  ADD COLUMN IF NOT EXISTS corrections JSONB;
