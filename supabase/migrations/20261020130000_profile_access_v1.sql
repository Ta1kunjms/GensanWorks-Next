-- Migration: profile-access-v1 — own-row profile access for clients (Task 13Z-I)
-- Date: 2026-10-20
-- Status: REVIEW-ONLY. Never applied by an agent. Apply manually in the Supabase
-- SQL editor only after the owner steps below. Do NOT apply it implicitly with
-- "supabase db push" together with other migrations.
--
-- Source: docs/schema/policy-drafts/profile-access-v1.sql (13Z-I draft). This file
-- is that draft's BEGIN..COMMIT body without the execution guard, plus one grant:
--   GRANT SELECT (consent_given_at) ON public.jobseekers TO authenticated
-- needed by the OAuth consent-gate callback.
--
-- Effect (tables public.admins, public.employers, public.jobseekers only):
--   * anon: no privileges.
--   * authenticated: SELECT on its OWN row only, columns id, is_active
--     (+ consent_given_at on jobseekers). No writes.
--   * service_role and the SECURITY DEFINER signup trigger are unaffected
--     (RLS enabled, not forced). All other app reads/writes of these tables
--     already go through the server-side service-role client.
--
-- Prerequisites from the draft, status 2026-10-20:
--   1. callback must not insert profiles with the user client .... DONE (13Z-S, c75b99e)
--   2. admin referrals page must not read jobseekers in the browser DONE (13Z-J2)
--   3. middleware reads only own id/is_active ...................... DONE (13Z-S)
--   4. no anon-key fallback in app/lib/supabase.ts ................... DONE (13Z-K)
--
-- OWNER STEPS BEFORE APPLYING (see PROJECT_STATE.md section 9, M8):
--   a) Run the draft's read-only PRE-EXECUTION CHECKS (a)-(d) and the column
--      list query below; share the results so the column-level REVOKE lists can
--      be reconciled with the target (an unknown column aborts the whole
--      transaction; nothing is changed in that case).
--        SELECT table_name, column_name FROM information_schema.columns
--        WHERE table_schema = 'public' AND table_name IN ('admins','employers','jobseekers')
--        ORDER BY table_name, ordinal_position;
--   b) Prefer a synthetic project first. The draft was written as
--      SYNTHETIC TARGET ONLY; applying to production is an owner decision.
--
-- Rollback (restores broad client access; review before use):
--   DROP POLICY profile_access_v1_admins_select_own ON public.admins;
--   DROP POLICY profile_access_v1_employers_select_own ON public.employers;
--   DROP POLICY profile_access_v1_jobseekers_select_own ON public.jobseekers;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins, public.employers, public.jobseekers TO authenticated;
--   (RLS stays enabled; re-check pre-existing policies from check (b).)

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Remove client privileges (table-level, then column-level)
-- ----------------------------------------------------------------------------

REVOKE ALL ON TABLE public.admins     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.employers  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.jobseekers FROM PUBLIC, anon, authenticated;

REVOKE ALL (
  id, name, email, password_hash, role, is_active, last_login, created_at, updated_at
) ON public.admins FROM PUBLIC, anon, authenticated;

REVOKE ALL (
  id, email, password_hash, establishment_name, province, city, barangay, address,
  total_paid_employees, total_vacant_positions, industry, industry_code,
  contact_person, contact_phone, designation, company_tax_id,
  srs_form_file, business_permit_file, bir_2303_file, company_profile_file,
  dole_certification_file, profile_image, account_status, verified_at,
  srs_status, srs_rejection_reason, srs_submitted_at, srs_approved_at, srs_version,
  consent_given_at, consent_privacy_notice_version,
  is_active, last_login, created_at, updated_at
) ON public.employers FROM PUBLIC, anon, authenticated;

REVOKE ALL (
  id, email, password_hash, first_name, last_name, middle_name, suffix, birth_date,
  gender, religion, civil_status, tin, height, is_pwd, pwd_type, pwd_type_others,
  phone, house_number, barangay, city, province, zip_code,
  employment_status, employment_type, self_employed_type, self_employed_type_others,
  unemployed_reason, unemployed_months, unemployed_due_to_calamity,
  terminated_country, terminated_reason, is_ofw, ofw_country, is_former_ofw,
  former_ofw_country, former_ofw_return_month_year, is_four_ps, household_id_no,
  disability_visual, disability_speech, disability_mental, disability_hearing,
  disability_physical, disability_others, preference_part_time, preference_full_time,
  preferred_occupation_1, preferred_occupation_2, preferred_occupation_3, settings,
  preferred_work_location_local, preferred_work_location_overseas,
  preferred_work_location_local_1, preferred_work_location_local_2,
  preferred_work_location_local_3, preferred_work_location_overseas_1,
  preferred_work_location_overseas_2, preferred_work_location_overseas_3,
  other_skills, other_skills_others, profile_image, nsrp_id, profile_complete,
  profile_completeness, matching_completeness_pct, job_seeking_status,
  work_setup_preference, expected_salary_min, expected_salary_max,
  profile_embedding, consent_given_at, consent_privacy_notice_version,
  is_active, last_login, created_at, updated_at
) ON public.jobseekers FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Narrow authenticated read: own row, id and is_active only
-- ----------------------------------------------------------------------------

GRANT SELECT (id, is_active) ON public.admins     TO authenticated;
GRANT SELECT (id, is_active) ON public.employers  TO authenticated;
GRANT SELECT (id, is_active) ON public.jobseekers TO authenticated;

-- Added on promotion (2026-10-20): the OAuth callback reads its own consent
-- timestamp with the user-scoped client (app/auth/callback/route.ts).
GRANT SELECT (consent_given_at) ON public.jobseekers TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Row-level security (enabled, not forced) and own-row SELECT policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.admins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobseekers ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_access_v1_admins_select_own
  ON public.admins
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profile_access_v1_employers_select_own
  ON public.employers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profile_access_v1_jobseekers_select_own
  ON public.jobseekers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- REVIEW (not executed as written): reconcile pre-existing policies found by
-- pre-execution check (b). Only after confirming each is present on the target
-- and obtaining owner approval, remove the ones that conflict with this model,
-- by exact name, for example:
--   DROP POLICY "Jobseekers can update own profile" ON public.jobseekers;
--   DROP POLICY "Jobseekers can view own profile"   ON public.jobseekers;
-- Without UPDATE privileges a permissive UPDATE policy cannot be exercised, but
-- leaving it in place invites accidental re-exposure if privileges are re-granted.

COMMIT;

-- ============================================================================
-- POST-EXECUTION VERIFICATION (synthetic target; not database tests until run)
--   * anon: SELECT/INSERT/UPDATE/DELETE on each table -> permission denied.
--   * authenticated: INSERT into public.admins (own id) -> denied.
--   * authenticated: UPDATE own is_active / id / email / srs_status /
--     password_hash / nsrp_id -> denied.
--   * authenticated: SELECT id, is_active of own row -> 1 row; another user's
--     row -> 0 rows; SELECT email or password_hash -> denied.
--   * auth.users insert with role metadata jobseeker / employer / admin / none
--     -> jobseekers row / employers row / no profile / jobseekers row.
--   * service-role profile-role resolution for active / inactive / missing /
--     conflicting synthetic users -> role / null / null / null.
-- ============================================================================
