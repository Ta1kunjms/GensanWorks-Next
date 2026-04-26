-- ============================================================
-- GensanWorks Phase 1 Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Job-seeking status for jobseekers
ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS job_seeking_status TEXT NOT NULL DEFAULT 'not_looking'
    CHECK (job_seeking_status IN ('actively_looking', 'open', 'not_looking'));

-- 2. Applications: extra fields for the full apply flow
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct'
    CHECK (source IN ('direct', 'referred')),
  ADD COLUMN IF NOT EXISTS expected_salary TEXT,
  ADD COLUMN IF NOT EXISTS availability_date DATE,
  ADD COLUMN IF NOT EXISTS nsrp_forwarded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extra_attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ;

-- Normalise existing status values to new pipeline names
UPDATE applications SET status = 'under_review' WHERE status = 'pending';
UPDATE applications SET status = 'hired'        WHERE status = 'accepted';

-- 3. Employers: SRS approval workflow
ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS srs_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (srs_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS srs_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS srs_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS srs_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS srs_version INTEGER NOT NULL DEFAULT 1;

-- 4. Jobs: extra metadata
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS work_setup TEXT DEFAULT 'onsite'
    CHECK (work_setup IN ('onsite', 'remote', 'hybrid')),
  ADD COLUMN IF NOT EXISTS psoc_code TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slots_remaining INTEGER;

-- Back-fill slots_remaining from existing vacancies column
UPDATE jobs SET slots_remaining = vacancies WHERE slots_remaining IS NULL AND vacancies IS NOT NULL;

-- 5. Referral slips table
CREATE TABLE IF NOT EXISTS referral_slips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number   TEXT NOT NULL UNIQUE,           -- e.g. RS-2025-00142
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  applicant_id  UUID NOT NULL,                  -- references jobseeker user_id
  issued_by     UUID NOT NULL,                  -- admin user id
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMPTZ NOT NULL,           -- issued_at + 30 days
  pdf_url       TEXT,
  qr_code_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued', 'hired', 'not_hired')),
  notified_at   TIMESTAMPTZ,
  employer_feedback_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Message threads (links application ↔ jobseeker ↔ employer)
CREATE TABLE IF NOT EXISTS message_threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID REFERENCES applications(id) ON DELETE SET NULL,
  jobseeker_id      UUID NOT NULL,
  employer_id       UUID NOT NULL,
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  last_message_at   TIMESTAMPTZ,
  jobseeker_unread  INTEGER NOT NULL DEFAULT 0,
  employer_unread   INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(jobseeker_id, employer_id, job_id)
);

-- 7. Add thread_id + sender_role to messages (existing table)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('jobseeker', 'employer', 'admin')),
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- Enable Supabase Realtime on messages
ALTER TABLE messages REPLICA IDENTITY FULL;

-- 8. AI Matching scores (Phase 5 — add now so schema is ready)
CREATE TABLE IF NOT EXISTS job_match_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id      UUID NOT NULL,
  suitability_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (suitability_score BETWEEN 0 AND 100),
  score_breakdown   JSONB DEFAULT '{}'::jsonb,
  top_reasons       JSONB DEFAULT '[]'::jsonb,
  bias_flags        JSONB DEFAULT '[]'::jsonb,
  ai_summary        TEXT,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_to_employer  BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, jobseeker_id)
);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_job_match_scores_job_score
  ON job_match_scores(job_id, suitability_score DESC);

-- 9. Row Level Security policies (basic)
ALTER TABLE referral_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_match_scores ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (API uses supabaseAdmin which uses service key)
-- These are placeholder policies — adjust based on your auth setup
DROP POLICY IF EXISTS "Service role full access on referral_slips" ON referral_slips;
CREATE POLICY "Service role full access on referral_slips"
  ON referral_slips FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on message_threads" ON message_threads;
CREATE POLICY "Service role full access on message_threads"
  ON message_threads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on job_match_scores" ON job_match_scores;
CREATE POLICY "Service role full access on job_match_scores"
  ON job_match_scores FOR ALL USING (true) WITH CHECK (true);

-- 10. SRS Approval History (for admin audit logs)
CREATE TABLE IF NOT EXISTS srs_approval_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id   UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'pending')),
  reason        TEXT,
  admin_note    TEXT,
  admin_id      UUID NOT NULL,
  admin_name    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE srs_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on srs_approval_history" ON srs_approval_history;
CREATE POLICY "Service role full access on srs_approval_history"
  ON srs_approval_history FOR ALL USING (true) WITH CHECK (true);
