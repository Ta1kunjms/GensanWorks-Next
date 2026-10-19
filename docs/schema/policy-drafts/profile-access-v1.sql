-- ============================================================================
-- profile-access-v1.sql — PROFILE ACCESS-CONTROL DRAFT (Task 13Z-I)
-- ============================================================================
--
-- STATUS:
--   * DRAFT ONLY. NOT AN ACTIVE MIGRATION. NOT EXECUTED.
--   * SYNTHETIC TARGET ONLY. Never apply to a hosted/production project.
--   * DEPENDS ON COMPATIBILITY CHANGES AND TARGET REVIEW (listed below).
--   * Kept outside supabase/migrations/ and separate from the Core-A baseline
--     draft (docs/schema/generated/core-a-canonical-baseline-v1.sql).
--   * Promotion requires explicit owner approval and a generated Supabase CLI
--     migration applied by a human after synthetic database tests pass.
--
-- SCOPE: public.admins, public.employers, public.jobseekers ONLY.
--   This draft does NOT secure the other Core-A tables, functions
--   (e.g. match_jobseekers_to_job), or Storage buckets. Those need their own
--   reviewed controls.
--
-- INTENDED MODEL:
--   anon           : no table or column privileges.
--   authenticated  : SELECT (id, is_active) on its OWN row only.
--                    No INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER.
--   service_role   : unchanged by this draft; server routes use it and it
--                    bypasses RLS. Its protection is application authorization
--                    (auth() profile-role resolver + per-route guards).
--   signup trigger : public.handle_new_user() (SECURITY DEFINER) keeps writing
--                    as the table owner. RLS is ENABLED but NOT FORCED so the
--                    owner is not subject to row policies.
--
-- COMPATIBILITY PREREQUISITES (must be complete before any execution):
--   1. app/auth/callback/route.ts inserts into public.jobseekers with the
--      user-scoped client; that insert will be denied. Remove or move it
--      server-side (Google provisioning/consent decision is unresolved).
--   2. app/admin/referrals/page.tsx reads public.jobseekers from the browser;
--      move that lookup to a guarded server route.
--   3. app/lib/supabase-middleware.ts reads own profile rows with the
--      user-scoped client (select 'id'); it remains compatible with the own-row
--      SELECT (id, is_active) grant, but its metadata-first role logic must be
--      aligned separately.
--   4. app/lib/supabase.ts falls back to the anon key when the service-role key
--      is missing; under this draft that fallback fails closed (server profile
--      reads are denied). Remove the fallback and separate browser imports.
--
-- PRE-EXECUTION CHECKS (read-only; run on the synthetic target and review):
--   a) Owners: table owner of each table, and owner of public.handle_new_user();
--      the function owner must own the tables (or hold BYPASSRLS) so signup
--      provisioning is unaffected by RLS.
--        SELECT c.relname, pg_get_userbyid(c.relowner), c.relrowsecurity,
--               c.relforcerowsecurity
--        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--        WHERE n.nspname = 'public' AND c.relname IN ('admins','employers','jobseekers');
--        SELECT p.proname, pg_get_userbyid(p.proowner), p.prosecdef
--        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
--   b) Existing policies. Permissive policies are OR-combined, so adding the
--      policies below does NOT neutralize an existing permissive policy
--      (e.g. a USING (true) read policy). Every existing policy on these three
--      tables must be reviewed and explicitly reconciled before execution.
--        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--        FROM pg_policies
--        WHERE schemaname = 'public' AND tablename IN ('admins','employers','jobseekers');
--      Known local-history policies (scripts/migrations/20260424_enable_rls.sql)
--      that conflict with this model if present on the target:
--        "Jobseekers can view own profile"   (FOR SELECT, USING auth.uid() = id)
--        "Jobseekers can update own profile" (FOR UPDATE — whole-row self-update)
--      See the REVIEW block in section 3; nothing is dropped automatically.
--   c) Table-level privileges:
--        SELECT grantee, table_name, privilege_type
--        FROM information_schema.role_table_grants
--        WHERE table_schema = 'public' AND table_name IN ('admins','employers','jobseekers')
--        ORDER BY table_name, grantee;
--   d) Column-level privileges. A table-level REVOKE does NOT remove column
--      privileges that were granted separately; section 1 revokes them
--      explicitly per column, and this check must show none remaining for
--      anon/authenticated except the section 2 grants.
--        SELECT grantee, table_name, column_name, privilege_type
--        FROM information_schema.column_privileges
--        WHERE table_schema = 'public' AND table_name IN ('admins','employers','jobseekers')
--          AND grantee IN ('anon','authenticated','PUBLIC')
--        ORDER BY table_name, grantee, column_name;
--   e) service_role: confirm the role exists, holds BYPASSRLS, and has the
--      table privileges the server routes need. This draft grants nothing to
--      service_role and revokes nothing from it.
--   f) Default privileges (ALTER DEFAULT PRIVILEGES) re-grant on newly created
--      tables; if any of these tables is dropped and re-created, re-apply.
--   g) The column lists below match the Core-A draft; reconcile them with the
--      target's actual columns (any extra target column needs the same revoke).
--
-- ============================================================================

-- Execution guard: this draft aborts unless a reviewer deliberately removes
-- this block on an approved synthetic target.
DO $$
BEGIN
  RAISE EXCEPTION 'profile-access-v1.sql is a DRAFT and must not be executed without approval';
END
$$;

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
