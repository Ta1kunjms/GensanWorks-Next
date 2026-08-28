-- Migration: Add matching_completeness_pct column to jobseekers table
-- Date: 2026-08-28
-- Description: Adds dedicated 0-100 integer metric for AI-compatible matching completeness (SO1).

BEGIN;

ALTER TABLE public.jobseekers
ADD COLUMN IF NOT EXISTS matching_completeness_pct INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobseekers_matching_completeness ON public.jobseekers (matching_completeness_pct);

COMMIT;
