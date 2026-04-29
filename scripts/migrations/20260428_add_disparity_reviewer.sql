-- Add reviewer sign-off fields and statistical metadata to match_disparity_flags
ALTER TABLE match_disparity_flags
  ADD COLUMN IF NOT EXISTS statistical_test TEXT,
  ADD COLUMN IF NOT EXISTS p_value NUMERIC,
  ADD COLUMN IF NOT EXISTS disparity_reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS disparity_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;
