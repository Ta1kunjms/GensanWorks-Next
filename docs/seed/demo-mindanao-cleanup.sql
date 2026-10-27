-- Removes everything created by docs/seed/demo-mindanao-seed.sql.
-- Only rows whose email ends in @demo.gensanworks.test are touched. Jobs and the
-- jobseeker detail tables are removed by their ON DELETE CASCADE foreign keys.
-- Run the preview first; run the DELETE block only when the counts look right.

-- Preview (read-only)
SELECT
  (SELECT count(*) FROM public.employers  WHERE email LIKE '%@demo.gensanworks.test') AS employers,
  (SELECT count(*) FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test') AS jobseekers;

-- Delete
-- BEGIN;
-- DELETE FROM public.applications  WHERE jobseeker_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test')
--                                     OR employer_id  IN (SELECT id FROM public.employers  WHERE email LIKE '%@demo.gensanworks.test');
-- DELETE FROM public.referrals     WHERE jobseeker_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test')
--                                     OR employer_id  IN (SELECT id FROM public.employers  WHERE email LIKE '%@demo.gensanworks.test');
-- DELETE FROM public.job_match_scores WHERE jobseeker_id IN (SELECT id FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test');
-- DELETE FROM public.jobseekers WHERE email LIKE '%@demo.gensanworks.test';
-- DELETE FROM public.employers  WHERE email LIKE '%@demo.gensanworks.test';
-- COMMIT;
