-- Migration: Option C — no profile for OAuth (Google) users before consent
-- Date: 2026-10-20
-- Status: REVIEW-ONLY. Generated for the owner to apply manually; never applied by an agent.
--
-- Why: public.handle_new_user() currently creates a jobseekers row for every new
-- auth user, including Google users who have not yet seen the privacy notice.
-- After this change, OAuth users get no profile until they accept consent at
-- /auth/consent, where applyConsentAction (app/lib/google-consent.ts) inserts
-- the jobseekers row together with consent_given_at and the notice version.
--
-- What changes:
--   * Early RETURN when raw_app_meta_data.provider is anything other than 'email'.
--   * SET search_path = public (SECURITY DEFINER hardening; table names were
--     already schema-qualified).
--   * Email/password signup behavior (jobseeker and employer branches) is unchanged.
--
-- Affected objects: function public.handle_new_user() only. The trigger
-- on_auth_user_created keeps pointing at it. No table, data, or policy changes.
-- Existing profiles are untouched.
--
-- App behavior already in place for "no profile yet" OAuth users:
--   * app/auth/callback/route.ts: decision "none" -> /auth/consent
--   * app/lib/supabase-middleware.ts: unconsented OAuth users held at /auth/consent
--   * POST /api/auth/consent accept: inserts the jobseekers row with consent
--
-- Validation after applying (read-only):
--   SELECT pg_get_functiondef('public.handle_new_user'::regproc);
--     -> contains "provider" early return and "SET search_path TO 'public'"
--   Then sign up with a fresh Google test account and run:
--   SELECT id, consent_given_at FROM public.jobseekers WHERE email = '<test google email>';
--     -> 0 rows while on the consent page; 1 row with consent_given_at after Accept.
--
-- Rollback: re-run the previous definition (preserved at the end of this file).

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_establishment_name TEXT;
BEGIN
  -- Option C: OAuth (e.g. Google) users get no profile until they accept the
  -- privacy notice; the consent API creates it with consent recorded.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    RETURN NEW;
  END IF;

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
  v_last_name  := COALESCE(v_last_name, '');

  IF v_role = 'jobseeker' THEN
    INSERT INTO public.jobseekers (id, email, first_name, last_name, password_hash)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, 'auth_managed')
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      updated_at = now();

  ELSIF v_role = 'employer' THEN
    INSERT INTO public.employers (id, email, establishment_name, contact_person, password_hash)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(v_establishment_name, 'Unnamed Employer'),
      COALESCE(v_full_name, v_first_name),
      'auth_managed'
    )
    ON CONFLICT (id) DO UPDATE SET
      establishment_name = EXCLUDED.establishment_name,
      contact_person     = EXCLUDED.contact_person,
      updated_at         = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- ROLLBACK (previous live definition, captured 2026-10-20 via pg_get_functiondef).
-- To roll back, run the block below without the leading "-- ".
-- ============================================================================
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
-- DECLARE
--   v_role TEXT;
--   v_first_name TEXT;
--   v_last_name TEXT;
--   v_full_name TEXT;
--   v_establishment_name TEXT;
-- BEGIN
--   v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'jobseeker');
--   v_first_name := NEW.raw_user_meta_data->>'first_name';
--   v_last_name := NEW.raw_user_meta_data->>'last_name';
--   v_full_name := NEW.raw_user_meta_data->>'full_name';
--   v_establishment_name := NEW.raw_user_meta_data->>'establishment_name';
--   IF v_first_name IS NULL AND v_full_name IS NOT NULL THEN
--     v_first_name := split_part(v_full_name, ' ', 1);
--   END IF;
--   IF v_last_name IS NULL AND v_full_name IS NOT NULL THEN
--     v_last_name := substring(v_full_name from position(' ' in v_full_name) + 1);
--   END IF;
--   v_first_name := COALESCE(v_first_name, 'User');
--   v_last_name  := COALESCE(v_last_name, '');
--   IF v_role = 'jobseeker' THEN
--     INSERT INTO public.jobseekers (id, email, first_name, last_name, password_hash)
--     VALUES (NEW.id, NEW.email, v_first_name, v_last_name, 'auth_managed')
--     ON CONFLICT (id) DO UPDATE SET
--       first_name = EXCLUDED.first_name,
--       last_name  = EXCLUDED.last_name,
--       updated_at = now();
--   ELSIF v_role = 'employer' THEN
--     INSERT INTO public.employers (id, email, establishment_name, contact_person, password_hash)
--     VALUES (
--       NEW.id, NEW.email,
--       COALESCE(v_establishment_name, 'Unnamed Employer'),
--       COALESCE(v_full_name, v_first_name),
--       'auth_managed'
--     )
--     ON CONFLICT (id) DO UPDATE SET
--       establishment_name = EXCLUDED.establishment_name,
--       contact_person     = EXCLUDED.contact_person,
--       updated_at         = now();
--   END IF;
--   RETURN NEW;
-- END;
-- $function$;
