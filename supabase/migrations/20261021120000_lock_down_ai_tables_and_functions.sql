-- Migration: lock down AI matching tables, a SECURITY DEFINER view, and functions
-- Date: 2026-10-21 · Source: docs/system-scan-2026-10-21.md §8 (items 1, 3, 4, 5)
-- Status: REVIEW-ONLY. Never applied by an agent (pilot rule #8). The owner runs it
-- in the Supabase SQL editor (project dkpzieytlqkbhhpqpvyr).
--
-- WHY
--   job_match_scores, ai_matching_logs, dead_letter_queue, skill_synonyms and
--   skill_embeddings_cache each have a policy `FOR ALL TO public USING (true)
--   WITH CHECK (true)`, and anon/authenticated hold full table grants. Anyone
--   with the public anon key can read, insert, change or delete these rows
--   (e.g. rewrite candidate match scores).
--
-- WHO USES THESE TABLES
--   Only server code through the service-role client (app/lib/matching/**,
--   app/api/admin/matching/**, app/api/employer/matching/**, narrative route).
--   service_role bypasses RLS and keeps its grants, so the app is unaffected.
--   No browser code reads these tables (checked 2026-10-21).
--
-- AFFECTED OBJECTS
--   Tables: the five above (policies dropped, client grants revoked; RLS stays on,
--   so clients get no rows). View: employer_feedback_summary (security_invoker).
--   Functions: handle_new_user(), rls_auto_enable() (no client EXECUTE);
--   upsert_job_match_scores, compute_job_percentiles (pinned search_path).
--   No data is changed or deleted.
--
-- VALIDATION (read-only, after applying)
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename IN ('job_match_scores','ai_matching_logs',
--     'dead_letter_queue','skill_synonyms','skill_embeddings_cache');          -- 0 rows
--   SELECT grantee, table_name, string_agg(privilege_type, ',')
--   FROM information_schema.role_table_grants
--   WHERE table_schema='public' AND grantee IN ('anon','authenticated')
--     AND table_name IN ('job_match_scores','ai_matching_logs','dead_letter_queue',
--       'skill_synonyms','skill_embeddings_cache') GROUP BY 1,2;              -- 0 rows
--   Then, as admin, run matching on one job in the app: results still appear.
--
-- ROLLBACK (restores the previous, insecure state; review before use)
--   CREATE POLICY service_match_scores ON public.job_match_scores FOR ALL TO public USING (true) WITH CHECK (true);
--   CREATE POLICY service_ai_logs ON public.ai_matching_logs FOR ALL TO public USING (true) WITH CHECK (true);
--   CREATE POLICY service_dlq ON public.dead_letter_queue FOR ALL TO public USING (true) WITH CHECK (true);
--   CREATE POLICY service_skill_synonyms ON public.skill_synonyms FOR ALL TO public USING (true) WITH CHECK (true);
--   CREATE POLICY service_embeddings ON public.skill_embeddings_cache FOR ALL TO public USING (true) WITH CHECK (true);
--   GRANT ALL ON public.job_match_scores, public.ai_matching_logs, public.dead_letter_queue,
--     public.skill_synonyms, public.skill_embeddings_cache TO anon, authenticated;
--   ALTER VIEW public.employer_feedback_summary SET (security_invoker = off);
--   GRANT EXECUTE ON FUNCTION public.handle_new_user(), public.rls_auto_enable() TO anon, authenticated;

BEGIN;

-- 1. AI matching tables: server-only
DROP POLICY IF EXISTS service_match_scores   ON public.job_match_scores;
DROP POLICY IF EXISTS service_ai_logs        ON public.ai_matching_logs;
DROP POLICY IF EXISTS service_dlq            ON public.dead_letter_queue;
DROP POLICY IF EXISTS service_skill_synonyms ON public.skill_synonyms;
DROP POLICY IF EXISTS service_embeddings     ON public.skill_embeddings_cache;

REVOKE ALL ON TABLE
  public.job_match_scores,
  public.ai_matching_logs,
  public.dead_letter_queue,
  public.skill_synonyms,
  public.skill_embeddings_cache
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.job_match_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_matching_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_synonyms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_embeddings_cache ENABLE ROW LEVEL SECURITY;

-- 2. The feedback summary view runs with the caller's permissions, not the owner's
ALTER VIEW public.employer_feedback_summary SET (security_invoker = on);
REVOKE ALL ON public.employer_feedback_summary FROM PUBLIC, anon, authenticated;

-- 3. SECURITY DEFINER functions are not callable through the public API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 4. Pin search_path on the matching RPCs (advisor: function_search_path_mutable)
ALTER FUNCTION public.upsert_job_match_scores(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.compute_job_percentiles(uuid)        SET search_path = public;

COMMIT;
