-- Store privacy-safe matching log metadata instead of prompt text
ALTER TABLE ai_matching_logs
  ADD COLUMN IF NOT EXISTS prompt_hash TEXT,
  ADD COLUMN IF NOT EXISTS parameter_fingerprint JSONB,
  ADD COLUMN IF NOT EXISTS semantic_pairs_reviewed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS constraint_violations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score_version TEXT;
