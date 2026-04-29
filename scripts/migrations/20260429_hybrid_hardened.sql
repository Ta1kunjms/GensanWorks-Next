-- Hardened Matching Schema Updates
ALTER TABLE job_match_scores 
  ADD COLUMN IF NOT EXISTS feature_vector JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS match_evidence JSONB DEFAULT '{}'::jsonb;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_match_scores_feature_vector ON job_match_scores USING gin (feature_vector);
