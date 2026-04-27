-- ============================================================
-- SRS Form 2 / 2A Compliance Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ---- EMPLOYERS TABLE (SRS Form 2: Establishment Listing Sheet) ----

ALTER TABLE employers
  -- Geographic identification (SRS Form 2 header)
  ADD COLUMN IF NOT EXISTS geographic_code        TEXT,
  ADD COLUMN IF NOT EXISTS barangay_chairperson   TEXT,
  ADD COLUMN IF NOT EXISTS barangay_secretary     TEXT,

  -- Establishment details
  ADD COLUMN IF NOT EXISTS industry_code          TEXT,        -- "01"–"17" per DOLE SRS codes
  ADD COLUMN IF NOT EXISTS company_tax_id         TEXT,
  ADD COLUMN IF NOT EXISTS total_paid_employees   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vacant_positions INTEGER DEFAULT 0,

  -- SRS subscriber opt-in (explicit consent)
  ADD COLUMN IF NOT EXISTS srs_subscriber_intent  BOOLEAN DEFAULT TRUE,

  -- SRS Form 2A "Prepared by" footer (stored on employer, reused per submission)
  ADD COLUMN IF NOT EXISTS srs_prepared_by         TEXT,
  ADD COLUMN IF NOT EXISTS srs_prepared_designation TEXT,
  ADD COLUMN IF NOT EXISTS srs_prepared_date        DATE,
  ADD COLUMN IF NOT EXISTS srs_prepared_contact     TEXT;

-- ---- JOBS TABLE (SRS Form 2A: Job Vacancies for Posting) ----

ALTER TABLE jobs
  -- SRS 2A Column 7: Job Status (P=Permanent, T=Temporary, C=Contractual)
  ADD COLUMN IF NOT EXISTS employment_contract_type TEXT
    CHECK (employment_contract_type IN ('P', 'T', 'C')),

  -- SRS 2A: Industry code per job (may differ from employer's default)
  ADD COLUMN IF NOT EXISTS industry_code TEXT,

  -- Age preference (already exists as age_preference_min / age_preference_max — keep)
  -- Main skill (already exists as main_skill_desired — keep)
  -- Ensure age columns exist if they don't already
  ADD COLUMN IF NOT EXISTS age_preference_min INTEGER,
  ADD COLUMN IF NOT EXISTS age_preference_max INTEGER;

-- ============================================================
-- Done. Refresh your Supabase table definitions.
-- ============================================================
