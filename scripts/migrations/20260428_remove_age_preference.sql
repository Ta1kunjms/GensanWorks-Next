-- Remove age-preference fields from jobs to prevent age discrimination
ALTER TABLE jobs
  DROP COLUMN IF EXISTS age_preference_min,
  DROP COLUMN IF EXISTS age_preference_max;
