-- Migration: Compute True Percentile Rank
-- Date: 2026-04-30
-- Description: Adds an RPC to calculate actual percent_rank() for all candidates of a job.

BEGIN;

CREATE OR REPLACE FUNCTION compute_job_percentiles(target_job_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update each row using a CTE that calculates the percent_rank
  -- partitioned by job_id (though we filter to target_job_id).
  WITH ranked_scores AS (
    SELECT 
      id,
      PERCENT_RANK() OVER (
        PARTITION BY job_id 
        ORDER BY utility_score ASC
      ) as true_percentile
    FROM job_match_scores
    WHERE job_id = target_job_id
  )
  UPDATE job_match_scores
  SET percentile_rank = ranked_scores.true_percentile
  FROM ranked_scores
  WHERE job_match_scores.id = ranked_scores.id;
END;
$$ LANGUAGE plpgsql;

-- Security: Restrict access to service_role only
ALTER FUNCTION compute_job_percentiles(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION compute_job_percentiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compute_job_percentiles(UUID) TO service_role;

COMMIT;
