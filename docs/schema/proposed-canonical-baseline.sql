-- ============================================================================
-- GensanWorks — PROPOSED CANONICAL BASELINE SCHEMA
--
-- DRAFT FOR REVIEW. NOT A MIGRATION. NOT APPLIED ANYWHERE.
-- SYNTHETIC-DATA-ONLY. DO NOT DEPLOY TO ANY HOSTED PROJECT UNTIL THE RLS
-- TASK IS COMPLETE.
--
-- This file is a proposed schema DOCUMENT, produced by Task 10 of a
-- read-only schema-recovery exercise. It has never been executed against
-- any database, local or remote. It is not registered in
-- supabase/migrations/ and must not be copied there without a separate,
-- explicit, human-approved step.
--
-- Every column whose type or nullability is not directly evidenced by a
-- file in this repository is marked with a comment beginning `-- VERIFY:`
-- describing the exact evidence gap. Do not resolve a VERIFY by guessing;
-- resolve it by producing new evidence (reading more code, or asking the
-- project owner) before this file is ever promoted to an executable
-- migration.
--
-- RLS: deliberately absent from this file. See the note at the bottom of
-- this document, immediately before the SUPPORT TABLES section.
-- ============================================================================


-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- RESOLVED (Task 12, Part D.3) — NO pgcrypto extension line needed, and
-- none is declared. gen_random_uuid() moved into Postgres core in version
-- 13 (no longer requires the pgcrypto extension at all). This project's
-- target local Postgres version is pinned at supabase/config.toml:36
-- (`major_version = 17`) — comfortably past that threshold. Every
-- historical file's `gen_random_uuid()` call (scripts/rebuild-schema.sql,
-- docs/migrations/*.sql, supabase/migrations/*.sql) therefore needs no
-- extension at all on this target. The `CREATE EXTENSION IF NOT EXISTS
-- pgcrypto;` statement that was here in the Task 10/11 drafts is removed
-- rather than merely left harmless, so this file does not imply a
-- dependency that doesn't exist.

-- pgvector: required for the embedding-similarity matching dimension.
-- Evidence: docs/migrations/phase5b_pgvector.sql:8
-- (`CREATE EXTENSION IF NOT EXISTS vector;`), consumed by embedding columns
-- added to jobseekers/jobs in the same file (lines 11-14).
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================================
-- SECTION 2: ROLE PROFILE TABLES (auth.users-anchored, ON DELETE RESTRICT)
-- ============================================================================
--
-- Binding decisions (Task 9.1): #1 auth.users.id is the identity anchor;
-- #2 jobseekers/employers/admins are the only authoritative writable role
-- profiles; #3 public.users is excluded and must not be recreated;
-- #5 each profile PK references auth.users(id) ON DELETE RESTRICT.
--
-- RESTRICT (not CASCADE) is deliberate: it prevents a bare `DELETE FROM
-- auth.users` from silently cascading into profile and then into every
-- FK-dependent row (applications, referrals, saved jobs, audit trails).
-- Task 4's two-stage deactivate-then-anonymize policy must run first;
-- RESTRICT forces any future deletion code path through that policy
-- instead of letting Postgres do it implicitly.
--
-- password_hash is included on ALL THREE role tables below. This is a
-- reversal of an earlier working note (Task 9) that called the column
-- vestigial — it is not. See the DUAL-CREDENTIAL-STORE DEBT comment on
-- each table for the exact evidence.

CREATE TABLE IF NOT EXISTS jobseekers (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email               TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: this column is written by
  -- app/lib/auth-utils.ts:57-73 (getPasswordHash/updatePasswordHash) and by
  -- app/api/auth/reset-password/confirm/route.ts:82-85, but login
  -- (app/login/page.tsx:72, app/login/admin/page.tsx:95) calls ONLY
  -- supabase.auth.signInWithPassword(), which never reads this column.
  -- The two credential stores are completely disconnected: writing here
  -- does not change what login actually checks. Verified this session by
  -- reading both files; no call to supabase.auth.signInWithPassword
  -- consults password_hash anywhere in app/. Kept in the baseline because
  -- live code reads and writes it; the debt itself is an application-layer
  -- problem out of this task's scope to fix.
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
  barangay             TEXT,
  city                TEXT,
  province            TEXT,
  zip_code            TEXT,

  employment_status          TEXT,
  employment_type            TEXT,
  self_employed_type         TEXT,
  self_employed_type_others  TEXT,
  unemployed_reason          TEXT,
  unemployed_months          INTEGER,
  unemployed_due_to_calamity BOOLEAN NOT NULL DEFAULT false, -- scripts/migrations/20260424_nsrp_full_parity.sql:37
  terminated_country          TEXT,
  terminated_reason           TEXT,

  is_ofw                      BOOLEAN NOT NULL DEFAULT false,
  ofw_country                 TEXT,
  is_former_ofw                BOOLEAN NOT NULL DEFAULT false,
  former_ofw_country           TEXT,
  former_ofw_return_month_year TEXT,

  is_four_ps          BOOLEAN NOT NULL DEFAULT false,
  household_id_no     TEXT,

  -- NSRP Form I disability checkboxes — scripts/migrations/20260424_nsrp_full_parity.sql:13-18
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

  -- Original single-value location preference fields (scripts/rebuild-schema.sql:63-64)
  preferred_work_location_local     TEXT,
  preferred_work_location_overseas  TEXT,
  -- NSRP Form II expansion to 3 rows each — scripts/migrations/20260424_nsrp_full_parity.sql:24-30
  preferred_work_location_local_1    TEXT,
  preferred_work_location_local_2    TEXT,
  preferred_work_location_local_3    TEXT,
  preferred_work_location_overseas_1 TEXT,
  preferred_work_location_overseas_2 TEXT,
  preferred_work_location_overseas_3 TEXT,

  other_skills        JSONB,
  other_skills_others  TEXT, -- scripts/migrations/20260426_add_missing_nsrp_fields.sql:5

  profile_image        TEXT, -- scripts/migrations/20260426_add_profile_image_column.sql:5

  -- VERIFY (Task 13B, jobseeker coverage check — apparent field-name
  -- conflict, NOT added): `education_level` is NOT a column here, and is
  -- deliberately NOT being added despite being explicitly requested in a
  -- live SELECT. app/lib/matching/agent.ts:422 runs
  -- `.select("*, education_level, jobseeker_experience(*), jobseeker_education(*), ...")`
  -- — the explicit `, education_level` only makes sense if someone
  -- believed `jobseekers.education_level` is a real top-level column
  -- (app/lib/matching/deidentify.ts:44 even comments it as "top-level
  -- column on jobseekers table" in the `RawJobseeker` type). But the
  -- ONLY place that value is actually consumed
  -- (deidentify.ts:176-180, `rawEduLevel`) reads exclusively from the
  -- embedded `jobseeker_education` child-table rows
  -- (`eduArray[0]?.level`), never from a flat `raw.education_level`
  -- field — and a second, near-identical full-profile query at
  -- app/lib/matching/services/ExplanationService.ts:23 omits
  -- `education_level` entirely from the same kind of select. This is
  -- genuinely unresolved from code alone: either `education_level` is a
  -- real, currently-unused, stale column (in which case `*` would already
  -- return it and the explicit mention is harmless but redundant), or it
  -- does not exist (in which case agent.ts:422's query would fail
  -- outright at the database level, a bug independent of this schema).
  -- Not added here per this task's rule against inventing unresolved
  -- fields; see decision record for the same note.
  nsrp_id              TEXT,
  profile_complete     BOOLEAN NOT NULL DEFAULT false,
  profile_completeness INTEGER NOT NULL DEFAULT 0,
  -- SO1 AI-matching completeness metric — supabase/migrations/20260828190000_add_matching_completeness_pct.sql:8
  matching_completeness_pct INTEGER NOT NULL DEFAULT 0,

  job_seeking_status   TEXT NOT NULL DEFAULT 'not_looking'
                          CHECK (job_seeking_status IN ('actively_looking', 'open', 'not_looking')),
                          -- docs/migrations/phase1_migration.sql:7-9

  -- Matching-engine preference/constraint fields
  work_setup_preference TEXT DEFAULT 'any'
                          CHECK (work_setup_preference IN ('onsite', 'remote', 'hybrid', 'any')),
                          -- docs/migrations/utility_agent_setup.sql:7-9
  expected_salary_min  NUMERIC, -- docs/migrations/utility_agent_setup.sql:10
  expected_salary_max  NUMERIC, -- docs/migrations/utility_agent_setup.sql:11

  -- pgvector embedding column, 768 dimensions.
  -- RESOLVED (Class A) in Task 11: docs/migrations/phase5b_pgvector.sql:10-12
  -- states explicitly "768 dimensions for Gemini text-embedding-004" and
  -- declares `vector(768)`. The Task 10 draft's `vector(1536)` guess (by
  -- false analogy to the unrelated OpenAI-backed skill_embeddings_cache
  -- table) was wrong; corrected here.
  profile_embedding    vector(768),

  -- Task 3 consent fields — binding decision #15.
  -- supabase/migrations/20260829120000_add_signup_consent_fields.sql:9-10
  consent_given_at                 TIMESTAMPTZ,
  consent_privacy_notice_version   TEXT,

  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_login           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employers (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email               TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: identical situation to jobseekers.password_hash
  -- above. Same evidence (app/lib/auth-utils.ts:57-73), same disconnect from
  -- supabase.auth.signInWithPassword.
  password_hash       TEXT NOT NULL DEFAULT 'auth_managed',

  establishment_name  TEXT NOT NULL,

  province            TEXT,
  city                TEXT,
  barangay             TEXT,
  address             TEXT,

  total_paid_employees    INTEGER,
  total_vacant_positions  INTEGER,
  industry                TEXT,
  industry_code           TEXT,

  -- RESOLVED (Class A) in Task 11 — business_type/employee_count OMITTED.
  -- app/api/admin/employers/[id]/srs/route.ts:29,57-58 is the ONLY call
  -- site anywhere in app/ that reads employer.business_type /
  -- employer.employee_count (confirmed by a repo-wide grep in this
  -- session). By contrast, industry/total_paid_employees are read or
  -- written consistently across 10+ call sites: app/lib/matching/
  -- cold-start-engine.ts:16, app/lib/matching/agent.ts:931, app/lib/
  -- matching/services/EmbeddingService.ts:28, app/employer/settings/
  -- page.tsx:105, app/admin/employers/[id]/page.tsx:208,210,
  -- app/admin/employers/page.tsx:222, app/employer/profile/
  -- employer-wizard.tsx:107, app/employer/jobs/page.tsx:187,
  -- app/api/admin/employers/create/route.ts:47, app/api/admin/
  -- employers/route.ts:54, app/api/admin/export/reports/dole/route.ts:62,
  -- app/api/admin/export/reports/masterlist/route.ts:48. Per this task's
  -- rule ("where current app code consistently uses one column name, that
  -- name wins"), industry/total_paid_employees win decisively.
  -- business_type/employee_count are not created in this baseline; the
  -- single outlier route is treated as a naming-drift bug (it should most
  -- likely SELECT industry/total_paid_employees, mapped to its own
  -- businessType/employeeCount response fields) to be fixed at the
  -- application layer in a future task — not fixed here.

  contact_person       TEXT,
  contact_phone         TEXT,
  designation          TEXT,
  company_tax_id        TEXT,

  srs_form_file           TEXT,
  business_permit_file    TEXT,
  bir_2303_file            TEXT,
  company_profile_file    TEXT,
  dole_certification_file TEXT,

  profile_image        TEXT, -- scripts/migrations/20260426_add_profile_image_column.sql:6

  account_status       TEXT NOT NULL DEFAULT 'pending',
  verified_at           TIMESTAMPTZ,

  -- SRS approval workflow — docs/migrations/phase1_migration.sql:27-33
  srs_status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (srs_status IN ('pending', 'approved', 'rejected')),
  srs_rejection_reason   TEXT,
  srs_submitted_at        TIMESTAMPTZ,
  srs_approved_at          TIMESTAMPTZ,
  srs_version            INTEGER NOT NULL DEFAULT 1,

  -- Task 3 consent fields — binding decision #15.
  -- supabase/migrations/20260829120000_add_signup_consent_fields.sql:13-14
  consent_given_at                 TIMESTAMPTZ,
  consent_privacy_notice_version   TEXT,

  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_login            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RESOLVED (Class A) in Task 11: the Task 10 draft had duplicated
-- job_embedding on BOTH `employers` (just above, now removed) and `jobs`
-- (SECTION 4) while its own comment claimed the employers copy had already
-- been removed — it had not; this was a bug in the draft itself, not an
-- open evidence question. docs/migrations/phase5b_pgvector.sql:14-15
-- is unambiguous: `ALTER TABLE jobs ADD COLUMN ... job_embedding
-- vector(768)` — jobs is the only correct placement (jobs are matched
-- against jobseeker profiles; employers are not independently embedded).
-- The duplicate column on employers is now actually deleted.

CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,

  -- DUAL-CREDENTIAL-STORE DEBT: same disconnect as above. Evidence:
  -- app/lib/auth-utils.ts:57-73 treats "admins" identically to
  -- "employers"/"jobseekers" for password_hash read/write. Disconnected
  -- from login; scheduled for retirement in the auth-hardening task (see
  -- decision record, "Auth-hardening debt").
  -- DECIDED (Task 12, Part A, item #6): NOT NULL DEFAULT 'auth_managed',
  -- for consistency with jobseekers/employers — admin creation is
  -- manual/out-of-band, so whatever process provisions an admins row sets
  -- the placeholder explicitly, same as the signup trigger does for the
  -- other two roles. docs/migrations/mock_data_gensan.sql:29's nullable
  -- declaration is historical and superseded by this decision.
  -- Disconnected from login — see decision record, "Auth-hardening debt".
  password_hash TEXT NOT NULL DEFAULT 'auth_managed',

  -- ADDED (Task 13B, human review): confirmed active-code fields.
  -- app/api/auth/account-data/export/route.ts:143 selects
  -- "id, email, name, role, is_active, last_login, created_at, updated_at"
  -- directly from "admins" — a single query confirming all three of
  -- role, is_active, and last_login (plus every other column already in
  -- this table) in one place.
  role          TEXT,
  -- RESOLVED (Task 12) is_active also independently confirmed at
  -- app/api/admin/account-deletion/process/route.ts:119
  -- (`.from("admins").update({ is_active: false, updated_at: nowIso })`).
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- RESOLVED (Class A) in Task 11: app/lib/auth-utils.ts:66-73
  -- (updatePasswordHash) generically writes `updated_at` for whichever
  -- table `role` resolves to, including "admins" — confirmed live code
  -- dependency, not merely a consistency choice.
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- SECTION 3: JOBSEEKER CHILD TABLES
-- ============================================================================
-- Evidence: scripts/rebuild-schema.sql:77-130, with NSRP additions from
-- scripts/migrations/20260424_nsrp_full_parity.sql:40-46.
--
-- DECIDED (Task 12, Part A, item #8): NOT NULL on all five jobseeker_id
-- FKs below. scripts/rebuild-schema.sql (lines 79, 90, 102, 113, 123)
-- declared them nullable, but a child row with no parent is structurally
-- meaningless in every one of these tables, and these are per-person
-- working-data tables (the FK-policy category that uses CASCADE — see
-- decision record, "FK policy"), so CASCADE + NOT NULL is the correct,
-- consistent combination. Applies to: jobseeker_languages.jobseeker_id,
-- jobseeker_education.jobseeker_id, jobseeker_trainings.jobseeker_id,
-- jobseeker_licenses.jobseeker_id, jobseeker_experience.jobseeker_id —
-- all already declared NOT NULL ... REFERENCES jobseekers(id) ON DELETE
-- CASCADE below; this comment closes that decision.

CREATE TABLE IF NOT EXISTS jobseeker_languages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  language     TEXT NOT NULL,
  read         BOOLEAN NOT NULL DEFAULT false,
  write        BOOLEAN NOT NULL DEFAULT false,
  speak        BOOLEAN NOT NULL DEFAULT false,
  understand   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobseeker_education (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id         UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  currently_in_school   BOOLEAN NOT NULL DEFAULT false,
  level                TEXT,
  course               TEXT,
  year_graduated        TEXT,
  level_reached         TEXT,
  year_last_attended     TEXT,
  -- NSRP Form IV additions — scripts/migrations/20260424_nsrp_full_parity.sql:43-46
  school_name           TEXT,
  secondary_type        TEXT, -- 'Non-K12' or 'K12'
  senior_high_strand     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobseeker_trainings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id          UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  course                TEXT,
  hours_of_training      INTEGER,
  training_institution   TEXT,
  skills_acquired        TEXT,
  certificates_received  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobseeker_licenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id         UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  eligibility          TEXT,
  date_taken            DATE,
  professional_license  TEXT,
  valid_until           DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobseeker_experience (
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
-- SECTION 4: JOBS AND APPLICATIONS
-- ============================================================================
-- Base evidence: scripts/rebuild-schema.sql:167-199. Additive evidence:
-- docs/migrations/phase1_migration.sql:12-44, scripts/migrations/
-- 20260428_add_published_at_to_jobs.sql, 20260428_add_salary_period_to_jobs.sql,
-- 20260428_remove_age_preference.sql, docs/migrations/utility_agent_setup.sql:14-16.

CREATE TABLE IF NOT EXISTS jobs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CHANGED (Task 13B, human review): ON DELETE CASCADE → ON DELETE
  -- RESTRICT. Employer profiles are not hard-deleted under the chosen
  -- deactivation/anonymization design (binding decision #16) — RESTRICT
  -- prevents an accidental cascaded loss of a whole employer's jobs (and,
  -- transitively, the operational records that in turn reference those
  -- jobs) if anything ever did attempt to delete an employer row. See
  -- decision record for the full note; this also resolves the "jobs.
  -- employer_id deviation" Task 12 had reported but left unchanged.
  employer_id                 UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  -- RESOLVED (Class A) in Task 11: scripts/rebuild-schema.sql:169 declared
  -- employer_id WITHOUT NOT NULL, but app/api/employer/jobs/route.ts:124
  -- confirms job creation always supplies `employer_id: ctx.user!.id`
  -- (the authenticated employer). NOT NULL is safe and evidenced, not
  -- just a working assumption.
  position_title              TEXT NOT NULL,
  -- RESOLVED (Class A), 4 NEW columns found in Task 11 while verifying
  -- the applications contradiction, all confirmed together in the single
  -- authoritative INSERT at app/api/employer/jobs/route.ts:121-147 and
  -- the matching PATCH at app/api/employer/jobs/[id]/route.ts:94-120:
  description                  TEXT,
  employment_contract_type      TEXT,
  location                      TEXT,
  -- industry_code here is a JOBS column, distinct from
  -- employers.industry_code (SECTION 2) — confirmed as two separate,
  -- independently-written columns by the same insert/update call sites.
  industry_code                 TEXT,

  minimum_education_required   TEXT,
  main_skill_desired            TEXT,
  years_of_experience_required  INTEGER,
  -- age_preference_min / age_preference_max intentionally OMITTED.
  -- scripts/migrations/20260428_remove_age_preference.sql:2-4 dropped them
  -- explicitly "to prevent age discrimination." scripts/rebuild-schema.sql
  -- still contains them (lines 175-176), which is stale/superseded by this
  -- later removal — confirms rebuild-schema.sql predates this fix.
  starting_salary               TEXT,
  salary_min                    NUMERIC, -- docs/migrations/utility_agent_setup.sql:15
  salary_max                    NUMERIC, -- docs/migrations/utility_agent_setup.sql:16
  salary_period                 TEXT DEFAULT 'monthly', -- scripts/migrations/20260428_add_salary_period_to_jobs.sql:2
  job_status                    TEXT,

  work_setup    TEXT DEFAULT 'onsite'
                  CHECK (work_setup IN ('onsite', 'remote', 'hybrid')), -- docs/migrations/phase1_migration.sql:37-38
  -- RESOLVED (Class A), NEW column found in Task 11: work_type (e.g.
  -- "Full-time"/"Part-time") is DISTINCT from work_setup
  -- (onsite/remote/hybrid) — confirmed by both appearing together in the
  -- same SELECT at app/api/jobs/route.ts:68 and app/lib/matching/
  -- agent.ts:436, and used consistently at 10+ call sites including
  -- app/api/employer/jobs/route.ts:141 (`work_type: payload.workType ||
  -- "Full-time"`), app/api/employer/jobs/[id]/route.ts:102,
  -- app/api/jobs/filters/route.ts:25,34, app/api/jobs/route.ts:90,112.
  work_type      TEXT DEFAULT 'Full-time',
  psoc_code      TEXT, -- docs/migrations/phase1_migration.sql:39
  featured       BOOLEAN NOT NULL DEFAULT false, -- docs/migrations/phase1_migration.sql:40
  slots_remaining INTEGER, -- docs/migrations/phase1_migration.sql:41

  published_at   TIMESTAMPTZ, -- scripts/migrations/20260428_add_published_at_to_jobs.sql:2
  -- RESOLVED (Class A), NEW column found in Task 11 while transcribing
  -- scripts/migrations/20260424_landing_page_tables.sql:65
  -- (`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category TEXT;`), also
  -- confirmed in the live SELECT list at app/api/jobs/[id]/route.ts:46.
  category       TEXT,

  -- RESOLVED (Class A) in Task 11: is_published is a real, distinct,
  -- consistently-used column — NOT a naming collision with is_active/
  -- archived. Confirmed at three independent call sites:
  -- app/api/admin/employers/[id]/srs/route.ts:114 (SRS-rejection pause),
  -- app/api/employer/jobs/[id]/status/route.ts:58-69 (employer status
  -- toggle, written alongside `archived` in the same update — the two are
  -- companions, not alternatives), and app/api/jobseeker/applications/
  -- route.ts:116,122 (apply-eligibility gate, read alongside
  -- `job.status`/`job.archived`). It still has NO SQL-file provenance
  -- anywhere locally (confirmed by repo-wide grep, zero matches) — it was
  -- added directly to a hosted project and never captured in a committed
  -- migration. Kept as a required column; its missing migration history
  -- is recorded, not invented.
  is_published   BOOLEAN NOT NULL DEFAULT false,

  vacancies    INTEGER NOT NULL DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  archived      BOOLEAN NOT NULL DEFAULT false,

  -- pgvector embedding column — docs/migrations/phase5b_pgvector.sql:14-17
  -- (moved here from the employers table; see note in SECTION 2).
  -- BUG FOUND AND FIXED IN TASK 12: this column was still declared
  -- vector(1536) despite Task 11's SECTION 2 comments claiming the 768-dim
  -- fix had already been applied everywhere — it had not been applied
  -- here. Corrected to vector(768), matching jobseekers.profile_embedding
  -- and docs/migrations/phase5b_pgvector.sql:10,15 exactly. This is
  -- precisely the kind of silent, unflagged error Task 12 exists to catch.
  job_embedding vector(768),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK policy (Task 12, Part B): applications is a workflow/traceability
  -- record a referral slip or audit trail may point back to — it must not
  -- silently disappear or be reparented when a job/jobseeker/employer row
  -- is deleted. ON DELETE RESTRICT on all three FKs here (changed from
  -- Task 10/11's CASCADE) per the stated policy: "applications and
  -- referrals keep NOT NULL FKs with ON DELETE RESTRICT."
  job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,

  -- RENAMED from the Task 10 draft's `jobseeker_id` to `applicant_id`.
  -- RESOLVED (Class A) in Task 11, reversing Task 10's conclusion: Task 10
  -- used scripts/rebuild-schema.sql's historical `jobseeker_id` plus a
  -- single RLS-file contradiction note. Task 11 found that LIVE CODE
  -- overwhelmingly and consistently uses `applicant_id` on this table —
  -- confirmed at 15+ call sites across app/lib/db-helpers.ts:28,
  -- app/api/jobs/[id]/apply/route.ts:107,138 (the actual apply/insert
  -- endpoint), app/api/jobseeker/applications/route.ts:129,149 (a SECOND
  -- apply/insert endpoint), app/api/jobseeker/applications/[id]/route.ts:29,
  -- app/api/jobseeker/jobs/[id]/route.ts:46, app/api/employer/applications/
  -- [id]/route.ts:42,64,75, app/api/employer/applications/[id]/status/
  -- route.ts:44,66,77, app/api/employer/applications/[id]/message/
  -- route.ts:43,61, app/api/messages/route.ts:172,184,186,190,191,
  -- app/api/admin/activities/_events.ts:53,58,162,175,
  -- app/api/admin/analytics/job-seeker-alerts/route.ts:43,48,49,50,
  -- app/api/admin/dashboard/activity/route.ts:36,102,103,109,
  -- app/api/admin/dashboard/overview/route.ts:66,
  -- app/api/admin/export/reports/masterlist/route.ts:36, and
  -- app/api/auth/account-data/export/route.ts:29,41,96 (which also gives
  -- an explicit full SELECT column list for this table — see below).
  -- Exactly ONE call site used `jobseeker_id` against this table
  -- (app/api/jobseeker/applications/route.ts:43, in the same file whose
  -- own INSERT two lines below, at line 149, uses `applicant_id`) —
  -- confirming that single occurrence is the outlier, not the rule. Per
  -- this task's rule ("where current app code consistently uses one
  -- column name, that name wins"), `applicant_id` wins decisively. The
  -- historical RLS file (scripts/migrations/20260424_enable_rls.sql:16,22,28)
  -- is thereby vindicated, not contradicted — it was scripts/rebuild-schema.sql
  -- that used the name the application never adopted.
  applicant_id       UUID NOT NULL REFERENCES jobseekers(id) ON DELETE RESTRICT,

  employer_id        UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  -- RESOLVED (Class A) in Task 11: all three FKs were nullable in
  -- scripts/rebuild-schema.sql:189-191; both apply/insert routes cited
  -- above always supply job_id, applicant_id, and employer_id together,
  -- so NOT NULL is evidenced, not just a working assumption. ON DELETE
  -- RESTRICT applied in Task 12 per the FK policy (see note on job_id
  -- above).

  -- RESOLVED (Class A) in Task 11, NEW columns the Task 10 draft missed
  -- entirely: cover_letter and resume_url are written by BOTH apply/insert
  -- routes (app/api/jobs/[id]/apply/route.ts:142-143 and
  -- app/api/jobseeker/applications/route.ts:153-154) and read back in the
  -- full column list at app/api/auth/account-data/export/route.ts:27,96.
  cover_letter        TEXT,
  resume_url           TEXT,
  -- feedback: confirmed at 4 call sites — app/api/employer/applications/
  -- [id]/status/route.ts:60, app/api/employer/applications/[id]/route.ts:58,
  -- app/api/employer/applications/[id]/message/route.ts:80, and read back
  -- at app/api/employer/applications/route.ts:76.
  feedback             TEXT,

  -- RESOLVED (Task 12, Part D.3) — decided from code evidence, no
  -- dashboard used. Columns INCLUDED. Weight of evidence: FOUR independent
  -- call sites across two genuinely different features write or read
  -- these columns as real — app/api/jobs/[id]/apply/route.ts:140-141
  -- (INSERT, primary apply endpoint), app/api/jobseeker/applications/
  -- route.ts:151-152 (INSERT, second independent apply endpoint),
  -- app/lib/db-helpers.ts:114 (search filter), and app/api/auth/
  -- account-data/export/route.ts:27,96 (two SELECT lists). Against that,
  -- exactly ONE comment, in a third, unrelated feature
  -- (app/api/employer/applications/route.ts:39: "Note: applicant_name/
  -- applicant_email don't exist in DB; search is omitted for now"), claims
  -- they are not real. PostgREST rejects an INSERT containing an unknown
  -- column outright (PGRST204) — if the claim were true, BOTH independent
  -- apply/insert endpoints would fail on every single application, yet
  -- "job apply" is documented elsewhere in this project's history as a
  -- working, tested flow. Two independently-written INSERT statements
  -- failing identically, silently, on exactly these two columns, while the
  -- feature is reported as functioning, is a far less likely explanation
  -- than one stale comment in a different file. Decision: the columns
  -- exist; the comment is stale and should be removed in a future
  -- application-code cleanup task (not this one).
  applicant_name       TEXT,
  applicant_email       TEXT,

  -- DECIDED (Task 12, Part A, item #13): default stays 'under_review'
  -- (app/api/jobs/[id]/apply/route.ts:147, explicit "phase 1 migration
  -- normalization" comment). The CHECK list below must allow — and does
  -- allow — every value ANY code path writes, including 'pending'
  -- (app/api/jobseeker/applications/route.ts:155, the second, divergent
  -- apply endpoint), because both endpoints are live and this schema task
  -- cannot silently reject one of them. Full value set confirmed from
  -- app/lib/validation-schemas.ts:184-192
  -- (employerApplicationStatusUpdateSchema: pending, reviewed,
  -- shortlisted, interview, hired, rejected, withdrawn) plus
  -- 'under_review' (the apply-route default) — app/lib/db-helpers.ts:179-181
  -- additionally confirms 'hired'/'rejected'/'pending' are read back via
  -- `.eq("status", ...)`. The TWO-endpoint duplication itself (one write
  -- path defaults to 'pending', the other to 'under_review') remains an
  -- application-layer problem this schema task does not resolve.
  status             TEXT NOT NULL DEFAULT 'under_review'
                       CHECK (status IN (
                         'pending', 'under_review', 'reviewed', 'shortlisted',
                         'interview', 'hired', 'rejected', 'withdrawn'
                       )),
  match_score        NUMERIC,
  source             TEXT NOT NULL DEFAULT 'direct'
                       CHECK (source IN ('direct', 'referred')), -- docs/migrations/phase1_migration.sql:13-14
  expected_salary     TEXT,       -- docs/migrations/phase1_migration.sql:15
  availability_date    DATE,       -- docs/migrations/phase1_migration.sql:16
  nsrp_forwarded       BOOLEAN NOT NULL DEFAULT false, -- docs/migrations/phase1_migration.sql:17
  extra_attachments    JSONB DEFAULT '[]'::jsonb, -- docs/migrations/phase1_migration.sql:18
  rejection_reason      TEXT,       -- docs/migrations/phase1_migration.sql:19
  interview_date        TIMESTAMPTZ, -- docs/migrations/phase1_migration.sql:20 (also present pre-existing at rebuild-schema.sql:196)
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- SECTION 5: REFERRALS AND REFERRAL_SLIPS
-- ============================================================================
-- Binding decision #6: referrals (internal workflow/reporting) and
-- referral_slips (issued document/QR/PDF artifact) are distinct required
-- tables. Binding decision #7: referral_slips.referral_id is a nullable FK
-- to referrals.id, ON DELETE SET NULL, with no uniqueness/enforcement yet.
-- Binding decision #11: referral_slips includes pdf_url and notified_at;
-- excludes employer_feedback_at.

CREATE TABLE IF NOT EXISTS referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK policy (Task 12, Part B): referrals is the internal workflow/
  -- reporting record (binding decision #6) that referral_slips.referral_id
  -- and PESO reporting may trace back to — same reasoning as applications
  -- (above): ON DELETE RESTRICT on all three FKs, not CASCADE.
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  jobseeker_id   UUID NOT NULL REFERENCES jobseekers(id) ON DELETE RESTRICT,
  employer_id    UUID NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  -- RESOLVED (Class A) in Task 11: all three FKs were nullable in
  -- scripts/rebuild-schema.sql:203-205; app/api/referrals/route.ts:320-322,
  -- 376,396 confirms referral creation always supplies job_id, jobseeker_id,
  -- and employer_id together (that file's own inline comment at line 320,
  -- `// id, job_id, jobseeker_id, employer_id, application_id, status,
  -- date_referred, created_at, updated_at`, is a direct, explicit
  -- developer-documented column list for this table). NOT NULL is
  -- evidenced, not just a working assumption. ON DELETE RESTRICT applied
  -- in Task 12 per the FK policy.
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'referred',
  date_referred  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NEWLY FOUND IN TASK 11, FLAGGED FOR MANUAL REVIEW, NOT BLOCKING: a single
-- outlier call site, app/api/auth/account-data/export/route.ts:103, selects
-- referrals using a COMPLETELY DIFFERENT column set — "id, applicant_id,
-- job_id, application_id, applicant, vacancy, status,
-- referral_slip_number, peso_officer_name, date_referred, remarks,
-- created_at, updated_at" — naming the FK `applicant_id` (not
-- `jobseeker_id`) and introducing four columns (`applicant`, `vacancy`,
-- `referral_slip_number`, `peso_officer_name`, `remarks`) that appear
-- NOWHERE else in this repository, in code or in SQL. This does not
-- change the resolution above: app/api/referrals/route.ts's 7+ internally
-- consistent `jobseeker_id` usages plus its explicit inline column-list
-- comment heavily outweigh this one isolated file, which looks like it
-- was written against an older or different schema and never updated.
-- Recorded here so a future task can check whether this export route is
-- simply broken (and silently returning no/wrong data today) — not fixed
-- by this schema task.

CREATE TABLE IF NOT EXISTS referral_slips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number   TEXT NOT NULL UNIQUE,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  -- DECIDED (Task 12, Part A, item #15): applicant_id becomes NULLABLE
  -- with `REFERENCES jobseekers(id) ON DELETE SET NULL`. referral_slips is
  -- an issued-document/evidence record (binding decision #6) — per the FK
  -- policy, evidence/traceability records use SET NULL on nullable
  -- columns, so a deleted jobseeker doesn't retroactively delete or block
  -- deletion of an already-issued slip; the slip survives as an orphaned
  -- document. docs/migrations/phase1_migration.sql:51 comments this as
  -- "references jobseeker user_id" but declared no actual FK; confirmed
  -- consistently populated with a jobseeker's id across every call site
  -- (app/api/admin/referral-slips/route.ts:68, app/api/jobseeker/
  -- applications/route.ts:53, app/api/jobseeker/referrals/route.ts:34,
  -- app/api/jobseeker/referrals/[slipId]/route.ts:38).
  applicant_id  UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  -- DECIDED (Task 12, Part A, item #16): issued_by becomes NULLABLE with
  -- `REFERENCES admins(id) ON DELETE SET NULL`, same evidence-record
  -- reasoning as applicant_id above. docs/migrations/phase1_migration.sql:52
  -- commented "admin user id" but never FK-constrained it.
  issued_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until   TIMESTAMPTZ NOT NULL,
  pdf_url       TEXT,      -- binding decision #11
  qr_code_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued', 'hired', 'not_hired')),
  notified_at   TIMESTAMPTZ, -- binding decision #11
  -- employer_feedback_at intentionally OMITTED — binding decision #11.
  -- Present in docs/migrations/phase1_migration.sql:60 (historical, stale)
  -- but no current code path reads or writes it.
  referral_id   UUID REFERENCES referrals(id) ON DELETE SET NULL, -- binding decision #7; nullable, unenforced, no UNIQUE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- SECTION 6: MESSAGES AND NOTIFICATIONS
-- ============================================================================
-- Evidence chain (Task 9.1, reconstructed from local git history at commit
-- 7a56968239a79d2a96da6da0a106f853d4cba30d):
--   app/db/migrations/0000_keen_nocturne.sql (original Drizzle baseline)
--   -> app/db/migrations/0001_notifications_user_id_actor_scope.sql
--   -> app/db/migrations/0002_messages_actor_scope.sql
--   (both convert the relevant id column from `uuid NOT NULL` + FK to
--   users(id) ON DELETE CASCADE, into role-agnostic `varchar(64)` with the
--   FK dropped — binding decision #12)
--   -> docs/migrations/phase1_migration.sql:81-89 (messages-only additive
--   columns: thread_id, sender_role, attachment_urls, read_at, application_id)
--
-- All timestamps below are TIMESTAMPTZ per this task's explicit ruling,
-- which deliberately does NOT replay the historical `timestamp` (no time
-- zone) type that 0000_keen_nocturne.sql originally used for created_at/
-- updated_at/read_at on both tables — this baseline is a fresh CREATE
-- TABLE, not an ALTER against a pre-existing column, so there is no
-- legacy-type conflict to inherit.

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        VARCHAR(64) NOT NULL,   -- role-agnostic; no FK (binding decision #12)
  recipient_id     VARCHAR(64) NOT NULL,
  content          TEXT NOT NULL,
  read             BOOLEAN NOT NULL DEFAULT false,
  read_at          TIMESTAMPTZ,
  -- thread_id / message_threads intentionally OMITTED.
  -- docs/migrations/phase1_migration.sql:66-78,82 defines message_threads
  -- and a thread_id FK to it, but a repo-wide grep this session for
  -- `message_threads` and `thread_id` across app/ found zero code
  -- references. Confirmed dead schema; excluded per this task's Step 1b
  -- ruling.
  -- REVERSED (Task 13B.1, deferred): Task 13B briefly made sender_role
  -- NOT NULL; that change is withdrawn here and the column stays nullable
  -- in baseline version 1. Reason: no current `.insert()` into "messages"
  -- anywhere in app/ actually supplies sender_role at all — a repo-wide
  -- grep found it referenced only in the frontend type at
  -- app/components/messaging/realtime-chat.tsx:18, never written
  -- server-side. NOT NULL with no DEFAULT would have made every message
  -- insert through the current, unmodified application code fail
  -- outright the moment this baseline is executed. No DEFAULT is used
  -- instead, because a default could misclassify the sender's role. The
  -- allowed-role CHECK is retained unchanged. Promoting this column to
  -- NOT NULL is deferred to a future messaging/auth-alignment task — see
  -- decision record, "messages.sender_role nullability — deferred
  -- architectural decision", for the exact conditions that task must
  -- satisfy first.
  sender_role      TEXT CHECK (sender_role IN ('jobseeker', 'employer', 'admin')),
  -- Included: actively consumed by
  -- app/components/messaging/realtime-chat.tsx:18.
  attachment_urls  JSONB DEFAULT '[]'::jsonb,
  -- Included: actively consumed by
  -- app/components/messaging/realtime-chat.tsx:20,349-351.
  application_id   UUID REFERENCES applications(id) ON DELETE SET NULL,
  -- RESOLVED (Class A) in Task 11: declared in docs/migrations/
  -- phase1_migration.sql:86; confirmed by re-reading app/api/messages/
  -- route.ts in full that no read or write of this column exists there.
  -- Kept as a harmless, confirmed-unused nullable FK consistent with the
  -- rest of the schema's optional-linkage pattern (cf.
  -- referral_slips.referral_id) — its absence of current use is now a
  -- confirmed fact, not an open question.
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64) NOT NULL,  -- role-agnostic; no FK (binding decision #12)
  -- ADDED (Task 13B, human review): role CHECK, kept NULLABLE. Code's
  -- NotificationRole type (app/lib/notifications.ts:6) is exactly these
  -- three literals, and the one insert path (createNotification,
  -- app/lib/notifications.ts:91-105) always supplies one — but the
  -- historical column (git commit 7a56968, 0000_keen_nocturne.sql) was
  -- nullable with no evidence that was ever tightened, and the schema
  -- must not foreclose a future system-generated notification with no
  -- single-role owner. CHECK permits NULL explicitly.
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
-- No current tracked file alters notifications beyond the 0000+0001
-- shape above. Confirmed live and complete by app/lib/notifications.ts:94-101,
-- which inserts exactly {user_id, role, type, title, message, related_id,
-- related_type}.


-- ============================================================================
-- SECTION 7: DELETION, AUDIT, AND ADMIN SUPPORT
-- ============================================================================
-- Binding decision #9: account_deletion_requests.cancelled_at is
-- TIMESTAMPTZ NULL, snake_case only — never camelCase.
-- Binding decision #10: admin_access_requests includes phone, organization,
-- notes; excludes legacy `reason`.
-- Binding decision #16: no hard-delete logic; Task 4 deactivation/
-- anonymization is future, out-of-scope application work.

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  -- RESOLVED (Class A) in Task 11: no local CREATE TABLE for this table
  -- exists anywhere, but the full column list is now directly confirmed
  -- by reading two independent route files in full:
  -- app/api/auth/account-deletion/request/route.ts:50-87 (SELECT
  -- "id, delete_after" existence check + full INSERT) and
  -- app/api/admin/account-deletion/process/route.ts:69-146 (SELECT
  -- "id, role, user_id" + filters on status/delete_after/email + UPDATE).
  -- Two columns the Task 10 draft MISSED entirely are added below:
  -- `email` and `delete_after` (the actual grace-period deadline column —
  -- Task 10 had invented `cancelled_at`/`processed_at` timestamps without
  -- ever confirming the deadline column's real name).
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  -- ADDED (Task 13B, human review): role CHECK. Code uses exactly these
  -- three literals — app/api/auth/account-deletion/request/route.ts:21-26
  -- and app/api/admin/account-deletion/process/route.ts:100-104 both map
  -- role to one of "admin" | "employer" | "jobseeker".
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  -- email is a HISTORICAL REQUEST SNAPSHOT, not the authoritative account
  -- identity — see decision record, "account_deletion_requests.email".
  email         TEXT NOT NULL, -- app/api/auth/account-deletion/request/route.ts:78
  -- ADDED (Task 13B, human review): status CHECK restricted to the three
  -- values actually written by code — 'pending' (default, and
  -- app/api/auth/account-deletion/request/route.ts:79), 'cancelled'
  -- (app/api/auth/account-deletion/cancel/route.ts, the status literal
  -- itself — not the separate camelCase cancelledAt/updatedAt defect
  -- documented above), 'processed'
  -- (app/api/admin/account-deletion/process/route.ts:139). Future
  -- anonymization states are deliberately NOT added in this task.
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'cancelled', 'processed')),
  reason        TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  delete_after  TIMESTAMPTZ NOT NULL, -- app/api/auth/account-deletion/request/route.ts:71-82 (7-day grace period); app/api/admin/account-deletion/process/route.ts:73,77
  -- cancelled_at: snake_case, TIMESTAMPTZ NULL — binding decision #9.
  -- KNOWN LIVE DEFECT, preserved intentionally, NOT fixed by this schema:
  -- app/api/auth/account-deletion/cancel/route.ts currently writes
  -- `cancelledAt`/`updatedAt` (camelCase) via the Supabase client, which
  -- means it is silently writing into camelCase-named columns (or failing
  -- silently) rather than this snake_case column. Neither of the two
  -- route files read in Task 11 (request/process) ever reads or writes
  -- cancelled_at either — so no current code path successfully uses this
  -- column at all today. This baseline declares the CORRECT column per
  -- binding decision #9 regardless; fixing the application code to match
  -- is explicitly out of scope for this task. See decision record,
  -- "Auth-hardening debt".
  cancelled_at  TIMESTAMPTZ,
  processed_at  TIMESTAMPTZ, -- app/api/admin/account-deletion/process/route.ts:140
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,        -- binding decision #10
  organization  TEXT,        -- binding decision #10
  notes         TEXT,        -- binding decision #10
  -- legacy `reason` intentionally OMITTED — binding decision #10.
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  -- FK ACTION FIXED IN TASK 12 (Part B consistency check): was missing
  -- `ON DELETE SET NULL` entirely (defaulted to NO ACTION) despite being
  -- structurally identical to every other admin-id evidence/audit column
  -- in this file (srs_approval_history.admin_id,
  -- match_disparity_flags.disparity_reviewed_by, referral_slips.issued_by
  -- — all SET NULL per the FK policy). This was the one real policy
  -- deviation found that wasn't already covered by Part A's explicit list;
  -- fixed here for consistency rather than merely reported.
  reviewed_by   UUID REFERENCES admins(id) ON DELETE SET NULL,
  -- RESOLVED (Class A) in Task 11: app/api/admin/access-requests/[id]/
  -- status/route.ts read in full — its PATCH handler (lines 78-91) sets
  -- only `status`, `notes`, and conditionally `reviewed_at`; `reviewed_by`
  -- is never set anywhere in the file. Confirmed never populated by any
  -- current code path, not merely "not re-read." Kept nullable.
  -- (That same route also queries `.from("users")` at lines 100-104 to
  -- find a notification recipient by email — a further reference to the
  -- excluded public.users table, noted in the decision record.)
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FOUND IN TASK 12 (Part C), COMPLETELY MISSING FROM THE TASK 10/11 DRAFT:
-- app/lib/auth-account-tokens.ts fully specifies two tables neither draft
-- ever included, despite both being load-bearing for the password-reset
-- and email-verification flows this project's own audit history already
-- flags as broken (see decision record, "Auth-hardening debt" —
-- consumeLifecycleToken() is exactly what app/api/auth/reset-password/
-- confirm/route.ts:67 calls). Both tables' app/db/schema.ts string
-- constants (authLifecycleTokensTable, accountEmailVerificationsTable)
-- were visible as far back as the original 2026-06-05 audit's "missing
-- tables" list — this is the first task to actually give them a shape.

CREATE TABLE IF NOT EXISTS auth_lifecycle_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Every column below confirmed at app/lib/auth-account-tokens.ts:24-108
  -- (issueLifecycleToken / consumeLifecycleToken), all three call sites
  -- consistent with each other.
  -- ADDED (Task 13B, human review): kind CHECK — code's TokenKind type
  -- (app/lib/auth-account-tokens.ts:5) is exactly these two literals.
  kind          TEXT NOT NULL CHECK (kind IN ('password_reset', 'email_verify')),
  -- ADDED (Task 13B, human review): role CHECK — code's AccountRole type
  -- (app/lib/auth-account-tokens.ts:4) is exactly these three literals.
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  user_id       UUID NOT NULL,
  email         TEXT NOT NULL,
  token_hash    TEXT NOT NULL,       -- sha256 hex digest, never the raw token (line 16-18,57)
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,         -- nullable; NULL = unused (lines 47,86,98)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_lifecycle_tokens_lookup
  ON auth_lifecycle_tokens (token_hash, kind, consumed_at, expires_at);
  -- INFERRED: matches the exact WHERE-clause shape of consumeLifecycleToken
  -- (app/lib/auth-account-tokens.ts:81-88: .eq("token_hash",...).eq("kind",...)
  -- .is("consumed_at", null).gt("expires_at", now)). No UNIQUE constraint
  -- added on token_hash — code never relies on one (no onConflict/upsert
  -- against this table), only INSERT + later UPDATE-by-id.

CREATE TABLE IF NOT EXISTS account_email_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Every column below confirmed at app/lib/auth-account-tokens.ts:110-138
  -- (markEmailVerified / isEmailVerified).
  -- ADDED (Task 13B, human review): role CHECK — same AccountRole type as
  -- auth_lifecycle_tokens above.
  role          TEXT NOT NULL CHECK (role IN ('jobseeker', 'employer', 'admin')),
  user_id       UUID NOT NULL,
  email         TEXT NOT NULL,
  verified_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UNIQUE(role, user_id) is REQUIRED, not optional: markEmailVerified
  -- (line 122) calls `.upsert({...}, { onConflict: "role,user_id" })` —
  -- without this exact constraint, that upsert raises a Postgres error at
  -- runtime (PostgREST/Postgres requires a matching UNIQUE or PK for any
  -- onConflict target).
  UNIQUE (role, user_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
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
-- Evidence: scripts/migrations/20260424_add_audit_logs.sql:4-15 (RLS from
-- that same file is excluded — see the RLS note before SUPPORT TABLES).


-- ============================================================================
-- SECTION 8: SAVED JOBS
-- ============================================================================
-- Binding decision #8, verbatim.

CREATE TABLE IF NOT EXISTS jobseeker_saved_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id  UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jobseeker_id, job_id)
);
-- NOTE: scripts/rebuild-schema.sql:212-218 contains an attempted CREATE
-- TABLE for this exact table, but the bytes are corrupted (every character
-- is space-separated: "C R E A T E   T A B L E..."), making it
-- non-executable as written and unusable as evidence. This definition is
-- built entirely from binding decision #8 and confirmed against live code
-- at app/api/jobseeker/saved-jobs/route.ts:19,70,92, not from that
-- corrupted fragment.


-- ============================================================================
-- SECTION 9: MATCHING AND AI TABLES
-- ============================================================================
-- Base: docs/migrations/phase1_migration.sql:92-107. Additive columns from
-- docs/migrations/utility_agent_setup.sql:20-28, docs/migrations/
-- add_corrections_to_match_scores.sql:8, supabase/migrations/
-- 20260430150000_add_percentile_rank_column.sql:9, scripts/migrations/
-- 20260428_add_score_version.sql, scripts/migrations/20260429_hybrid_hardened.sql.

CREATE TABLE IF NOT EXISTS job_match_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                  UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  -- DECIDED (Task 12, Part A, item #20): jobseeker_id becomes NULLABLE
  -- with `REFERENCES jobseekers(id) ON DELETE SET NULL`. job_match_scores
  -- is an evidence/audit-trail record of a past matching computation
  -- (feeds fairness/bias audits) — per the FK policy, evidence records
  -- use SET NULL, so a deleted jobseeker doesn't erase the historical
  -- score row. docs/migrations/phase1_migration.sql:95 declared this as
  -- bare `UUID NOT NULL` with no FK at all (unlike job_id, which did have
  -- one); this decision adds the FK and relaxes NOT NULL together, since
  -- SET NULL requires a nullable column.
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
  -- ^ Stores AI skill-correction / role-equivalence audit data. Schema
  -- existence here is independent of whether checkRoleEquivalence runs by
  -- default — the pilot-constraints memory requires that check disabled
  -- by default at the application layer, not removed from the schema.
  percentile_rank         NUMERIC DEFAULT 0,
  score_version           TEXT,
  prompt_hash              TEXT,
  parameter_fingerprint    JSONB,
  semantic_pairs_reviewed  INTEGER DEFAULT 0,
  feature_vector           JSONB DEFAULT '{}'::jsonb,
  match_evidence           JSONB DEFAULT '{}'::jsonb,
  computed_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to_employer          BOOLEAN NOT NULL DEFAULT false,
  sent_at                   TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, jobseeker_id)
);

CREATE TABLE IF NOT EXISTS ai_matching_logs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                    UUID REFERENCES jobs(id) ON DELETE SET NULL,
  jobseeker_id              UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  prompt_tokens             INTEGER,
  completion_tokens         INTEGER,
  model_used                TEXT,
  latency_ms                INTEGER,
  prompt_hash               TEXT,
  parameter_fingerprint     JSONB,
  semantic_pairs_reviewed    INTEGER DEFAULT 0,
  constraint_violations      JSONB DEFAULT '[]'::jsonb,
  score_version              TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_correction_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input   TEXT NOT NULL UNIQUE,
  corrected   TEXT NOT NULL,
  confidence  FLOAT,
  hit_count   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_equivalence_cache (
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
-- NOTE: this table backs checkRoleEquivalence, which the pilot-constraints
-- memory requires DISABLED BY DEFAULT in the pilot. That is an application
-- default, not a schema concern; the table is included unconditionally so
-- the flag can be flipped later without a fresh migration.

CREATE TABLE IF NOT EXISTS match_disparity_flags (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  flag_type                TEXT NOT NULL,
  affected_group           TEXT NOT NULL,
  avg_score_overall         NUMERIC(5,2) NOT NULL,
  avg_score_group           NUMERIC(5,2) NOT NULL,
  deviation_pct             NUMERIC(5,2) NOT NULL,
  candidate_count            INTEGER NOT NULL,
  statistical_test           TEXT,
  p_value                   NUMERIC,
  -- DECIDED (Task 12, Part A, item #21): FK added, `REFERENCES admins(id)
  -- ON DELETE SET NULL` — an evidence/audit record (fairness-review
  -- trail), per the FK policy. Already nullable; scripts/migrations/
  -- 20260428_add_disparity_reviewer.sql:5 added it as a bare,
  -- unconstrained UUID.
  disparity_reviewed_by      UUID REFERENCES admins(id) ON DELETE SET NULL,
  disparity_reviewed_at      TIMESTAMPTZ,
  review_notes               TEXT,
  flagged_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed                  BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_feedback_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- DECIDED (Task 12, Part A, item #22): job_id FK added as
  -- `REFERENCES jobs(id) ON DELETE CASCADE` (NOT NULL preserved — this
  -- half is per-job working data in the matching pipeline's own
  -- bookkeeping, not a jobseeker-facing evidence record). jobseeker_id FK
  -- added as `REFERENCES jobseekers(id) ON DELETE SET NULL`, relaxed to
  -- nullable (SET NULL requires it) since this row is also feedback/audit
  -- evidence about a jobseeker who may later be deleted. Both were bare,
  -- unconstrained `UUID NOT NULL` in supabase/migrations/
  -- 20260430160000_fix_feedback_logs.sql:10-11.
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id    UUID REFERENCES jobseekers(id) ON DELETE SET NULL,
  interaction_type TEXT,
  weight           NUMERIC DEFAULT 0,
  metadata         JSONB DEFAULT '{}'::jsonb,
  captured_at      TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_synonyms (
  id          BIGSERIAL PRIMARY KEY,
  alias       TEXT NOT NULL,
  canonical   TEXT NOT NULL,
  source      TEXT DEFAULT 'ai',
  confidence  FLOAT DEFAULT 1.0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_embeddings_cache (
  id          BIGSERIAL PRIMARY KEY,
  skill_term  TEXT NOT NULL UNIQUE,
  vector      FLOAT[] NOT NULL,
  model       TEXT DEFAULT 'text-embedding-3-small',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobseeker_interactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id   UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL CHECK (event_type IN ('view', 'save', 'apply', 'ignore', 'click')),
  signal_weight  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  session_id     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employer_hiring_outcomes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id                UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  employer_id                 UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  outcome                     TEXT NOT NULL CHECK (outcome IN ('hired', 'shortlisted', 'interviewed', 'rejected', 'withdrew')),
  match_score_at_decision      NUMERIC(5,2),
  dimension_scores_snapshot    JSONB,
  employer_notes               TEXT,
  recorded_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companion view: recalibration signal aggregation.
-- CONFIRMED to exist (Task 9.1 incorrectly reported no CREATE VIEW anywhere
-- in the repo; re-verified in Task 10 Step 1a: it is defined at
-- supabase/migrations/20260604020000_employer_feedback.sql:22-32, and that
-- was the correct finding from Task 8. This document corrects the record.)
CREATE VIEW employer_feedback_summary AS
SELECT
  job_id,
  outcome,
  COUNT(*) AS outcome_count,
  AVG(match_score_at_decision) AS avg_score_at_decision,
  AVG((dimension_scores_snapshot->>'f1_skills')::numeric) AS avg_f1,
  AVG((dimension_scores_snapshot->>'f2_experience')::numeric) AS avg_f2,
  AVG((dimension_scores_snapshot->>'f3_education')::numeric) AS avg_f3
FROM employer_hiring_outcomes
GROUP BY job_id, outcome;

-- The following two tables are CODE-REFERENCED but have NO CREATE TABLE
-- evidence anywhere in this repository (confirmed by repo-wide .sql grep
-- in this session). They are included because excluding them would leave
-- the local app unable to run the matching-engine code paths that
-- reference them; every column below is inferred from runtime usage, not
-- from a schema file, and is marked accordingly.

-- RISK NOTE (see decision record): ranking_cache and jobseeker_features
-- have NO CREATE TABLE evidence anywhere in this repository. Every column
-- below is marked INFERRED FROM CODE with its exact path:line, per this
-- task's explicit instruction, rather than left as an open VERIFY — this
-- is the minimal shape the code reads/writes, not a confirmed schema.

CREATE TABLE IF NOT EXISTS ranking_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- INFERRED FROM CODE: no primary key column is referenced by
  -- app/lib/matching/ranking-cache-engine.ts at all; added here as a
  -- structural necessity only, not evidenced by usage.
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  -- INFERRED FROM CODE: app/lib/matching/ranking-cache-engine.ts:14,16,30,31,41
  -- (select/upsert/delete all keyed on job_id). FK to jobs(id) is a
  -- reasonable addition, not itself evidenced by the code.
  results     JSONB NOT NULL,
  -- INFERRED FROM CODE: app/lib/matching/ranking-cache-engine.ts:15,22,32
  -- (`results, expires_at` selected; `results` upserted as the ranked
  -- array).
  expires_at  TIMESTAMPTZ NOT NULL,
  -- INFERRED FROM CODE: app/lib/matching/ranking-cache-engine.ts:15,20,33
  -- (compared against `new Date()` to decide cache validity).
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Not evidenced by code at all; added for consistency with every other
  -- table in this baseline, same caveat as other structural additions.
  UNIQUE (job_id)
  -- FOUND IN TASK 12 (Part C.3) — a MISSING CONSTRAINT that caused a
  -- silent cache-growth bug: app/lib/matching/ranking-cache-engine.ts:30-34
  -- calls `.upsert({ job_id, results, expires_at })` with NO onConflict
  -- argument at all. Without a UNIQUE(job_id) constraint, PostgREST's
  -- default upsert target is the primary key (`id`), which is never
  -- supplied in the payload — so every "cache write" for the same job_id
  -- silently INSERTs a brand-new row instead of replacing the old one,
  -- defeating the entire purpose of a cache and growing this table
  -- unboundedly. Adding UNIQUE(job_id) here is necessary but NOT
  -- sufficient to fix the bug: the application code must ALSO be changed
  -- to pass `{ onConflict: "job_id" }`, which is out of scope for this
  -- schema task — see decision record.
);

CREATE TABLE IF NOT EXISTS jobseeker_features (
  -- DECIDED (Task 12, Part A, item #25): FK restored,
  -- `REFERENCES jobseekers(id) ON DELETE CASCADE` — jobseeker_features is
  -- per-person working data (precomputed matching features), the FK-policy
  -- category that uses CASCADE, same as the jobseeker child tables and
  -- jobseeker_saved_jobs. INFERRED FROM CODE: app/lib/matching/
  -- feature-store.ts:22-26,32-33,48 (`.in('id', seekerIds)` /
  -- `.upsert({ id, ...updates })`), keyed on `id` matched against
  -- jobseeker ids.
  id                  UUID PRIMARY KEY REFERENCES jobseekers(id) ON DELETE CASCADE,
  skill_vector         JSONB,
  -- INFERRED FROM CODE: app/lib/matching/feature-store.ts:11,22-37
  -- (TypeScript types this `number[]`; stored as JSONB here — a lossless,
  -- reasonable Postgres representation of a JS array — because no
  -- evidence confirms a fixed dimension or that pgvector, rather than
  -- JSONB, is the intended storage for this specific column, unlike
  -- profile_embedding/job_embedding which have direct pgvector evidence
  -- in docs/migrations/phase5b_pgvector.sql).
  exp_vector            JSONB,
  -- INFERRED FROM CODE: same evidence/reasoning as skill_vector, above.
  ontology_scores        JSONB DEFAULT '{}'::jsonb,
  -- INFERRED FROM CODE: app/lib/matching/feature-store.ts:13,36
  -- (`ontology_scores: Record<string, number>`, defaulted to `{}` when
  -- absent).
  calibration_factor     NUMERIC DEFAULT 1.0,
  -- INFERRED FROM CODE: app/lib/matching/feature-store.ts:14,37
  -- (`calibration_factor: number`, defaulted to `1.0` when absent).
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Not evidenced by code at all; added for consistency with every other
  -- table in this baseline.
);

-- UPDATE (Task 12, Part D.2): match_jobseekers_to_job(),
-- upsert_job_match_scores(), and compute_job_percentiles() are CALLED by
-- live code and are now PORTED as executable SQL in SECTION 11 below
-- (reversing Task 10/11's deferral, which was based on a narrower reading
-- of "deferred" that didn't yet check actual .rpc(...) call sites).
-- cleanup_stale_dimensions is correctly excluded — see SECTION 11 for why
-- it was never a function to begin with.


-- ============================================================================
-- SECTION 10: INDEXES
-- ============================================================================
-- Consolidated from every file cited above. Re-listed here once, in one
-- place, rather than scattered per-table, so the baseline's final index
-- set is reviewable as a unit.

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_job_match_scores_job_score ON job_match_scores (job_id, suitability_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_match_scores_utility_rank ON job_match_scores (job_id, utility_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_match_scores_percentile ON job_match_scores (job_id, percentile_rank DESC);
CREATE INDEX IF NOT EXISTS idx_job_match_scores_feature_vector ON job_match_scores USING gin (feature_vector);

CREATE INDEX IF NOT EXISTS idx_skill_correction_cache_raw_input ON skill_correction_cache (raw_input);
CREATE INDEX IF NOT EXISTS idx_role_equivalence_cache_roles ON role_equivalence_cache (role_a, role_b);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_synonyms_alias ON skill_synonyms (alias);
CREATE INDEX IF NOT EXISTS idx_skill_synonyms_canonical ON skill_synonyms (canonical);
CREATE INDEX IF NOT EXISTS idx_skill_embeddings_cache_term ON skill_embeddings_cache (skill_term);

CREATE INDEX IF NOT EXISTS idx_match_disparity_job_id ON match_disparity_flags (job_id);
CREATE INDEX IF NOT EXISTS idx_match_disparity_flag_type ON match_disparity_flags (flag_type);
CREATE INDEX IF NOT EXISTS idx_match_feedback_job_seeker ON match_feedback_logs (job_id, jobseeker_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_captured ON match_feedback_logs (captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_jobseeker ON jobseeker_interactions (jobseeker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_job ON jobseeker_interactions (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_job ON employer_hiring_outcomes (job_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_employer ON employer_hiring_outcomes (employer_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobseekers_matching_completeness ON jobseekers (matching_completeness_pct);

-- RESOLVED (Class A) in Task 11: docs/migrations/phase5b_pgvector.sql:18-24
-- fully transcribed, now that the embedding dimension question (SECTION 2)
-- is resolved to 768. Both indexes are HNSW, cosine-distance.
CREATE INDEX IF NOT EXISTS idx_jobseeker_profile_embedding
  ON jobseekers USING hnsw (profile_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_job_embedding
  ON jobs USING hnsw (job_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);


-- ============================================================================
-- SECTION 11: FUNCTIONS AND TRIGGERS
-- ============================================================================
--
-- handle_new_user() / on_auth_user_created: PORTED AS EXECUTABLE SQL in
-- Task 12, Part D.1 (reversing Task 10/11's "specification only"
-- deferral, per this task's explicit instruction). Ported verbatim from
-- scripts/migrations/20260426_fix_auth_trigger.sql:7-74 against the FINAL
-- column lists above. Every column it writes was checked against SECTION
-- 2: jobseekers(id, email, first_name, last_name, password_hash) — all
-- five present; employers(id, email, establishment_name, contact_person,
-- password_hash) — all five present. NO COLUMN IT WRITES IS MISSING FROM
-- THIS BASELINE. Kept faithful to the original, per instruction — NOT
-- redesigned: still only a jobseeker/employer branch (no admin branch,
-- same confirmed gap as before — no code path anywhere creates an admins
-- row), still writes the 'auth_managed' placeholder, still uses
-- `ON CONFLICT (id) DO UPDATE`.
--
-- OPEN QUESTION, UNCHANGED FROM TASK 10/11, NOT RESOLVED BY PORTING THIS
-- FAITHFULLY: the trigger's INSERT now targets a column (`jobseekers.id` /
-- `employers.id`) that carries a `REFERENCES auth.users(id) ON DELETE
-- RESTRICT` FK the original trigger was never written against. Because
-- the trigger fires AFTER INSERT ON auth.users, NEW.id already exists in
-- auth.users by the time this function runs, so the FK should be
-- satisfied in the normal case — this is noted as a residual risk to
-- verify under the local test plan (decision record), not fabricated
-- behavior to "fix" here.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- RPC functions actually called by live code (Task 12, Part D.2)
-- ----------------------------------------------------------------------------
-- Every `.rpc("...")` call site in app/ and scripts/ was grepped. Result:
--
--   match_jobseekers_to_job   — CALLED (app/lib/matching/engine/
--                               DataFetcher.ts:13, app/lib/matching/
--                               services/RankingService.ts:65) → PORTED below.
--   upsert_job_match_scores   — CALLED (app/lib/matching/
--                               persistence-engine.ts:60) → PORTED below.
--   compute_job_percentiles   — CALLED (app/lib/matching/
--                               persistence-engine.ts:96) → PORTED below.
--   cleanup_stale_dimensions  — NOT a function at all. supabase/migrations/
--                               20260430130000_cleanup_stale_dimensions.sql
--                               is a one-time data-cleanup UPDATE statement
--                               (strips stale 'f4'/'f5' JSONB keys), never a
--                               `CREATE FUNCTION`. No `.rpc(...)` call for it
--                               exists anywhere because none could — there
--                               is nothing to call. Correctly excluded; not
--                               "deferred," simply not an RPC.
--   run_sql / exec_sql /
--   get_table_columns         — CALLED (app/api/admin/fix-db/route.ts:6,
--                               scripts/run-migration-via-rpc.js:34,
--                               scripts/run-migration.mjs:46,
--                               scripts/check-db-schema.ts:31,
--                               scripts/check-jobs-cols.ts:4) but NO
--                               `CREATE FUNCTION` for any of the three
--                               exists anywhere in this repository's SQL.
--                               These are generic ad-hoc DB-admin utility
--                               RPCs, not tied to any table in this
--                               baseline's schema — there is nothing local
--                               to port; they must have been created
--                               directly on a hosted project and never
--                               captured in a committed migration. Flagged
--                               for manual review, not blocking — see
--                               decision record.

-- PORTED from docs/migrations/phase5b_pgvector.sql:28-50, faithfully.
-- Returns `nsrp_id`, not `jobseekers.id` — both call sites above
-- defensively read `item.id || item.nsrp_id`, i.e. the calling code
-- already anticipates this function predates the auth.users-anchored
-- design and falls back to nsrp_id. Ported as-is (not redesigned) because
-- the function body itself is self-contained against this baseline's
-- final jobseekers/jobs columns (profile_embedding, job_embedding,
-- nsrp_id, id) and does not actually reference the excluded `users` table
-- in its SQL — only in an explanatory comment. A future rewrite to return
-- jobseekers.id directly (matching the calling code's PREFERRED field)
-- is recommended but not performed here.
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

-- PORTED from supabase/migrations/20260430120000_upsert_job_match_scores.sql:8-74,
-- faithfully. Every column it inserts into job_match_scores (job_id,
-- jobseeker_id, utility_score, suitability_score, grade, dimension_scores,
-- constraint_violations, match_evidence, summary, ai_summary, strengths,
-- gaps, percentile_rank, computed_at, corrections) exists in SECTION 9
-- above — no column mismatch.
CREATE OR REPLACE FUNCTION upsert_job_match_scores(
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

REVOKE ALL ON FUNCTION upsert_job_match_scores(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_job_match_scores(UUID, JSONB) TO service_role;

-- PORTED from supabase/migrations/20260430140000_compute_job_percentiles.sql:7-32,
-- faithfully. References job_match_scores.percentile_rank/utility_score/
-- job_id/id, all present in SECTION 9 above.
CREATE OR REPLACE FUNCTION compute_job_percentiles(target_job_id UUID)
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

REVOKE ALL ON FUNCTION compute_job_percentiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compute_job_percentiles(UUID) TO service_role;


-- ============================================================================
-- RLS: DELIBERATELY ABSENT FROM THIS FILE
-- ============================================================================
-- No RLS policy of any kind is declared anywhere above. Binding decision
-- #13 (Task 9.1) and the project's standing pilot-constraints memory both
-- require RLS to be designed and tested as its own separate, later task,
-- with synthetic integration tests for human review before anyone applies
-- it. The historical RLS file (scripts/migrations/20260424_enable_rls.sql)
-- is known-defective (compares auth.uid()::uuid directly against
-- varchar/text columns on messages/notifications with no cast — see
-- SECTION 6 evidence chain) and must not be reapplied as-is.
--
-- IMPORTANT POSTURE NOTE for the future RLS task: several current API
-- routes may use a non-service-role Supabase client for some operations
-- (this was not re-audited table-by-table in this pass). Until RLS is
-- designed, any table with RLS enabled but no policy denies all access by
-- default to non-service-role clients, and any table with RLS NOT enabled
-- is fully open to any client holding the anon key if it is ever queried
-- directly (bypassing the API layer). The RLS task must evaluate a
-- deny-by-default posture explicitly table-by-table against which actual
-- client (service-role vs. anon/authenticated) each current route uses —
-- this baseline does not enable RLS on any table, so today's "service-role
-- bypasses everything" behavior is unchanged by this document.


-- ============================================================================
-- SECTION 12: SUPPORT TABLES
-- ============================================================================
-- These tables are outside the role-profile/matching/referral/deletion
-- scope the 17 binding decisions govern, but ARE actively queried by
-- current, live code — excluding them would leave the local app visibly
-- incomplete (homepage sections empty, SRS approval history missing,
-- landing content missing). Included per this task's explicit instruction
-- to keep the local app complete wherever Step 1b confirmed a code
-- reference.

CREATE TABLE IF NOT EXISTS srs_approval_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'pending')),
  reason      TEXT,
  admin_note  TEXT,
  -- DECIDED (Task 12, Part A, item #28): FK added,
  -- `REFERENCES admins(id) ON DELETE SET NULL`, relaxed to nullable (SET
  -- NULL requires it) — this is an audit/history record, the FK-policy
  -- category that uses SET NULL. docs/migrations/phase1_migration.sql:139
  -- declared admin_id as bare UUID NOT NULL with no FK;
  -- app/api/admin/employers/[id]/srs/route.ts:120-127 confirms the exact
  -- column set {employer_id, action, reason, admin_note, admin_id,
  -- admin_name, created_at} is still what live code writes.
  admin_id    UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RESOLVED (Class A) in Task 11 for all five landing_* tables below: full
-- column lists transcribed from scripts/migrations/
-- 20260424_landing_page_tables.sql (read in full), matching the code
-- references confirmed in Task 10 (app/api/landing/testimonials/route.ts:62,
-- app/api/landing/faqs/route.ts:20, app/api/landing/partners/route.ts:20,
-- app/api/landing/news/route.ts:20, app/api/public/impact/route.ts:58).
-- The historical file enables RLS with public-SELECT policies on all five
-- (lines 68-79) — omitted here per this baseline's RLS-deliberately-absent
-- posture (see the RLS note before this section).

CREATE TABLE IF NOT EXISTS landing_testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  company     TEXT,
  quote       TEXT NOT NULL,
  avatar_url  TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_faqs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT NOT NULL,
  answer         TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'General',
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_partners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  tagline        TEXT,
  logo_url       TEXT,
  website_url    TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  excerpt       TEXT,
  content       TEXT,
  image_url     TEXT,
  link_url      TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landing_metrics (
  -- Note: this table's primary key is `key` itself (TEXT), not a
  -- surrogate UUID — matching scripts/migrations/
  -- 20260424_landing_page_tables.sql:56-62 exactly, including its seed
  -- INSERTs keyed on `key` with `ON CONFLICT (key) DO NOTHING` (lines
  -- 82-86, not replayed here — binding decision #17, this file is
  -- schema-only).
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  label       TEXT,
  unit        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FOUND IN TASK 12 (Part C), MISSING FROM THE TASK 10/11 DRAFT: a generic
-- key/value `settings` table, confirmed real and actively read at
-- app/api/health/route.ts:35, app/api/summary/route.ts:37,
-- app/api/experience/route.ts:74-92 (keys "years_of_service",
-- "experience_highlights"), and app/api/notes/route.ts:31-35 (key
-- "legacy_notes"). The health/summary routes only ever do
-- `.select("key").limit(1)` as an existence ping, but the other two routes
-- confirm the full {key, value} shape. `value` is read with
-- `JSON.parse(...)` in app/api/experience/route.ts:96 and
-- app/api/notes/route.ts — i.e. the client receives it as a plain string
-- that the application parses, not as something PostgREST already
-- deserialized — so it is typed TEXT here, not JSONB.
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FOUND IN TASK 12 (Part C), MISSING FROM THE TASK 10/11 DRAFT, VERY
-- THIN EVIDENCE — same treatment as ranking_cache/jobseeker_features.
-- VERIFY (Class B — would need a dashboard column list to go beyond this;
-- the only code reference is a bare existence/count check):
-- app/admin/dashboard/_lib/data-loader.ts:272 does
-- `.from("skill_suggestions").select("id", { count: "exact", head: true })`
-- — confirms the table exists and has an `id` column, for a dashboard
-- metric tile. No other column is referenced anywhere in app/. Included
-- as a minimal stub so the dashboard count query does not break; its full
-- shape is unknown.
CREATE TABLE IF NOT EXISTS skill_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dead_letter_queue and message_threads: DEFERRED, not included.
--
--   dead_letter_queue — scripts/migrations/20260428_add_dead_letter_queue.sql.
--   A repo-wide grep of app/ for this table name in this session found
--   ZERO code references (unlike the five landing_* tables and
--   srs_approval_history above, which all had confirmed references).
--   Deferred to a later incremental migration per this task's explicit
--   rule: "otherwise list them as deferred with a reason."
--
--   message_threads — see SECTION 6. Zero code references found; excluded
--   entirely rather than merely deferred, because its only purpose
--   (thread_id FK target on messages) was also excluded.


-- ============================================================================
-- EXPLICITLY NOT INCLUDED ANYWHERE IN THIS DOCUMENT
-- ============================================================================
--   - public.users (binding decision #3)
--   - Any RLS policy (binding decision #13; see RLS note above)
--   - Any Storage bucket or Storage policy (binding decision #14)
--   - Any seed/INSERT data (binding decision #17; this is schema only)
--   - Any hard-delete logic/trigger/function (binding decision #16)
--   - referral_slips.employer_feedback_at (binding decision #11)
--   - admin_access_requests.reason (binding decision #10)
--   - Any content derived from scripts/rebuild-schema.sql lines 212-218
--     (confirmed byte-corrupted in Task 10 Step 1d)
