-- ============================================================
-- Utility Agent Setup: Stage 3 Matching Engine
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Enhance Jobseeker metadata for precise matching
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS work_setup_preference TEXT DEFAULT 'any'
    CHECK (work_setup_preference IN ('onsite', 'remote', 'hybrid', 'any')),
  ADD COLUMN IF NOT EXISTS expected_salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_salary_max NUMERIC;

-- 2. Enhance Job Vacancy metadata for precise matching
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC;

-- 3. Patch existing job_match_scores table to match the new agent output
--    (The table was created in phase1_migration.sql with suitability_score)
ALTER TABLE job_match_scores
  ADD COLUMN IF NOT EXISTS utility_score    NUMERIC(5,2) CHECK (utility_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS grade            TEXT CHECK (grade IN ('Excellent', 'Strong', 'Good', 'Fair', 'Weak')),
  ADD COLUMN IF NOT EXISTS dimension_scores JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS skill_breakdown  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary          TEXT,
  ADD COLUMN IF NOT EXISTS strengths        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gaps             JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS constraint_violations JSONB DEFAULT '[]'::jsonb;

-- Back-fill utility_score from existing suitability_score where not yet set
UPDATE job_match_scores
SET utility_score = suitability_score
WHERE utility_score IS NULL AND suitability_score IS NOT NULL;

-- Index for fast ranking by utility_score
CREATE INDEX IF NOT EXISTS idx_job_match_scores_utility_rank
  ON job_match_scores(job_id, utility_score DESC);

-- 4. AI Audit Log for usage tracking
CREATE TABLE IF NOT EXISTS ai_matching_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  jobseeker_id      UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  model_used        TEXT,
  latency_ms        INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_matching_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on ai_matching_logs" ON ai_matching_logs;
CREATE POLICY "Service role full access on ai_matching_logs"
  ON ai_matching_logs FOR ALL USING (true) WITH CHECK (true);
