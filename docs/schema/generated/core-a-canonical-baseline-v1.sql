BEGIN;

-- ============================================================================
-- 1. Extensions
-- ============================================================================

-- pgvector: required for embedding-similarity matching dimensions (768-dim).
-- TODO(pre-execution-review): IF NOT EXISTS retained because `vector` may already be
-- preinstalled/preconfigured in the target Supabase project; confirm installed schema
-- and availability in the approved synthetic target before any execution.
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================================
-- 2. Role profiles
-- ============================================================================

CREATE TABLE jobseekers (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email               TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: retained for compatibility with existing application code.
  password_hash       TEXT NOT NULL DEFAULT 'auth_managed',

  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  middle_name         TEXT,
  suffix              TEXT,
  birth_date          DATE,
  gender              TEXT,
  religion            TEXT,
  civil_status        TEXT,
  tin                 TEXT,
  height              TEXT,
  is_pwd              BOOLEAN NOT NULL DEFAULT false,
  pwd_type            TEXT,
  pwd_type_others     TEXT,
  phone               TEXT,

  house_number        TEXT,
  barangay            TEXT,
  city                TEXT,
  province            TEXT,
  zip_code            TEXT,

  employment_status          TEXT,
  employment_type            TEXT,
  self_employed_type         TEXT,
  self_employed_type_others  TEXT,
  unemployed_reason          TEXT,
  unemployed_months          INTEGER,
  unemployed_due_to_calamity BOOLEAN NOT NULL DEFAULT false,
  terminated_country         TEXT,
  terminated_reason          TEXT,

  is_ofw                      BOOLEAN NOT NULL DEFAULT false,
  ofw_country                 TEXT,
  is_former_ofw               BOOLEAN NOT NULL DEFAULT false,
  former_ofw_country          TEXT,
  former_ofw_return_month_year TEXT,

  is_four_ps          BOOLEAN NOT NULL DEFAULT false,
  household_id_no     TEXT,

  disability_visual    BOOLEAN NOT NULL DEFAULT false,
  disability_speech    BOOLEAN NOT NULL DEFAULT false,
  disability_mental    BOOLEAN NOT NULL DEFAULT false,
  disability_hearing   BOOLEAN NOT NULL DEFAULT false,
  disability_physical  BOOLEAN NOT NULL DEFAULT false,
  disability_others    TEXT,

  preference_part_time BOOLEAN NOT NULL DEFAULT false,
  preference_full_time BOOLEAN NOT NULL DEFAULT false,
  preferred_occupation_1 TEXT,
  preferred_occupation_2 TEXT,
  preferred_occupation_3 TEXT,

  settings            JSONB DEFAULT '{}'::jsonb,

  preferred_work_location_local      TEXT,
  preferred_work_location_overseas   TEXT,
  preferred_work_location_local_1    TEXT,
  preferred_work_location_local_2    TEXT,
  preferred_work_location_local_3    TEXT,
  preferred_work_location_overseas_1 TEXT,
  preferred_work_location_overseas_2 TEXT,
  preferred_work_location_overseas_3 TEXT,

  other_skills        JSONB,
  other_skills_others TEXT,

  profile_image       TEXT,

  nsrp_id              TEXT,
  profile_complete     BOOLEAN NOT NULL DEFAULT false,
  profile_completeness INTEGER NOT NULL DEFAULT 0,
  matching_completeness_pct INTEGER NOT NULL DEFAULT 0,

  job_seeking_status   TEXT NOT NULL DEFAULT 'not_looking'
                          CHECK (job_seeking_status IN ('actively_looking', 'open', 'not_looking')),

  work_setup_preference TEXT DEFAULT 'any'
                          CHECK (work_setup_preference IN ('onsite', 'remote', 'hybrid', 'any')),
  expected_salary_min  NUMERIC,
  expected_salary_max  NUMERIC,

  profile_embedding    vector(768),

  consent_given_at                 TIMESTAMPTZ,
  consent_privacy_notice_version   TEXT,

  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employers (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email               TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: retained for compatibility with existing application code.
  password_hash       TEXT NOT NULL DEFAULT 'auth_managed',

  establishment_name  TEXT NOT NULL,

  province            TEXT,
  city                TEXT,
  barangay            TEXT,
  address             TEXT,

  total_paid_employees    INTEGER,
  total_vacant_positions  INTEGER,
  industry                TEXT,
  industry_code           TEXT,

  contact_person       TEXT,
  contact_phone        TEXT,
  designation          TEXT,
  company_tax_id       TEXT,

  srs_form_file           TEXT,
  business_permit_file    TEXT,
  bir_2303_file           TEXT,
  company_profile_file    TEXT,
  dole_certification_file TEXT,

  profile_image        TEXT,

  account_status       TEXT NOT NULL DEFAULT 'pending',
  verified_at          TIMESTAMPTZ,

  srs_status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (srs_status IN ('pending', 'approved', 'rejected')),
  srs_rejection_reason  TEXT,
  srs_submitted_at       TIMESTAMPTZ,
  srs_approved_at         TIMESTAMPTZ,
  srs_version           INTEGER NOT NULL DEFAULT 1,

  consent_given_at                 TIMESTAMPTZ,
  consent_privacy_notice_version   TEXT,

  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_login           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admins (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: retained for compatibility with existing application code.
  password_hash TEXT NOT NULL DEFAULT 'auth_managed',

  role          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 3. Jobseeker child tables
-- ============================================================================

CREATE TABLE jobseeker_languages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  language     TEXT NOT NULL,
  read         BOOLEAN NOT NULL DEFAULT false,
  write        BOOLEAN NOT NULL DEFAULT false,
  speak        BOOLEAN NOT NULL DEFAULT false,
  understand   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: Matching derives jobseeker education from this child table (jobseeker_education.level),
-- not from a flat jobseekers.education_level column.
CREATE TABLE jobseeker_education (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id        UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  currently_in_school BOOLEAN NOT NULL DEFAULT false,
  level               TEXT,
  course              TEXT,
  year_graduated      TEXT,
  level_reached       TEXT,
  year_last_attended  TEXT,
  school_name         TEXT,
  secondary_type      TEXT,
  senior_high_strand  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobseeker_trainings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id          UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  course                TEXT,
  hours_of_training     INTEGER,
  training_institution  TEXT,
  skills_acquired       TEXT,
  certificates_received TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobseeker_licenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id         UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  eligibility          TEXT,
  date_taken           DATE,
  professional_license TEXT,
  valid_until          DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobseeker_experience (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id     UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  company_name     TEXT NOT NULL,
  address          TEXT,
  position         TEXT NOT NULL,
  number_of_months INTEGER,
  status           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 4. Jobs, applications, referrals, and referral slips
-- ============================================================================

CREATE TABLE jobs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id                 UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  position_title              TEXT NOT NULL,
  description                 TEXT,
  employment_contract_type    TEXT,
  location                    TEXT,
  industry_code               TEXT,

  minimum_education_required  TEXT,
  main_skill_desired          TEXT,
  years_of_experience_required INTEGER,
  starting_salary             TEXT,
  salary_min                  NUMERIC,
  salary_max                  NUMERIC,
  salary_period               TEXT DEFAULT 'monthly',
  job_status                  TEXT,

  work_setup    TEXT DEFAULT 'onsite'
                  CHECK (work_setup IN ('onsite', 'remote', 'hybrid')),
  work_type     TEXT DEFAULT 'Full-time',
  psoc_code     TEXT,
  featured      BOOLEAN NOT NULL DEFAULT false,
  slots_remaining INTEGER,

  published_at  TIMESTAMPTZ,
  category      TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT false,

  vacancies     INTEGER NOT NULL DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  archived      BOOLEAN NOT NULL DEFAULT false,

  job_embedding vector(768),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  applicant_id       UUID NOT NULL REFERENCES jobseekers(id) ON DELETE RESTRICT,
  employer_id        UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,

  cover_letter       TEXT,
  resume_url         TEXT,
  feedback           TEXT,

  applicant_name     TEXT,
  applicant_email    TEXT,

  status             TEXT NOT NULL DEFAULT 'under_review'
                       CHECK (status IN (
                         'pending', 'under_review', 'reviewed', 'shortlisted',
                         'interview', 'hired', 'rejected', 'withdrawn'
                       )),
  match_score        NUMERIC,
  source             TEXT NOT NULL DEFAULT 'direct'
                       CHECK (source IN ('direct', 'referred')),
  expected_salary    TEXT,
  availability_date  DATE,
  nsrp_forwarded     BOOLEAN NOT NULL DEFAULT false,
  extra_attachments  JSONB DEFAULT '[]'::jsonb,
  rejection_reason   TEXT,
  interview_date     TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  jobseeker_id   UUID NOT NULL REFERENCES jobseekers(id) ON DELETE RESTRICT,
  employer_id    UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'referred',
  date_referred  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_slips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number   TEXT NOT NULL UNIQUE,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  applicant_id  UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  issued_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until   TIMESTAMPTZ NOT NULL,
  pdf_url       TEXT,
  qr_code_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued', 'hired', 'not_hired')),
  notified_at   TIMESTAMPTZ,
  referral_id   UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 5. Account lifecycle, notifications, audit, saved jobs, and admin support
-- ============================================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64) NOT NULL,
  role          VARCHAR(50) CHECK (role IS NULL OR role IN ('jobseeker', 'employer', 'admin')),
  type          VARCHAR(50) DEFAULT 'system',
  title         VARCHAR(255) NOT NULL,
  message       TEXT NOT NULL,
  related_id    UUID,
  related_type  VARCHAR(50),
  read          BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  email         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'cancelled', 'processed')),
  reason        TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  delete_after  TIMESTAMPTZ NOT NULL,
  cancelled_at  TIMESTAMPTZ,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canonical source: docs/schema/proposed-canonical-baseline.sql:901-931 (binding decision #10).
CREATE TABLE admin_access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  organization  TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Canonical source: docs/schema/proposed-canonical-baseline.sql:1645-1662.
CREATE TABLE srs_approval_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'pending')),
  reason      TEXT,
  admin_note  TEXT,
  admin_id    UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_lifecycle_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL CHECK (kind IN ('password_reset', 'email_verify')),
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  user_id       UUID NOT NULL,
  email         TEXT NOT NULL,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_email_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  user_id       UUID NOT NULL,
  email         TEXT NOT NULL,
  verified_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, user_id)
);

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  role           TEXT NOT NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    TEXT,
  payload        JSONB DEFAULT '{}'::jsonb,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobseeker_saved_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id  UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jobseeker_id, job_id)
);


-- ============================================================================
-- 6. Matching tables and caches
-- ============================================================================

CREATE TABLE job_match_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                  UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id            UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  suitability_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (suitability_score BETWEEN 0 AND 100),
  utility_score           NUMERIC(5,2) CHECK (utility_score BETWEEN 0 AND 100),
  grade                   TEXT CHECK (grade IN ('Excellent', 'Strong', 'Good', 'Fair', 'Weak')),
  score_breakdown         JSONB DEFAULT '{}'::jsonb,
  dimension_scores        JSONB DEFAULT '{}'::jsonb,
  skill_breakdown         JSONB DEFAULT '[]'::jsonb,
  top_reasons             JSONB DEFAULT '[]'::jsonb,
  bias_flags              JSONB DEFAULT '[]'::jsonb,
  strengths               JSONB DEFAULT '[]'::jsonb,
  gaps                    JSONB DEFAULT '[]'::jsonb,
  constraint_violations   JSONB DEFAULT '[]'::jsonb,
  ai_summary              TEXT,
  summary                 TEXT,
  corrections             JSONB,
  percentile_rank         NUMERIC DEFAULT 0,
  score_version           TEXT,
  prompt_hash             TEXT,
  parameter_fingerprint   JSONB,
  semantic_pairs_reviewed INTEGER DEFAULT 0,
  feature_vector          JSONB DEFAULT '{}'::jsonb,
  match_evidence          JSONB DEFAULT '{}'::jsonb,
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to_employer        BOOLEAN NOT NULL DEFAULT false,
  sent_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, jobseeker_id)
);

CREATE TABLE ai_matching_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                  UUID REFERENCES jobs(id) ON DELETE SET NULL,
  jobseeker_id            UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  prompt_tokens           INTEGER,
  completion_tokens       INTEGER,
  model_used              TEXT,
  latency_ms              INTEGER,
  prompt_hash             TEXT,
  parameter_fingerprint   JSONB,
  semantic_pairs_reviewed INTEGER DEFAULT 0,
  constraint_violations   JSONB DEFAULT '[]'::jsonb,
  score_version           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skill_correction_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input   TEXT NOT NULL UNIQUE,
  corrected   TEXT NOT NULL,
  confidence  FLOAT,
  hit_count   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_equivalence_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_a      TEXT NOT NULL,
  role_b      TEXT NOT NULL,
  same_role   BOOLEAN NOT NULL,
  similarity  FLOAT,
  reasoning   TEXT,
  hit_count   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_a, role_b)
);

CREATE TABLE skill_synonyms (
  id          BIGSERIAL PRIMARY KEY,
  alias       TEXT NOT NULL,
  canonical   TEXT NOT NULL,
  source      TEXT DEFAULT 'ai',
  confidence  FLOAT DEFAULT 1.0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skill_embeddings_cache (
  id          BIGSERIAL PRIMARY KEY,
  skill_term  TEXT NOT NULL UNIQUE,
  vector      FLOAT[] NOT NULL,
  model       TEXT DEFAULT 'text-embedding-3-small',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TODO(authoring-review): The schema for ranking_cache was inferred from current TypeScript call sites
-- (app/lib/matching/ranking-cache-engine.ts) and requires human review before any remote execution.
CREATE TABLE ranking_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  results     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id)
);

-- TODO(authoring-review): The schema for jobseeker_features was inferred from current TypeScript call sites
-- (app/lib/matching/feature-store.ts) and requires human review before any remote execution.
CREATE TABLE jobseeker_features (
  id                 UUID PRIMARY KEY REFERENCES jobseekers(id) ON DELETE CASCADE,
  skill_vector       JSONB,
  exp_vector         JSONB,
  ontology_scores    JSONB DEFAULT '{}'::jsonb,
  calibration_factor NUMERIC DEFAULT 1.0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 7. Required indexes
-- ============================================================================

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

-- Auth lifecycle tokens index
CREATE INDEX idx_auth_lifecycle_tokens_lookup
  ON auth_lifecycle_tokens (token_hash, kind, consumed_at, expires_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

-- Job match scores indexes
CREATE INDEX idx_job_match_scores_job_score ON job_match_scores (job_id, suitability_score DESC);
CREATE INDEX idx_job_match_scores_utility_rank ON job_match_scores (job_id, utility_score DESC);
CREATE INDEX idx_job_match_scores_percentile ON job_match_scores (job_id, percentile_rank DESC);
CREATE INDEX idx_job_match_scores_feature_vector ON job_match_scores USING gin (feature_vector);

-- Matching caches and synonyms indexes
CREATE INDEX idx_skill_correction_cache_raw_input ON skill_correction_cache (raw_input);
CREATE INDEX idx_role_equivalence_cache_roles ON role_equivalence_cache (role_a, role_b);
CREATE UNIQUE INDEX idx_skill_synonyms_alias ON skill_synonyms (alias);
CREATE INDEX idx_skill_synonyms_canonical ON skill_synonyms (canonical);
CREATE INDEX idx_skill_embeddings_cache_term ON skill_embeddings_cache (skill_term);

-- Jobseeker completeness index
CREATE INDEX idx_jobseekers_matching_completeness ON jobseekers (matching_completeness_pct);

-- Vector HNSW indexes (768 dimensions, cosine distance)
CREATE INDEX idx_jobseeker_profile_embedding
  ON jobseekers USING hnsw (profile_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_job_embedding
  ON jobs USING hnsw (job_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);


-- ============================================================================
-- 8. Signup provisioning function and trigger
-- ============================================================================

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_establishment_name TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'jobseeker');
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_establishment_name := NEW.raw_user_meta_data->>'establishment_name';

  IF v_first_name IS NULL AND v_full_name IS NOT NULL THEN
    v_first_name := split_part(v_full_name, ' ', 1);
  END IF;

  IF v_last_name IS NULL AND v_full_name IS NOT NULL THEN
    v_last_name := substring(v_full_name from position(' ' in v_full_name) + 1);
  END IF;

  v_first_name := COALESCE(v_first_name, 'User');
  v_last_name := COALESCE(v_last_name, '');

  IF (v_role = 'jobseeker') THEN
    INSERT INTO public.jobseekers (id, email, first_name, last_name, password_hash)
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      'auth_managed'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = now();

  ELSIF (v_role = 'employer') THEN
    INSERT INTO public.employers (id, email, establishment_name, contact_person, password_hash)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(v_establishment_name, 'Unnamed Employer'),
      COALESCE(v_full_name, v_first_name),
      'auth_managed'
    )
    ON CONFLICT (id) DO UPDATE SET
      establishment_name = EXCLUDED.establishment_name,
      contact_person = EXCLUDED.contact_person,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 9. Matching RPC functions and restricted permissions
-- ============================================================================

CREATE FUNCTION match_jobseekers_to_job(
  job_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  nsrp_id TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    js.id,
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

CREATE FUNCTION upsert_job_match_scores(
  target_job_id UUID,
  new_scores JSONB
)
RETURNS VOID AS $$
DECLARE
  row_count INT;
BEGIN
  DELETE FROM job_match_scores WHERE job_id = target_job_id;

  INSERT INTO job_match_scores (
    job_id, jobseeker_id, utility_score, suitability_score, grade,
    dimension_scores, constraint_violations, match_evidence, summary,
    ai_summary, strengths, gaps, percentile_rank, computed_at, corrections
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
    COALESCE((val->>'computed_at'), now()::text)::TIMESTAMPTZ,
    COALESCE((val->'corrections'), '[]'::jsonb)
  FROM jsonb_array_elements(new_scores) AS val;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count = 0 AND jsonb_array_length(new_scores) > 0 THEN
    RAISE EXCEPTION 'Batch insert failed: No rows were inserted despite non-empty payload.';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'upsert_job_match_scores failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION compute_job_percentiles(target_job_id UUID)
RETURNS VOID AS $$
BEGIN
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

-- TODO(pre-execution-review): Confirm that service_role exists and is the intended execution role
-- in the approved managed Supabase synthetic target before applying these grants.
REVOKE ALL ON FUNCTION upsert_job_match_scores(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_job_match_scores(UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION compute_job_percentiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compute_job_percentiles(UUID) TO service_role;

COMMIT;
