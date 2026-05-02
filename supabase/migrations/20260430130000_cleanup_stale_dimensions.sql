-- Migration: Cleanup Stale f4/f5 Keys
-- Date: 2026-04-30
-- Description: Removes deprecated logistics (f4) and salary (f5) keys from dimension_scores JSONB.

/**
 * PRE-EXECUTION NOTES:
 * 1. BACKUP RECOMMENDED: This is a destructive data modification. 
 * 2. ESTIMATED IMPACT: Approx 50ms per 10k rows. 
 * 3. MAINTENANCE WINDOW: Not required. Postgres handles JSONB updates online, 
 *    though it will lock affected rows briefly.
 *
 * WHY THE '-' OPERATOR?
 * We use 'dimension_scores - f4' instead of jsonb_strip_nulls.
 * jsonb_strip_nulls only removes keys with a NULL value. Since f4 and f5
 * contain numeric scores, they would be ignored by stripping nulls.
 * The '-' operator explicitly removes the key-value pair regardless of value.
 */

BEGIN;

-- 1. Perform the update
UPDATE job_match_scores
SET dimension_scores = dimension_scores - 'f4' - 'f5'
WHERE dimension_scores ? 'f4' OR dimension_scores ? 'f5';

-- 2. Verification
DO $$
DECLARE
  stale_count INT;
BEGIN
  SELECT count(*) INTO stale_count
  FROM job_match_scores 
  WHERE dimension_scores ? 'f4' OR dimension_scores ? 'f5';

  IF stale_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % rows still contain stale keys.', stale_count;
  END IF;
  
  RAISE NOTICE 'Migration successful. All f4/f5 keys purged.';
END $$;

COMMIT;

-- FINAL AUDIT QUERY
SELECT count(*) AS remaining_stale_rows 
FROM job_match_scores 
WHERE dimension_scores ? 'f4' OR dimension_scores ? 'f5';
