-- Migration: Transactional Match Score Upsert
-- Date: 2026-04-30
-- Description: Adds a stored procedure to handle atomic replacement of scores for a job.
-- This ensures that a failed batch insert doesn't leave a job with zero results.

BEGIN;

CREATE OR REPLACE FUNCTION upsert_job_match_scores(
  target_job_id UUID,
  new_scores JSONB
)
RETURNS VOID AS $$
DECLARE
  row_count INT;
BEGIN
  -- 1. Atomic delete of old scores for this job
  DELETE FROM job_match_scores WHERE job_id = target_job_id;

  -- 2. Insert new batch from the JSONB array
  -- We map the JSONB keys directly to columns.
  -- COALESCE is used for array/jsonb columns to ensure default empty values if missing.
  INSERT INTO job_match_scores (
    job_id,
    jobseeker_id,
    utility_score,
    suitability_score,
    grade,
    dimension_scores,
    constraint_violations,
    match_evidence,
    summary,
    ai_summary,
    strengths,
    gaps,
    percentile_rank,
    computed_at
  )
  SELECT
    (val->>'job_id')::UUID,
    (val->>'jobseeker_id')::UUID,
    (val->>'utility_score')::NUMERIC,
    (val->>'suitability_score')::NUMERIC,
    (val->>'grade'),
    (val->'dimension_scores'),
    COALESCE((val->'constraint_violations'), '[]'::jsonb),
    COALESCE((val->'match_evidence'), '{}'::jsonb),
    (val->>'summary'),
    (val->>'ai_summary'),
    COALESCE((val->'strengths'), '[]'::jsonb),
    COALESCE((val->'gaps'), '[]'::jsonb),
    COALESCE((val->>'percentile_rank'), '0')::NUMERIC,
    COALESCE((val->>'computed_at'), now()::text)::TIMESTAMPTZ
  FROM jsonb_array_elements(new_scores) AS val;

  -- Verify insertion
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count = 0 AND jsonb_array_length(new_scores) > 0 THEN
    RAISE EXCEPTION 'Batch insert failed: No rows were inserted despite non-empty payload.';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- PL/pgSQL functions are automatically wrapped in a transaction.
    -- Raising an exception will trigger a rollback of the DELETE and the INSERT.
    RAISE EXCEPTION 'upsert_job_match_scores failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

-- Security: Restrict access to service_role only
ALTER FUNCTION upsert_job_match_scores(UUID, JSONB) OWNER TO postgres;
REVOKE ALL ON FUNCTION upsert_job_match_scores(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_job_match_scores(UUID, JSONB) TO service_role;

COMMIT;
