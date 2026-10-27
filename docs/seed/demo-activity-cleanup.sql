-- Removes only the demo activity created by docs/seed/demo-activity-seed.sql
-- (applications, referrals and referral slips of demo jobseekers). Demo
-- employers, jobs and jobseekers stay. Run the preview first.

-- Preview (read-only):
-- SELECT
--   (SELECT count(*) FROM public.applications a JOIN public.jobseekers s ON s.id = a.jobseeker_id
--      WHERE s.email LIKE '%@demo.gensanworks.test') AS applications,
--   (SELECT count(*) FROM public.referrals r JOIN public.jobseekers s ON s.id = r.jobseeker_id
--      WHERE s.email LIKE '%@demo.gensanworks.test') AS referrals,
--   (SELECT count(*) FROM public.referral_slips WHERE slip_number LIKE 'RS-%-DEMO%') AS slips;

BEGIN;

DELETE FROM public.referral_slips
WHERE slip_number LIKE 'RS-%-DEMO%'
  AND applicant_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test');

DELETE FROM public.referrals
WHERE jobseeker_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test');

DELETE FROM public.applications
WHERE jobseeker_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test');

COMMIT;
