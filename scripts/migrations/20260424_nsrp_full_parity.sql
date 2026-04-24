-- ============================================================
-- NSRP Form 1 Full Parity Migration
-- Date: 2026-04-24
-- Adds all fields from the DOLE NSRP Form 1 (September 2020)
-- that were missing from the schema.
-- ============================================================

-- -------------------------------------------------------
-- 1. jobseekers: Add disability-specific columns
--    (Form I: DISABILITY checkboxes)
-- -------------------------------------------------------
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS disability_visual   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_speech   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_mental   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_hearing  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_physical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_others   TEXT;

-- -------------------------------------------------------
-- 2. jobseekers: Expand preferred work locations to 3 each
--    (Form II: 3 rows for Local, 3 rows for Overseas)
-- -------------------------------------------------------
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS preferred_work_location_local_1    TEXT,
  ADD COLUMN IF NOT EXISTS preferred_work_location_local_2    TEXT,
  ADD COLUMN IF NOT EXISTS preferred_work_location_local_3    TEXT,
  ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_1 TEXT,
  ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_2 TEXT,
  ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_3 TEXT;

-- -------------------------------------------------------
-- 3. jobseekers: Add missing unemployed reason
--    (Form I: "Terminated/Laid off due to calamity")
-- -------------------------------------------------------
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS unemployed_due_to_calamity BOOLEAN DEFAULT false;

-- -------------------------------------------------------
-- 4. jobseeker_education: Add K12 and school name fields
--    (Form IV: Secondary (Non-K12) / (K12), Senior High Strand)
-- -------------------------------------------------------
ALTER TABLE jobseeker_education
  ADD COLUMN IF NOT EXISTS school_name       TEXT,
  ADD COLUMN IF NOT EXISTS secondary_type    TEXT,  -- 'Non-K12' or 'K12'
  ADD COLUMN IF NOT EXISTS senior_high_strand TEXT;
