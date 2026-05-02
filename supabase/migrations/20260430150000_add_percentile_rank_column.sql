-- Migration: Add percentile_rank column
-- Date: 2026-04-30
-- Description: Adds a numeric column to store the true pool-wide percentile rank.

BEGIN;

-- Add the column if it doesn't exist
ALTER TABLE job_match_scores 
ADD COLUMN IF NOT EXISTS percentile_rank NUMERIC DEFAULT 0;

-- Optional: Add index for performance on percentile-based filtering
CREATE INDEX IF NOT EXISTS idx_job_match_scores_percentile ON job_match_scores (job_id, percentile_rank DESC);

COMMIT;
