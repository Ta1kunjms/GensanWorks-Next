-- Add versioning and privacy-safe logging fields to job match scores
ALTER TABLE job_match_scores
  ADD COLUMN IF NOT EXISTS score_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_hash TEXT,
  ADD COLUMN IF NOT EXISTS parameter_fingerprint JSONB,
  ADD COLUMN IF NOT EXISTS semantic_pairs_reviewed INTEGER DEFAULT 0;
