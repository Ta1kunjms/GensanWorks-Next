-- GensanWorks demo activity seed: applications, referrals and referral slips
-- Date: 2026-10-27 · Owner task #7: funnel and success-rate charts show 0 / "—"
-- until there is application and referral activity.
--
-- SYNTHETIC DATA (pilot constraint #2). Uses only the demo jobseekers and demo
-- employers created by docs/seed/demo-mindanao-seed.sql (emails
-- @demo.gensanworks.test). No real person is touched and no login is created.
-- Demo slip numbers look like RS-2026-DEMO1A2B3C.
--
-- Run order (Supabase SQL editor, production only with owner approval):
--   1. Preview: the SELECT at the end of this header (read-only).
--   2. Run everything from BEGIN; to COMMIT; as one script.
--   3. Verify with the queries after COMMIT.
-- Remove only this activity: docs/seed/demo-activity-cleanup.sql
-- Remove all demo data:      docs/seed/demo-mindanao-cleanup.sql
--
-- Preview (read-only):
-- SELECT
--   (SELECT count(*) FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test') AS demo_jobseekers,
--   (SELECT count(*) FROM public.jobs j JOIN public.employers e ON e.id = j.employer_id
--      WHERE e.email LIKE '%@demo.gensanworks.test' AND j.job_status = 'active')       AS demo_active_jobs,
--   (SELECT count(*) FROM public.applications a JOIN public.jobseekers s ON s.id = a.jobseeker_id
--      WHERE s.email LIKE '%@demo.gensanworks.test')                                   AS existing_demo_applications;

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test') THEN
    RAISE EXCEPTION 'Demo jobseekers not found; run docs/seed/demo-mindanao-seed.sql first';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobseekers s ON s.id = a.jobseeker_id
    WHERE s.email LIKE '%@demo.gensanworks.test'
  ) THEN
    RAISE EXCEPTION 'Demo activity already present; run docs/seed/demo-activity-cleanup.sql first';
  END IF;
END $guard$;

SELECT setseed(0.20261027);

-- Demo jobseekers who are looking for work, and active demo jobs.
CREATE TEMP TABLE _seekers ON COMMIT DROP AS
SELECT id FROM public.jobseekers
WHERE email LIKE '%@demo.gensanworks.test'
  AND coalesce(job_seeking_status, 'not_looking') <> 'not_looking';

CREATE TEMP TABLE _jobs ON COMMIT DROP AS
SELECT j.id, j.employer_id, row_number() OVER (ORDER BY j.id) AS n
FROM public.jobs j JOIN public.employers e ON e.id = j.employer_id
WHERE e.email LIKE '%@demo.gensanworks.test' AND j.job_status = 'active';

-- 1-3 distinct jobs per seeker (random), submitted in the last 90 days.
CREATE TEMP TABLE _apps ON COMMIT DROP AS
WITH picks AS (
  SELECT s.id AS jobseeker_id, g.k,
         1 + floor(random() * (SELECT count(*) FROM _jobs))::int AS job_n
  FROM _seekers s
  CROSS JOIN LATERAL generate_series(1, 1 + floor(random() * 3)::int) AS g(k)
), uniq AS (
  SELECT DISTINCT ON (p.jobseeker_id, j.id) p.jobseeker_id, j.id AS job_id, j.employer_id
  FROM picks p JOIN _jobs j ON j.n = p.job_n
)
SELECT gen_random_uuid() AS id, u.jobseeker_id, u.job_id, u.employer_id,
       now() - (floor(random() * 90) || ' days')::interval - (floor(random() * 600) || ' minutes')::interval AS submitted_at,
       random() AS r
FROM uniq u;

-- Status mix: pending 35%, reviewed 15%, shortlisted 15%, interview 15%,
-- hired 8%, rejected 10%, withdrawn 2%.
INSERT INTO public.applications (id, job_id, jobseeker_id, employer_id, status, source, submitted_at, reviewed_at, interview_date, created_at, updated_at)
SELECT a.id, a.job_id, a.jobseeker_id, a.employer_id, st.status, 'direct', a.submitted_at,
       CASE WHEN st.status <> 'pending' THEN a.submitted_at + interval '2 days' END,
       CASE WHEN st.status IN ('interview', 'hired') THEN a.submitted_at + interval '7 days' END,
       a.submitted_at,
       CASE WHEN st.status = 'pending' THEN a.submitted_at ELSE least(now(), a.submitted_at + interval '10 days') END
FROM _apps a
CROSS JOIN LATERAL (SELECT CASE
  WHEN a.r < 0.35 THEN 'pending'
  WHEN a.r < 0.50 THEN 'reviewed'
  WHEN a.r < 0.65 THEN 'shortlisted'
  WHEN a.r < 0.80 THEN 'interview'
  WHEN a.r < 0.88 THEN 'hired'
  WHEN a.r < 0.98 THEN 'rejected'
  ELSE 'withdrawn' END AS status) st;

-- PESO referrals for applications past review (stored lowercase; hire date = updated_at).
CREATE TEMP TABLE _refs ON COMMIT DROP AS
SELECT gen_random_uuid() AS id, ap.id AS application_id, ap.job_id, ap.jobseeker_id, ap.employer_id,
       CASE ap.status WHEN 'shortlisted' THEN 'referred' ELSE ap.status END AS status,
       ap.submitted_at + interval '3 days' AS date_referred,
       ap.updated_at
FROM public.applications ap
JOIN _apps a ON a.id = ap.id
WHERE ap.status IN ('shortlisted', 'interview', 'hired', 'rejected');

INSERT INTO public.referrals (id, job_id, jobseeker_id, employer_id, application_id, status, date_referred, created_at, updated_at)
SELECT id, job_id, jobseeker_id, employer_id, application_id, status, date_referred, date_referred,
       greatest(date_referred, updated_at)
FROM _refs;

-- One slip per referral, issued by the earliest admin (display only; no FK).
INSERT INTO public.referral_slips (slip_number, job_id, applicant_id, issued_by, issued_at, valid_until, status, created_at, updated_at)
SELECT 'RS-' || extract(year FROM r.date_referred)::int || '-DEMO' || upper(substr(md5(r.id::text), 1, 6)),
       r.job_id, r.jobseeker_id,
       (SELECT id FROM public.admins ORDER BY created_at NULLS LAST LIMIT 1),
       r.date_referred, r.date_referred + interval '30 days', 'issued', r.date_referred, r.date_referred
FROM _refs r;

COMMIT;

-- Verify:
-- SELECT a.status, count(*) FROM public.applications a JOIN public.jobseekers s ON s.id = a.jobseeker_id
--   WHERE s.email LIKE '%@demo.gensanworks.test' GROUP BY 1 ORDER BY 1;
-- SELECT r.status, count(*) FROM public.referrals r JOIN public.jobseekers s ON s.id = r.jobseeker_id
--   WHERE s.email LIKE '%@demo.gensanworks.test' GROUP BY 1 ORDER BY 1;
-- SELECT count(*) FROM public.referral_slips WHERE slip_number LIKE 'RS-%-DEMO%';
