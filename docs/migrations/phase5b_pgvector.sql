-- ============================================================
-- GensanWorks Phase 5B Migration
-- Run this AFTER phase1_migration.sql
-- Requires Supabase pgvector extension
-- ============================================================

-- Enable pgvector extension (run in Supabase SQL editor — may need superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns for semantic matching (768 dimensions for Gemini text-embedding-004)
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS profile_embedding vector(768);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_embedding vector(768);

-- Index for fast approximate nearest-neighbor search (HNSW)
CREATE INDEX IF NOT EXISTS idx_jobseeker_profile_embedding
  ON jobseekers USING hnsw (profile_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_job_embedding
  ON jobs USING hnsw (job_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function to compute cosine similarity (returns nsrp_id + similarity score)
-- Note: jobseekers table uses nsrp_id as primary identifier; join with users table for UUID lookups
CREATE OR REPLACE FUNCTION match_jobseekers_to_job(
  job_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  nsrp_id TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    js.nsrp_id,
    1 - (js.profile_embedding <=> j.job_embedding) AS similarity
  FROM jobseekers js
  CROSS JOIN jobs j
  WHERE j.id = job_id
    AND js.profile_embedding IS NOT NULL
    AND j.job_embedding IS NOT NULL
    AND 1 - (js.profile_embedding <=> j.job_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
