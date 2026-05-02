-- Migration: Fix match_feedback_logs schema
-- Date: 2026-04-30
-- Description: Ensures the feedback table has all columns required by the Feedback API.

BEGIN;

-- 1. Ensure table exists with base columns
CREATE TABLE IF NOT EXISTS match_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    jobseeker_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns used by the API
ALTER TABLE match_feedback_logs ADD COLUMN IF NOT EXISTS interaction_type TEXT;
ALTER TABLE match_feedback_logs ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0;
ALTER TABLE match_feedback_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE match_feedback_logs ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT now();

-- 3. Add performance indices
CREATE INDEX IF NOT EXISTS idx_match_feedback_job_seeker ON match_feedback_logs(job_id, jobseeker_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_captured ON match_feedback_logs(captured_at DESC);

COMMIT;
