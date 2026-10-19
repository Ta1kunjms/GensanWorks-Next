---
status: DRAFT FOR REVIEW — NOT APPLIED
scope: synthetic-data-only; local use only; not valid for the current linked remote project
companion file: docs/schema/proposed-canonical-baseline.sql
---

# Baseline Decision Record

This record documents the evidence behind `docs/schema/proposed-canonical-baseline.sql` (Task 10). It is a decision record, not a migration, and nothing in this repository has been executed, applied, staged, or deployed as part of producing it.

## 1. Step 1 verification findings (read first — these changed prior decisions)

### 1a. `employer_feedback_summary` — Task 8 was correct, Task 9.1 was wrong

- **Evidence:** `supabase/migrations/20260604020000_employer_feedback.sql:22-32` — `CREATE VIEW employer_feedback_summary AS SELECT job_id, outcome, COUNT(*)...`.
- Task 9.1 reported "zero `CREATE VIEW` statements anywhere in the local repository." That was incorrect — a repo-wide grep in this task found the view immediately. Task 8's prior citation of the same path/line range (recorded in `Files/Task 8 — Read-Only Canonical Baseli.txt:257`) was accurate.
- **Correction applied:** the view is included in `proposed-canonical-baseline.sql` SECTION 9, directly after its source table `employer_hiring_outcomes`.

### 1b. Code-reference check for six named tables

| Table | Code-referenced? | Evidence |
|---|---|---|
| `ranking_cache` | **Yes** | `app/lib/matching/ranking-cache-engine.ts:14,30,41` |
| `jobseeker_features` | **Yes** | `app/lib/matching/feature-store.ts:24,48` |
| `message_threads` | **No** | Zero matches for `message_threads` or `thread_id` consumption anywhere in `app/` (only `docs/migrations/phase1_migration.sql:66-78,82` defines it) |
| `srs_approval_history` | **Yes** | `app/api/admin/employers/[id]/srs/route.ts:43-47,120-128` |
| `dead_letter_queue` | **No** | Zero matches anywhere in `app/` |
| `landing_testimonials` / `landing_faqs` / `landing_partners` / `landing_news` / `landing_metrics` | **Yes, all five** | `app/api/landing/testimonials/route.ts:62`, `app/api/landing/faqs/route.ts:20`, `app/api/landing/partners/route.ts:20`, `app/api/landing/news/route.ts:20`, `app/api/public/impact/route.ts:58` |

**Consequence:** `ranking_cache`, `jobseeker_features`, `srs_approval_history`, and all five `landing_*` tables are included in the baseline (SECTIONs 9 and 12). `message_threads` and `dead_letter_queue` are excluded/deferred respectively (neither has a code consumer).

### 1c. Password reset vs. Supabase Auth vs. login — two disconnected credential paths

- `app/lib/auth-utils.ts:57-73` (`getPasswordHash`/`updatePasswordHash`) reads/writes `password_hash` on whichever of `admins`/`employers`/`jobseekers` matches the role. Pure Postgres column access — no call to any Supabase Auth admin API.
- `app/api/auth/reset-password/confirm/route.ts:82-85` likewise only does `db.from(table).update({ password_hash: newHash, ... })`. No `auth.admin.updateUserById` or equivalent anywhere in that file.
- **Login path** (`app/login/page.tsx:72`, `app/login/admin/page.tsx:95`) calls `supabase.auth.signInWithPassword(...)` exclusively. It never reads `password_hash`.
- **Finding, stated precisely:** self-service password reset (the `reset-password/confirm` route) updates **only** `public.*.password_hash`; it never touches Supabase Auth. Login checks **only** Supabase Auth; it never touches `password_hash`. The two are completely disconnected — resetting a password through the self-service flow has **no effect** on what login actually checks.
- **A second, different reset path exists and does work correctly:** `app/api/admin/applicants/[id]/reset-password/route.ts:77` calls `supabaseAdmin.auth.admin.updateUserById(userId, { password })` — this is an admin-initiated reset that correctly updates Supabase Auth. It is a separate code path from the self-service one above and does not touch `password_hash` at all.
- **Additional defect found in the same file, same class as the handoff's known-defects list:** `app/api/auth/reset-password/confirm/route.ts:75-80` maps the `jobseeker` role to table name `"users"` (not `"jobseekers"`), via `tableMap = { admin: "admins", employer: "employers", jobseeker: "users" }`. This means self-service password reset for jobseekers currently targets a table that (per binding decision #3) should not exist, on top of being disconnected from Supabase Auth regardless. Recorded here, **not fixed** — fixing it is deletion/auth-flow implementation work, out of scope for Task 10.
- **Baseline consequence:** `password_hash` is included on all three role tables (reversing an earlier Task 9 working note that called it vestigial), with a `DUAL-CREDENTIAL-STORE DEBT` comment on each table in the SQL document pointing at this exact evidence.

### 1d. `scripts/rebuild-schema.sql` — full column inventory, corruption confirmed

Read in full. **Lines 212-218 are confirmed byte-corrupted** — every character of the `jobseeker_saved_jobs` CREATE TABLE attempt is space-separated (`C R E A T E   T A B L E   j o b s e e k e r _ s a v e d _ j o b s   ( ...`), making the statement non-executable as written. This file cannot be used as evidence for `jobseeker_saved_jobs`; binding decision #8 is used verbatim instead.

Exact shape recorded for the other tables in this file (all `jobseeker_*` child-table FKs are nullable here — no `NOT NULL` on any `jobseeker_id`/`employer_id`/`job_id` FK column anywhere in this file; the baseline adds `NOT NULL` to every one of these as a working design decision, flagged `-- VERIFY:` at each occurrence):

- **`jobseekers`** (lines 13-75): `id UUID PK`, `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `first_name`/`last_name TEXT NOT NULL`, ~40 nullable demographic/NSRP columns, `settings JSONB DEFAULT '{}'`, `other_skills JSONB`, `profile_complete BOOLEAN DEFAULT false`, `profile_completeness INTEGER DEFAULT 0`, `is_active BOOLEAN DEFAULT true`, `created_at`/`updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())`.
- **`jobseeker_languages`/`jobseeker_education`/`jobseeker_trainings`/`jobseeker_licenses`/`jobseeker_experience`** (lines 77-130): each `id UUID PK DEFAULT gen_random_uuid()`, `jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE` (**nullable**), table-specific text/boolean/integer/date columns, `created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())`. None of the five has an `updated_at` column.
- **`employers`** (lines 132-165): `id UUID PK`, `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `establishment_name TEXT NOT NULL`, location/contact/file-upload columns (all nullable), `account_status TEXT DEFAULT 'pending'`, `is_active BOOLEAN DEFAULT true`, `created_at`/`updated_at` same pattern as `jobseekers`.
  - **Contradiction found:** this table has `industry`, `industry_code`, `total_paid_employees` — it does **not** have `business_type` or `employee_count`. Current live code (`app/api/admin/employers/[id]/srs/route.ts:57-58`) reads `employer.business_type` and `employer.employee_count`. A repo-wide grep for both names across every `.sql` file in the repository returned zero matches. Neither column is created anywhere locally. Flagged `-- VERIFY:` in the baseline; both are included as nullable so the route does not break, but the duplication with `industry`/`total_paid_employees` needs a human decision.
- **`jobs`** (lines 167-185): `id UUID PK`, `employer_id UUID REFERENCES employers(id) ON DELETE CASCADE` (**nullable**), `position_title TEXT NOT NULL`, `age_preference_min`/`age_preference_max INTEGER` (**present here**, but see contradiction below), `vacancies INTEGER DEFAULT 1`, `is_active BOOLEAN DEFAULT true`, `archived BOOLEAN DEFAULT false`, `created_at`/`updated_at` same pattern.
  - **Contradiction found:** `scripts/migrations/20260428_remove_age_preference.sql:2-4` explicitly `DROP COLUMN age_preference_min, age_preference_max` "to prevent age discrimination" — i.e. this file is chronologically stale/superseded with respect to that later, deliberate removal. The baseline omits both columns and documents the removal inline.
  - **Second contradiction found:** `app/api/admin/employers/[id]/srs/route.ts:114` reads/writes `jobs.is_published` (boolean) to pause job postings on SRS rejection. No `.sql` file anywhere in the repository creates an `is_published` column (confirmed by repo-wide grep, zero matches) — the only locally-evidenced visibility flags are `is_active`/`archived` from this same file. Flagged `-- VERIFY:` in the baseline; both `is_published` and `is_active`/`archived` are kept side by side pending human reconciliation.
- **`applications`** (lines 187-199): `id UUID PK`, `job_id`/`jobseeker_id`/`employer_id` FKs (**all nullable**), `status TEXT DEFAULT 'pending'`, `match_score NUMERIC`, `submitted_at`/`reviewed_at`/`interview_date TIMESTAMP WITH TIME ZONE`, `created_at`/`updated_at` same pattern.
  - **Contradiction found:** `scripts/migrations/20260424_enable_rls.sql:16,22,28` writes RLS policies against a column named `applicant_id` on this table (`auth.uid() = applicant_id`), but this file — the only local `CREATE TABLE applications` — names the column `jobseeker_id`, never `applicant_id`. One of the two is wrong, or the RLS file predates a rename that was never reflected back into a committed `CREATE TABLE`. The baseline uses `jobseeker_id` (matching the actual table definition) and records the RLS file as unreliable evidence for this reason, independent of its already-known type-mismatch defect (§6 below).
- **`referrals`** (lines 201-211): `id UUID PK`, `job_id`/`jobseeker_id`/`employer_id` FKs (**all nullable**), `application_id UUID REFERENCES applications(id) ON DELETE SET NULL`, `status TEXT DEFAULT 'referred'`, `date_referred TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())`, `created_at`/`updated_at` same pattern.
- **Lines 212-218 (`jobseeker_saved_jobs`):** confirmed corrupted, as stated above. Not used as evidence anywhere.

## 2. Every table in the baseline, with source evidence

| Table/view | Disposition | Primary evidence |
|---|---|---|
| `jobseekers` | Included | `scripts/rebuild-schema.sql:13-75`, `scripts/migrations/20260424_nsrp_full_parity.sql`, `scripts/migrations/20260426_add_missing_nsrp_fields.sql`, `scripts/migrations/20260426_add_profile_image_column.sql:5`, `supabase/migrations/20260828190000_add_matching_completeness_pct.sql`, `docs/migrations/phase1_migration.sql:7-9`, `docs/migrations/utility_agent_setup.sql:7-11`, `docs/migrations/phase5b_pgvector.sql:11-13`, `supabase/migrations/20260829120000_add_signup_consent_fields.sql:9-10` |
| `employers` | Included | `scripts/rebuild-schema.sql:132-165`, `scripts/migrations/20260426_add_profile_image_column.sql:6`, `docs/migrations/phase1_migration.sql:27-33`, `supabase/migrations/20260829120000_add_signup_consent_fields.sql:13-14` |
| `admins` | Included | `docs/migrations/mock_data_gensan.sql:25-31` (structure only; auth.users FK and password_hash NOT NULL are new baseline requirements, not replayed from this file) |
| `jobseeker_languages`/`_education`/`_trainings`/`_licenses`/`_experience` | Included | `scripts/rebuild-schema.sql:77-130`, `scripts/migrations/20260424_nsrp_full_parity.sql:40-46` |
| `jobs` | Included | `scripts/rebuild-schema.sql:167-185`, `docs/migrations/phase1_migration.sql:36-44`, `scripts/migrations/20260428_add_published_at_to_jobs.sql`, `20260428_add_salary_period_to_jobs.sql`, `20260428_remove_age_preference.sql`, `docs/migrations/utility_agent_setup.sql:14-16`, `docs/migrations/phase5b_pgvector.sql:14-17` |
| `applications` | Included | `scripts/rebuild-schema.sql:187-199`, `docs/migrations/phase1_migration.sql:12-20` |
| `referrals` | Included | `scripts/rebuild-schema.sql:201-211` |
| `referral_slips` | Included | `docs/migrations/phase1_migration.sql:47-63`, binding decisions #6/#7/#11 |
| `messages` | Included | git commit `7a56968`: `app/db/migrations/0000_keen_nocturne.sql:154-162`, `0002_messages_actor_scope.sql`; `docs/migrations/phase1_migration.sql:81-86` |
| `notifications` | Included | git commit `7a56968`: `app/db/migrations/0000_keen_nocturne.sql:165-177`, `0001_notifications_user_id_actor_scope.sql` |
| `account_deletion_requests` | Included (no CREATE TABLE evidence exists; built from live-code usage) | `app/api/auth/account-deletion/*`, `app/api/admin/account-deletion/process/route.ts` |
| `admin_access_requests` | Included | binding decision #10; `app/api/auth/signup/admin-request/route.ts`, `app/api/admin/access-requests/route.ts` |
| `audit_logs` | Included | `scripts/migrations/20260424_add_audit_logs.sql:4-15` |
| `jobseeker_saved_jobs` | Included (binding decision #8 verbatim; `scripts/rebuild-schema.sql:212-218` is corrupted and unusable) | binding decision #8; `app/api/jobseeker/saved-jobs/route.ts:19,70,92` |
| `job_match_scores` | Included | `docs/migrations/phase1_migration.sql:92-107`, `utility_agent_setup.sql:20-28`, `add_corrections_to_match_scores.sql:8`, `supabase/migrations/20260430150000_add_percentile_rank_column.sql:9`, `scripts/migrations/20260428_add_score_version.sql`, `20260429_hybrid_hardened.sql` |
| `ai_matching_logs` | Included | `docs/migrations/utility_agent_setup.sql:40-49`, `scripts/migrations/20260428_update_ai_matching_logs.sql` |
| `skill_correction_cache` / `role_equivalence_cache` | Included | `docs/migrations/ai_correction_cache.sql:8-35` |
| `match_disparity_flags` | Included | `docs/migrations/match_disparity_monitoring.sql:2-18`, `scripts/migrations/20260428_add_disparity_reviewer.sql` |
| `match_feedback_logs` | Included | `supabase/migrations/20260430160000_fix_feedback_logs.sql:8-19` |
| `skill_synonyms` / `skill_embeddings_cache` | Included | `supabase/migrations/20260527010000_skill_synonym_and_embedding_cache.sql` |
| `jobseeker_interactions` | Included | `supabase/migrations/20260604010000_behavioral_signals.sql:2-13` |
| `employer_hiring_outcomes` + `employer_feedback_summary` view | Included | `supabase/migrations/20260604020000_employer_feedback.sql:2-32` (see §1a correction) |
| `ranking_cache` | Included, fully inferred (no CREATE TABLE anywhere) | `app/lib/matching/ranking-cache-engine.ts:13-34` (see §1b) |
| `jobseeker_features` | Included, fully inferred (no CREATE TABLE anywhere) | `app/lib/matching/feature-store.ts:9-48` (see §1b) |
| `srs_approval_history` | Included | `docs/migrations/phase1_migration.sql:133-142`, `app/api/admin/employers/[id]/srs/route.ts:43-47,120-128` (see §1b) |
| `landing_testimonials`/`_faqs`/`_partners`/`_news`/`_metrics` | Included, columns not fully re-transcribed (flagged `-- VERIFY:`) | `scripts/migrations/20260424_landing_page_tables.sql`; code references per §1b |
| `message_threads` | Excluded | Zero code references (§1b); only defined in `docs/migrations/phase1_migration.sql:66-78` |
| `dead_letter_queue` | Deferred | Zero code references (§1b); defined in `scripts/migrations/20260428_add_dead_letter_queue.sql` |
| `public.users` | Excluded | Binding decision #3 |
| `match_jobseekers_to_job()` function | Deferred | `docs/migrations/phase5b_pgvector.sql:28+`, per this task's explicit ruling |
| `upsert_job_match_scores()` and related functions | Deferred, not re-transcribed | `supabase/migrations/20260430120000_upsert_job_match_scores.sql` and siblings |

## 3. Every `-- VERIFY:` item (34 total in `proposed-canonical-baseline.sql`)

Grouped by table/section (exact text is in the SQL file; this is the index):

1. `pgcrypto` extension — no local file explicitly issues `CREATE EXTENSION pgcrypto`; target Postgres version not confirmed.
2. `jobseekers.password_hash` — dual-credential-store debt comment (see §1c).
3-5. `jobseekers` several FK/NOT NULL working corrections are implicit in SECTION 3 comments, not separately numbered per column.
6. `jobseekers.profile_embedding` — vector dimension (1536) is a working assumption, not confirmed.
7. `employers.business_type`/`employee_count` — no SQL evidence anywhere (contradiction, §1d).
8. `employers.job_embedding` placement — moved to `jobs` table; original file's table-vs-table intent not fully re-confirmed.
9. `admins.password_hash` — nullable in original evidence vs. NOT NULL in baseline; no insert code path confirmed at all.
10. `admins.updated_at` — no historical CREATE TABLE evidence for this column on `admins` specifically.
11. Jobseeker child-table `jobseeker_id` FKs (×5: languages, education, trainings, licenses, experience) — NOT NULL added as a correction to nullable historical evidence.
12. `jobs.employer_id` — NOT NULL added as a correction.
13. `jobs.is_published` vs. `is_active`/`archived` — contradiction, no SQL evidence for `is_published` (§1d).
14. `applications` FK NOT NULL corrections (×3: job_id, jobseeker_id, employer_id).
15. `applications` `applicant_id` vs. `jobseeker_id` naming contradiction against the historical RLS file (§1d).
16. `applications.status` default value changed from `'pending'` to `'under_review'` to match the normalization migration's intent rather than the original CREATE TABLE text.
17. `referrals` FK NOT NULL corrections (×3: job_id, jobseeker_id, employer_id).
18. `referral_slips.applicant_id` — no FK constraint ever existed; left unconstrained, flagged for a future decision.
19. `referral_slips.issued_by` — same as above.
20. `messages.application_id` — no current read/write code path found; kept as a harmless nullable FK.
21. `account_deletion_requests` — entire table has no CREATE TABLE evidence; shape inferred from live code only.
22. `admin_access_requests.reviewed_by` — population code path not re-confirmed in this pass.
23. `job_match_scores.jobseeker_id` — historically has no FK at all; kept exactly as evidenced.
24. `match_disparity_flags.disparity_reviewed_by` — bare UUID, no FK to `admins`, kept as evidenced.
25. `match_feedback_logs.job_id`/`jobseeker_id` — bare UUID, no FK, kept as evidenced.
26. pgvector similarity indexes — not re-transcribed; exact index type/operator class unconfirmed.
27. `jobseeker_features.id` FK to `jobseekers(id)` — working assumption from usage pattern, not confirmed by any schema file.
28. `jobseeker_features.skill_vector`/`exp_vector` — stored as JSONB rather than a native array/vector type; no confirmed dimension or intended storage type.
29. `ranking_cache` — entire table has no CREATE TABLE evidence; primary key column not referenced by any code at all, added as structural necessity.
30-34. `landing_testimonials`, `landing_faqs`, `landing_partners`, `landing_news`, `landing_metrics` — each table's full column list not re-transcribed from `scripts/migrations/20260424_landing_page_tables.sql` in this pass; placeholders only.

## 4. Contradictions found in Step 1 (summary; full detail in §1 above)

- `employer_feedback_summary`: Task 9.1's "no view exists" claim was false; corrected in this task.
- `employers.business_type`/`employee_count`: read by live code, created by no SQL file anywhere.
- `jobs.is_published`: read/written by live code, created by no SQL file anywhere; coexists with the differently-named `is_active`/`archived` flags from `rebuild-schema.sql`.
- `jobs.age_preference_min`/`age_preference_max`: present in `rebuild-schema.sql`, explicitly dropped by a later migration for anti-discrimination reasons — `rebuild-schema.sql` is stale on this point.
- `applications.applicant_id` vs. `jobseeker_id`: the historical RLS file assumes a column name the historical table definition does not have.
- `scripts/rebuild-schema.sql:212-218`: confirmed byte-corrupted, unusable as evidence for `jobseeker_saved_jobs`.
- `app/api/auth/reset-password/confirm/route.ts:78`: maps `jobseeker` → table `"users"` instead of `"jobseekers"` — same class of defect as the handoff's previously-known deletion-flow bugs, newly found in the password-reset flow.
- Self-service password reset vs. login: fully disconnected credential stores (§1c) — not previously stated this precisely in Task 9/9.1.

## 5. Deferred items

- `match_jobseekers_to_job()` function (pgvector-dependent query helper).
- `upsert_job_match_scores()` and its sibling maintenance functions (`cleanup_stale_dimensions`, `compute_job_percentiles`) — query/maintenance logic layered on `job_match_scores`, not re-transcribed.
- `dead_letter_queue` table — zero code references found; revisit if/when matching-engine resilience work resumes.
- `handle_new_user()` trigger rewrite — left as a specification-only comment in SECTION 11 of the SQL file because its correct behavior under the new `auth.users` FK + `ON DELETE RESTRICT` design is not yet evidenced; must not be fabricated.
- Full column lists for the five `landing_*` tables — placeholders only; a human should copy the exact columns from `scripts/migrations/20260424_landing_page_tables.sql` before this document is promoted to an executable migration.

## 6. Migration-adoption steps still pending

1. Human review of this decision record and the companion SQL document, resolving every numbered `-- VERIFY:` item in §3 (either with new evidence or an explicit decision).
2. Resolution of the `handle_new_user()` rewrite (SECTION 11) before any execution is attempted — signup will be silently broken against the new `auth.users` FK/RESTRICT design otherwise.
3. **Archiving** (not deleting) the existing `supabase/migrations/20260430120000...20260829120000` sequence into a clearly labeled historical-reference location, as its own separate, explicitly approved step — this task does not perform that move. Per Task 9.1's migration-adoption strategy, these files are **absorbed** into the new baseline's flattened DDL, not replayed; once the baseline is approved and promoted to an executable migration, the original per-file timestamps are retired from the *active* chain but kept on disk as reference.
4. Writing a `supabase/seed.sql` (currently does not exist; `supabase/config.toml:65` already expects it at that path) with synthetic-only data, as a separate task from this one.
5. Promoting the reviewed `proposed-canonical-baseline.sql` into an actual timestamped file under `supabase/migrations/`, only after steps 1-2 above are closed.
6. The RLS task (binding decision #13), including resolution of the deny-by-default posture question raised in the RLS note of the SQL document.

## 7. Local test prerequisites (not evaluated or installed by this task)

- **Docker availability** — the Supabase CLI's local stack (`supabase start`) requires a running Docker daemon. Not checked or started in this task.
- **Supabase CLI local stack** — `supabase/config.toml` already exists and configures `[db.seed] sql_paths = ["./seed.sql"]`; no `supabase start`/`db reset` was run.
- **Seed file to be written separately** — `supabase/seed.sql` does not exist yet (confirmed absent in a prior task's glob and unchanged since); must be authored fresh, synthetic-only, as its own task — not derived from `seed_generated.sql` or `docs/migrations/mock_data_gensan.sql`, both of which predate every binding decision and (per the prior session's audit) the former has historically carried live credentials.

---

# Task 11 — VERIFY Triage

Everything below was added by Task 11 (VERIFY triage and resolution). Sections 1-7 above are preserved exactly as Task 10 produced them, as the historical record of that pass; where Task 11 found Task 10 to be wrong, the correction is stated here rather than silently edited into the old section.

## 8. Count correction

Task 10 reported "34 total" `-- VERIFY:` occurrences. One of those 34 was the file's own header line explaining the convention (`...is marked with a comment beginning `-- VERIFY:`...`), not an actual flagged item. **The real count was 33 items.** The table below covers all 33.

## 9. All 33 original `-- VERIFY:` items — object, draft value, evidence gap, class, resolution

| # | Object.column | Draft value (Task 10) | Evidence gap | Class | Resolution |
|---|---|---|---|---|---|
| 1 | extension `pgcrypto` | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` | No local file issues this explicitly; target Postgres version/extension availability unknown | **B** | Collect from Dashboard: Database > Extensions (is `pgcrypto` enabled) and Database > Settings (Postgres version). Marker kept. |
| 2 | `jobseekers.profile_embedding` type | `vector(1536)` | Dimension was guessed by false analogy to an unrelated OpenAI-backed cache table | **A** | **Resolved.** `docs/migrations/phase5b_pgvector.sql:10-12` states "768 dimensions for Gemini text-embedding-004" explicitly. Changed to `vector(768)`. |
| 3 | `employers.business_type`/`employee_count` | Nullable `TEXT`/`INTEGER`, both included | No SQL file anywhere creates them; one live route reads them | **A** | **Resolved.** Removed from the baseline. `industry`/`total_paid_employees` are used consistently at 10+ call sites vs. this one outlier route — "consistently used name wins." Outlier route flagged as an application-layer bug for a future task. |
| 4 | `employers.job_embedding` | `vector(1536)`, present on `employers` | Column was a duplicate of the one on `jobs`; the draft's own comment claimed it had been removed but it had not | **A** | **Resolved.** Deleted the duplicate from `employers`. Confirmed `jobs` is the only correct placement (`docs/migrations/phase5b_pgvector.sql:14-15`). |
| 5 | (same item as #4 — the draft's "moved to jobs" note) | — | The note described a fix that was never actually applied | **A** | **Resolved** together with #4. |
| 6 | `admins.password_hash` nullability | `NOT NULL DEFAULT 'auth_managed'` | Historical evidence (`mock_data_gensan.sql:29`) shows nullable; no insert code path exists to confirm either way | **C** | Options: (a) NOT NULL for consistency [recommended — admin provisioning is manual anyway, so the provisioner sets it explicitly]; (b) nullable, matching the one historical fragment. Marker kept, options recorded. |
| 7 | `admins.updated_at` | Included, no cited evidence | No CREATE TABLE for `admins` includes it | **A** | **Resolved.** `app/lib/auth-utils.ts:66-73` (`updatePasswordHash`) writes `updated_at` generically for whichever role table, including `admins`. Confirmed live dependency. |
| 8 | 5× jobseeker child-table `jobseeker_id` FK NOT NULL | `NOT NULL` added | Historical SQL has all 5 as nullable; insert-path confirmation not located | **C** | Option (a) NOT NULL [recommended — a child row with no parent is meaningless]; (b) nullable, replaying history literally. Marker kept. |
| 9 | `jobs.employer_id` NOT NULL | `NOT NULL` added | Historical SQL nullable | **A** | **Resolved.** `app/api/employer/jobs/route.ts:124` confirms job creation always supplies `employer_id`. |
| 10 | `jobs.is_published` vs. `is_active`/`archived` | All three included | No SQL file creates `is_published`; thought to possibly be a naming-drift duplicate of `is_active`/`archived` | **A** | **Resolved.** Confirmed a real, distinct, consistently-used column at 3 independent call sites (`app/api/admin/employers/[id]/srs/route.ts:114`, `app/api/employer/jobs/[id]/status/route.ts:58-69`, `app/api/jobseeker/applications/route.ts:116,122`) — not a collision with `is_active`/`archived`. Still has no migration-file provenance; that fact is now recorded, not guessed around. |
| 11 | `applications` 3× FK NOT NULL | `NOT NULL` added | Historical SQL nullable | **A** | **Resolved.** Both live apply/insert endpoints always supply all three. |
| 12 | `applications.applicant_id` vs. `jobseeker_id` | Kept `jobseeker_id` (matching historical SQL), flagged the RLS file as unreliable | Historical SQL said `jobseeker_id`; one historical RLS file said `applicant_id` | **A** | **Resolved — REVERSED.** Live code overwhelmingly and consistently uses `applicant_id` (15+ call sites; see §12 below). Column renamed to `applicant_id`. The RLS file is vindicated, not unreliable; `scripts/rebuild-schema.sql` was the stale one. |
| 13 | `applications.status` default | `'under_review'` | `rebuild-schema.sql` said `'pending'`; a normalization migration implies `'under_review'` | **C** (downgraded from A) | Two LIVE routes disagree: `app/api/jobs/[id]/apply/route.ts:147` sets `'under_review'` with an explicit migration-normalization comment; `app/api/jobseeker/applications/route.ts:155` — a second, independent apply endpoint — sets `'pending'`. Recommend `'under_review'` (the explicitly-commented, migration-aligned value), but this is a genuine live disagreement, not a clean resolution. The deeper problem (two competing apply endpoints) is out of scope. |
| 14 | `referrals` 3× FK NOT NULL | `NOT NULL` added | Historical SQL nullable | **A** | **Resolved.** `app/api/referrals/route.ts:320-322,376,396` confirms all three always supplied; that file's own inline comment documents the column list. |
| 15 | `referral_slips.applicant_id` FK | No FK | Never historically FK-constrained | **C** | Recommend adding `REFERENCES jobseekers(id) ON DELETE CASCADE` (matches actual usage); leaving unconstrained is the alternative. Marker kept. |
| 16 | `referral_slips.issued_by` FK | No FK | Never historically FK-constrained | **C** | Recommend adding `REFERENCES admins(id)`; leaving unconstrained is the alternative. Marker kept. |
| 17 | `messages.application_id` | Nullable FK, unused | "Not found in this pass" (hedged) | **A** | **Resolved.** Re-confirmed by re-reading `app/api/messages/route.ts` in full: genuinely unused. Confirmed-absence, not a hedge. |
| 18 | `account_deletion_requests` (whole table) | Columns inferred, missing `email`/`delete_after` | No CREATE TABLE anywhere | **A** | **Resolved.** Full column list confirmed by reading both route files in full; `email` and `delete_after` added (Task 10 missed both). See §13 Auth-hardening debt for the `cancelled_at` situation specifically. |
| 19 | `admin_access_requests.reviewed_by` | Nullable FK, hedge: "not re-read in this pass" | Population code path not confirmed | **A** | **Resolved.** Re-read `app/api/admin/access-requests/[id]/status/route.ts` in full: confirmed `reviewed_by` is never set anywhere in it. |
| 20 | `job_match_scores.jobseeker_id` FK | No FK | Never historically FK-constrained | **C** | Recommend adding `REFERENCES jobseekers(id) ON DELETE CASCADE` for consistency with `job_id` on the same table; alternative is to leave unconstrained. |
| 21 | `match_disparity_flags.disparity_reviewed_by` FK | No FK | Never historically FK-constrained | **C** | Recommend adding `REFERENCES admins(id)`; alternative is to leave unconstrained. |
| 22 | `match_feedback_logs.job_id`/`jobseeker_id` FK | No FK | Never historically FK-constrained | **C** | Recommend adding both FKs for consistency with every other matching table; alternative is to leave unconstrained. |
| 23 | `ranking_cache` (whole table) | Generic VERIFY | No CREATE TABLE anywhere | **A** (special handling) | **Resolved per this task's instruction:** every column now marked `INFERRED FROM CODE` with exact `path:line`, not left as an open question. See §14 risk list. |
| 24 | `jobseeker_features` (whole table) | Generic VERIFY | No CREATE TABLE anywhere | **A** (special handling) | **Resolved** the same way as #23. See §14 risk list. |
| 25 | `jobseeker_features.id` FK | `REFERENCES jobseekers(id) ON DELETE CASCADE` | FK was a working assumption, not evidenced by code (code only matches ids, never establishes a constraint) | **C** (downgraded from the implicit A in the draft) | The FK was removed per this task's "do not invent" rule — code evidence does not actually establish a relationship, only a matching pattern. Recommend adding the FK back (feature rows are clearly meant to be 1:1 with jobseekers), but it is now an explicit open decision rather than a quietly-assumed fact. |
| 26 | `jobseeker_features.skill_vector`/`exp_vector` type | `JSONB` | TypeScript types them `number[]`; no confirmed Postgres storage type | **A** (special handling) | **Resolved per this task's instruction:** marked `INFERRED FROM CODE` with a one-line rationale (JSONB is a lossless, reasonable representation of a JS array) rather than left open. |
| 27 | pgvector similarity indexes | Not transcribed | Exact index definitions not re-read in Task 10 | **A** | **Resolved.** `docs/migrations/phase5b_pgvector.sql:18-24` fully transcribed: two HNSW, cosine-distance indexes, now that the dimension question (#2) is settled. |
| 28 | `srs_approval_history.admin_id` FK | No FK | Never historically FK-constrained | **C** | Recommend adding `REFERENCES admins(id)` for consistency with the other admin-id-shaped columns in this file; alternative is to leave unconstrained. |
| 29-33 | `landing_testimonials`/`_faqs`/`_partners`/`_news`/`_metrics` full column lists | Placeholder `id`+`created_at` only | "Not re-transcribed in this pass" | **A** | **Resolved.** `scripts/migrations/20260424_landing_page_tables.sql` read in full; all five tables now have their complete, real column lists (this file was a LOCAL file the whole time — not a dashboard-only resource; Task 10's hedge was unnecessary). |

**Note on Class D:** none of the 33 original items required adviser/PESO/MSU policy input. All 33 were resolvable either from code (A), from a dashboard check (B), or as a technical team design decision (C). D is not used anywhere in this triage.

## 10. The three named contradictions (Task 11, item 4) — code evidence and recommended resolution

### `employers.business_type` / `employee_count`

- **Code evidence for the outlier:** `app/api/admin/employers/[id]/srs/route.ts:29` (`SELECT ...business_type, employee_count...`), lines 57-58 (mapped to response fields `businessType`/`employeeCount`). This is the **only** file anywhere in `app/` that touches these two names.
- **Code evidence for the dominant names:** `industry`/`total_paid_employees` are read or written across 10+ files: `app/lib/matching/cold-start-engine.ts:16`, `app/lib/matching/agent.ts:931`, `app/lib/matching/services/EmbeddingService.ts:28`, `app/employer/settings/page.tsx:105`, `app/admin/employers/[id]/page.tsx:208,210`, `app/admin/employers/page.tsx:222`, `app/employer/profile/employer-wizard.tsx:107`, `app/employer/jobs/page.tsx:187`, `app/api/admin/employers/create/route.ts:47`, `app/api/admin/employers/route.ts:54`, `app/api/admin/export/reports/dole/route.ts:62`, `app/api/admin/export/reports/masterlist/route.ts:48`.
- **Recommendation:** `industry`/`total_paid_employees` win. Do not create `business_type`/`employee_count` in the baseline. Flag the one outlier route as an application-layer bug (likely intended to select `industry AS business_type`/`total_paid_employees AS employee_count`, or should be rewritten to use the canonical names directly) — fix in a future, non-schema task.

### `jobs.is_published`

- **Code evidence:** three independent, consistent call sites — `app/api/admin/employers/[id]/srs/route.ts:114` (pause postings on SRS rejection), `app/api/employer/jobs/[id]/status/route.ts:58-69` (employer-facing publish/archive toggle — written in the SAME update alongside `archived`), `app/api/jobseeker/applications/route.ts:116,122` (apply-eligibility gate, read alongside `job.status` and `job.archived`).
- **Finding:** this is **not** a naming collision with `is_active`/`archived`. All three flags are real and serve different, complementary purposes (`archived` = soft-deleted/withdrawn; `is_active`/`job_status` = open-for-applications state; `is_published` = employer-controlled visibility toggle, also used by admin SRS enforcement). The only genuine gap is that `is_published` has zero migration-file provenance anywhere locally — it was added directly to a hosted database and never committed as a migration.
- **Recommendation:** keep all three columns (already done). Record the missing provenance as a fact, not a problem to resolve by elimination — there is nothing to "pick one name" from; three distinct booleans are genuinely in use.

### `applications.applicant_id` vs. `jobseeker_id` (and `referrals`/`referral_slips` naming, as instructed)

- **`applications`:** **REVERSED from Task 10.** Task 10 concluded `jobseeker_id` wins, based only on `scripts/rebuild-schema.sql`'s historical CREATE TABLE plus a single RLS-file contradiction. Task 11 found `applicant_id` used consistently at 15+ live call sites — `app/lib/db-helpers.ts:28`; `app/api/jobs/[id]/apply/route.ts:107,138` (the primary apply/insert endpoint); `app/api/jobseeker/applications/route.ts:129,149` (a second, independent apply/insert endpoint — note its *own* line 43 is the one outlier use of `jobseeker_id`, immediately contradicted by its own line 149's `applicant_id` in the same file); `app/api/jobseeker/applications/[id]/route.ts:29`; `app/api/jobseeker/jobs/[id]/route.ts:46`; `app/api/employer/applications/[id]/route.ts:42,64,75`; `app/api/employer/applications/[id]/status/route.ts:44,66,77`; `app/api/employer/applications/[id]/message/route.ts:43,61`; `app/api/messages/route.ts:172,184,186,190,191`; `app/api/admin/activities/_events.ts:53,58,162,175`; `app/api/admin/analytics/job-seeker-alerts/route.ts:43,48,49,50`; `app/api/admin/dashboard/activity/route.ts:36,102,103,109`; `app/api/admin/dashboard/overview/route.ts:66`; `app/api/admin/export/reports/masterlist/route.ts:36`; `app/api/auth/account-data/export/route.ts:29,41,96`. **Recommendation:** rename to `applicant_id` (done). The historical RLS file was right; `scripts/rebuild-schema.sql` was stale.
- **`referrals`:** **Unchanged — `jobseeker_id` still wins.** `app/api/referrals/route.ts` uses `jobseeker_id` consistently at 7+ call sites (lines 106,125,184,199,320,322,376,396) including an explicit inline developer comment at line 320 documenting the full column list. One newly-found outlier, `app/api/referrals/[referralId]/status/route.ts:117,136,151`, uses `applicant_id` instead — this matches the ORIGINAL project handoff's already-known defect ("referral status route uses applicant_id where referrals uses jobseeker_id"), now pinned to exact lines. A second, unrelated outlier, `app/api/auth/account-data/export/route.ts:103`, uses a completely different, nowhere-else-seen column set (`applicant`, `vacancy`, `referral_slip_number`, `peso_officer_name`, `remarks`) — flagged in the SQL document as a likely-broken, stale consumer; not blocking.
- **`referral_slips`:** **Unchanged — `applicant_id` wins**, consistently, at every call site (`app/api/admin/referral-slips/route.ts:68,186`, `app/api/jobseeker/applications/route.ts:53,129,149`, `app/api/jobseeker/referrals/route.ts:34`, `app/api/jobseeker/referrals/[slipId]/route.ts:38`). No contradiction found.
- **Net effect:** `applications.applicant_id`, `referrals.jobseeker_id`, `referral_slips.applicant_id` are the three correct, code-confirmed names — each table was independently, consistently named, just not consistently *with each other*. This is not itself a bug; two different tables are allowed to name their jobseeker-referencing FK differently. The actual bugs are the two outlier routes named above.

### New columns surfaced while resolving the `applications` contradiction (beyond the original 33)

Investigating item 12 required reading several `applications`-touching routes in full, which surfaced columns Task 10 missed entirely:

- **Resolved (Class A), added to the baseline:** `applications.cover_letter`, `applications.resume_url` (both apply/insert endpoints + the export route's SELECT list), `applications.feedback` (4 call sites: `app/api/employer/applications/[id]/status/route.ts:60`, `app/api/employer/applications/[id]/route.ts:58`, `app/api/employer/applications/[id]/message/route.ts:80`, `app/api/employer/applications/route.ts:76`).
- **New Class B item, NOT part of the original 33:** `applications.applicant_name`, `applications.applicant_email`. `app/api/employer/applications/route.ts:39` contains an explicit developer comment stating these columns **do not exist** in the database, yet four other call sites write or read them as if they do (`app/api/jobs/[id]/apply/route.ts:140-141`, `app/api/jobseeker/applications/route.ts:151-152`, `app/lib/db-helpers.ts:114`, `app/api/auth/account-data/export/route.ts:27,96`). This is a direct, internal code contradiction that cannot be resolved from code — see §12 below for the dashboard check needed.
- Also surfaced on `jobs` (not `applications`, but found via the same apply-route reading): `jobs.category` (confirmed by `scripts/migrations/20260424_landing_page_tables.sql:65` and `app/api/jobs/[id]/route.ts:46`), `jobs.work_type` (distinct from `work_setup`; 10+ call sites), `jobs.description`, `jobs.employment_contract_type`, `jobs.location`, and a second, separate `jobs.industry_code` (distinct from `employers.industry_code`) — all confirmed by the single authoritative insert at `app/api/employer/jobs/route.ts:121-147` and its matching PATCH at `app/api/employer/jobs/[id]/route.ts:94-120`. All added to the baseline as Class A resolutions.

## 11. Known-defect class contradictions, newly pinned to exact lines in Task 11

- `app/api/referrals/[referralId]/status/route.ts:117,136,151` — uses `applicant_id` where `referrals` actually uses `jobseeker_id` (matches the original handoff's known defect, now with exact lines).
- `app/api/admin/account-deletion/process/route.ts:128-133` — deactivates jobseekers by updating `.from("users")` instead of `.from("jobseekers")` (matches the original handoff's "deletion processor updates users for jobseekers" defect, now with exact lines).
- `app/api/admin/access-requests/[id]/status/route.ts:100-104` — queries `.from("users")` to find a notification recipient by email. A further, previously-undocumented reference to the excluded `public.users` table.
- `app/api/auth/account-data/export/route.ts:103` — selects `referrals` using a column set seen nowhere else in the repository (`applicant`, `vacancy`, `referral_slip_number`, `peso_officer_name`, `remarks`); likely a stale/broken export path, flagged for future review, not fixed here.

## 12. Auth-hardening debt (record only — none of this is fixed)

- **Self-service password reset updates only `password_hash`, never Supabase Auth.** `app/api/auth/reset-password/confirm/route.ts:82-85` calls `db.from(table).update({ password_hash: newHash, ... })` exclusively — no `auth.admin.updateUserById` or equivalent anywhere in the file. Login (`app/login/page.tsx:72`, `app/login/admin/page.tsx:95`) calls `supabase.auth.signInWithPassword()` exclusively and never reads `password_hash`. The two stores are completely disconnected: a successful self-service reset has no effect on what login actually checks.
- **The self-service route maps `jobseeker` to table `"users"`.** `app/api/auth/reset-password/confirm/route.ts:75-80`: `tableMap = { admin: "admins", employer: "employers", jobseeker: "users" }`. A jobseeker's self-service password reset targets a table that, per binding decision #3, should not exist.
- **The deletion-request route verifies against `password_hash`, which may hold the `'auth_managed'` placeholder.** `app/api/auth/account-deletion/request/route.ts:21-26,28-32,41`: looks up `password_hash` via the SAME broken `{ ..., jobseeker: "users" }` table map, then calls `verifyPassword(currentPassword, userData.password_hash || "")`. For any jobseeker who has never had their `password_hash` populated by a *working* reset path, that column still holds the signup-time placeholder `'auth_managed'` (written by `scripts/migrations/20260426_fix_auth_trigger.sql:43`) — a string no real password will ever hash-match against. The practical effect: the account-deletion self-verification step is likely to fail for any user whose password was never changed through a path that actually writes a real hash to this column.
- **The admin-initiated reset route is the only one that works correctly.** `app/api/admin/applicants/[id]/reset-password/route.ts:77` calls `supabaseAdmin.auth.admin.updateUserById(userId, { password })` — this one correctly updates Supabase Auth, the credential store login actually checks. It is a separate, independent code path from every route above and does not touch `password_hash` at all.

None of the above is fixed by this task. All four points are preserved exactly as found, for a future, explicitly-scoped auth-hardening task.

## 13. `account_deletion_requests.cancelled_at` — status after Task 11

Confirmed by reading both `app/api/auth/account-deletion/request/route.ts` and `app/api/admin/account-deletion/process/route.ts` in full: **neither file reads nor writes `cancelled_at` at all.** Only `app/api/auth/account-deletion/cancel/route.ts` touches it, and only via the known camelCase bug (`cancelledAt`/`updatedAt`). So today, no code path successfully reads or writes the correct snake_case `cancelled_at` column. The baseline still declares it, per binding decision #9 — the column's correctness is a schema requirement independent of whether current application code uses it correctly yet.

## 14. Risk list: tables with no CREATE TABLE evidence anywhere

- **`ranking_cache`** — entire shape inferred from `app/lib/matching/ranking-cache-engine.ts:13-34` only. No historical SQL fragment, no migration, nothing. If the live column set differs from this inference in any way (extra columns, different types, a different key), this baseline's version will not match reality.
- **`jobseeker_features`** — entire shape inferred from `app/lib/matching/feature-store.ts:9-48` only. Same risk as above. The `id` FK to `jobseekers(id)` was deliberately left as an open Class C decision rather than assumed, because the code only matches ids, it never evidences a real constraint.
- **Mitigation:** both tables' real column lists should be confirmed from the Supabase Dashboard (Table Editor) before this baseline is ever promoted to an executable migration — see §15 below.

## 15. Remaining VERIFY count by class, and the smallest Dashboard collection list

**After Task 11, `proposed-canonical-baseline.sql` contains 12 remaining `-- VERIFY:` markers** (down from 33; 22 resolved to Class A with citations, 2 new Class B items added for `applications.applicant_name`/`applicant_email`):

- **Class A (resolved in this task):** 22 of the original 33, plus all newly-discovered columns (`applications.cover_letter/resume_url/feedback`, `jobs.category/work_type/description/employment_contract_type/location/industry_code`) — 0 markers remain for any of these.
- **Class B (dashboard-only):** 2 markers remain — (1) `pgcrypto` extension/Postgres version; (2) `applications.applicant_name`/`applicant_email` existence (one marker covering both columns).
- **Class C (team design decision):** 10 markers remain — `admins.password_hash` nullability; 5× jobseeker child-table `jobseeker_id` NOT NULL; `applications.status` default ('under_review' vs. 'pending'); `referral_slips.applicant_id` FK; `referral_slips.issued_by` FK; `job_match_scores.jobseeker_id` FK; `match_disparity_flags.disparity_reviewed_by` FK; `match_feedback_logs` FKs; `jobseeker_features.id` FK; `srs_approval_history.admin_id` FK. (Several of these share the same underlying question — "should this legacy admin/jobseeker-id column get a FK now?" — and could be decided together as one policy rather than ten separate ones.)
- **Class D (adviser/PESO/MSU policy):** 0 markers.

**Smallest set of items to collect from the Supabase Dashboard (column names only, no rows):**

1. Database > Extensions — is `pgcrypto` already enabled (and/or Database > Settings for the running Postgres version)?
2. Table Editor > `applications` — does the column list include `applicant_name` and `applicant_email`?

That is the complete Class B list — everything else remaining is a Class C team decision (no dashboard access needed) with a recommendation already on record in the SQL file.

---

# Task 12 — Coverage Audit, FK Policy, and Blocker Fixes

Everything below was added by Task 12. Sections 1-15 above (Task 10/11) are preserved as the historical record; where Task 12 found them wrong or incomplete, the correction is stated here, and the SQL file itself carries an inline note at the exact location changed.

## 16. Part A — the 10 Class C decisions applied

All 10 are now applied directly in `proposed-canonical-baseline.sql`, each VERIFY marker replaced with a "DECIDED (Task 12, Part A, item #N)" comment at its exact location. Summary:

| # | Column | Decision |
|---|---|---|
| 6 | `admins.password_hash` | NOT NULL DEFAULT `'auth_managed'` (kept as drafted) |
| 8 | 5× jobseeker child `jobseeker_id` | NOT NULL (kept as drafted) |
| 13 | `applications.status` | Default `'under_review'`; CHECK now lists `pending, under_review, reviewed, shortlisted, interview, hired, rejected, withdrawn` (full set confirmed from `app/lib/validation-schemas.ts:184-192` + `app/lib/db-helpers.ts:179-181`) |
| 15 | `referral_slips.applicant_id` | Now nullable, `REFERENCES jobseekers(id) ON DELETE SET NULL` |
| 16 | `referral_slips.issued_by` | Now nullable, `REFERENCES admins(id) ON DELETE SET NULL` |
| 20 | `job_match_scores.jobseeker_id` | Now nullable, `REFERENCES jobseekers(id) ON DELETE SET NULL` |
| 21 | `match_disparity_flags.disparity_reviewed_by` | `REFERENCES admins(id) ON DELETE SET NULL` |
| 22 | `match_feedback_logs.job_id` / `jobseeker_id` | `job_id` → `REFERENCES jobs(id) ON DELETE CASCADE` (kept NOT NULL); `jobseeker_id` → now nullable, `REFERENCES jobseekers(id) ON DELETE SET NULL` |
| 25 | `jobseeker_features.id` | `REFERENCES jobseekers(id) ON DELETE CASCADE` (restored) |
| 28 | `srs_approval_history.admin_id` | Now nullable, `REFERENCES admins(id) ON DELETE SET NULL` |

## 17. Part B — FK policy validity table

Policy: evidence/traceability records → `SET NULL` on nullable columns; per-person working data (child tables, saved jobs, `jobseeker_features`) → `CASCADE`; `applications`/`referrals` → NOT NULL FKs with `ON DELETE RESTRICT`; the three `auth.users(id)` identity-anchor FKs (binding decision #5) are a fourth, explicitly-mandated category using `RESTRICT`.

| Table.column | References | Nullable | ON DELETE | Category | Valid? |
|---|---|---|---|---|---|
| `jobseekers.id` | `auth.users(id)` | No (PK) | RESTRICT | identity anchor | Valid |
| `employers.id` | `auth.users(id)` | No (PK) | RESTRICT | identity anchor | Valid |
| `admins.id` | `auth.users(id)` | No (PK) | RESTRICT | identity anchor | Valid |
| `jobseeker_languages.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_education.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_trainings.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_licenses.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_experience.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobs.employer_id` | `employers(id)` | No | CASCADE | **not named by the policy** | **Deviation — reported, not changed** (see below) |
| `applications.job_id` | `jobs(id)` | No | RESTRICT | applications/referrals | Valid |
| `applications.applicant_id` | `jobseekers(id)` | No | RESTRICT | applications/referrals | Valid |
| `applications.employer_id` | `employers(id)` | No | RESTRICT | applications/referrals | Valid |
| `referrals.job_id` | `jobs(id)` | No | RESTRICT | applications/referrals | Valid |
| `referrals.jobseeker_id` | `jobseekers(id)` | No | RESTRICT | applications/referrals | Valid |
| `referrals.employer_id` | `employers(id)` | No | RESTRICT | applications/referrals | Valid |
| `referrals.application_id` | `applications(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `referral_slips.job_id` | `jobs(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `referral_slips.applicant_id` | `jobseekers(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `referral_slips.issued_by` | `admins(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `referral_slips.referral_id` | `referrals(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `messages.application_id` | `applications(id)` | Yes | SET NULL | evidence/traceability (not explicitly named, reasonable extension) | Valid |
| `admin_access_requests.reviewed_by` | `admins(id)` | Yes | SET NULL | evidence/traceability | **Was invalid (no ON DELETE action at all) — fixed in this task** |
| `jobseeker_saved_jobs.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_saved_jobs.job_id` | `jobs(id)` | No | CASCADE | per-person working data (job side) | Valid |
| `job_match_scores.job_id` | `jobs(id)` | No | CASCADE | scored-item side (score is meaningless without its job) | Valid, asymmetric by design |
| `job_match_scores.jobseeker_id` | `jobseekers(id)` | Yes | SET NULL | evidence/traceability (fairness-audit trail) | Valid |
| `ai_matching_logs.job_id` | `jobs(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `ai_matching_logs.jobseeker_id` | `jobseekers(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `match_disparity_flags.job_id` | `jobs(id)` | No | CASCADE | scored-item side | Valid, asymmetric by design |
| `match_disparity_flags.disparity_reviewed_by` | `admins(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `match_feedback_logs.job_id` | `jobs(id)` | No | CASCADE | explicitly instructed (Part A #22) | Valid per explicit instruction |
| `match_feedback_logs.jobseeker_id` | `jobseekers(id)` | Yes | SET NULL | evidence/traceability | Valid |
| `jobseeker_interactions.jobseeker_id` | `jobseekers(id)` | No | CASCADE | per-person working data | Valid |
| `jobseeker_interactions.job_id` | `jobs(id)` | No | CASCADE | per-person working data (job side) | Valid |
| `employer_hiring_outcomes.job_id` | `jobs(id)` | No | CASCADE | **not named by the policy** | **Deviation — reported, not changed** (see below) |
| `employer_hiring_outcomes.jobseeker_id` | `jobseekers(id)` | No | CASCADE | **not named by the policy** | **Deviation — reported, not changed** |
| `employer_hiring_outcomes.employer_id` | `employers(id)` | No | CASCADE | **not named by the policy** | **Deviation — reported, not changed** |
| `ranking_cache.job_id` | `jobs(id)` | No | CASCADE | cache row tied to its job | Valid, practical choice |
| `jobseeker_features.id` | `jobseekers(id)` | No (PK) | CASCADE | per-person working data | Valid |
| `srs_approval_history.employer_id` | `employers(id)` | No | CASCADE | **audit-log subject — not named by the policy** | **Deviation — reported, not changed** |
| `srs_approval_history.admin_id` | `admins(id)` | Yes | SET NULL | evidence/traceability | Valid |

**No `NOT NULL` + `SET NULL` combination exists anywhere in the final file** — every column given `ON DELETE SET NULL` in this task or a prior one was also made nullable in the same edit; this was checked column-by-column while applying Part A and while building this table.

**One deviation was found and fixed** (not just reported): `admin_access_requests.reviewed_by` had no `ON DELETE` action at all (defaulting to `NO ACTION`), despite being structurally identical to three other admin-id evidence columns that all correctly got `SET NULL`. Fixed to `ON DELETE SET NULL` for consistency.

**Four deviations are reported, not changed**, because they fall outside anything Part A explicitly instructed and outside the three named policy categories, so changing them would be a judgment call beyond this task's explicit scope:
- `jobs.employer_id` (`CASCADE`) — a job is not "per-person working data" in the same sense as the jobseeker child tables, but it is also not named by any other category. Deleting an employer currently cascade-deletes all their jobs; combined with `applications.job_id` now being `RESTRICT`, an employer with any job that has an application cannot be deleted at all (the CASCADE into `jobs` collides with the RESTRICT on `applications`) — this interaction is probably desirable (protects applicant records) but was never deliberately designed as such. Recommend a human decide between `RESTRICT` (treat jobs like applications/referrals) and keeping `CASCADE` (treat jobs as employer-owned working data).
- `employer_hiring_outcomes.job_id` / `.jobseeker_id` / `.employer_id` (all `CASCADE`) — this table is the source of the `employer_feedback_summary` recalibration view; cascading its rows away when any of the three parents is deleted could silently erode the matching-recalibration signal over time. Recommend considering `SET NULL` on `jobseeker_id` at least (mirroring `job_match_scores.jobseeker_id`'s reasoning), for a future decision.
- `srs_approval_history.employer_id` (`CASCADE`) — this is an **admin audit log** (SECTION 12); cascading it away when the employer it concerns is deleted defeats the usual purpose of an audit trail (surviving deletion of its subject). Recommend `RESTRICT` or `SET NULL` for a future decision; not changed here because Part A's explicit list only addressed `admin_id` on this table, not `employer_id`.

No hard-delete logic was added or changed anywhere in this task.

## 18. Part C — column coverage audit findings

Full per-table coverage detail lives as inline comments at each table's location in `proposed-canonical-baseline.sql` (every CODE-ONLY column added carries its own path:line citation at the point it was added). This section summarizes what the audit found beyond individual columns.

### 18.1 Tables entirely missing from the Task 10/11 draft (found in this task)

- **`auth_lifecycle_tokens`** — fully specified by `app/lib/auth-account-tokens.ts:24-108` (`issueLifecycleToken`/`consumeLifecycleToken`). Directly load-bearing for the password-reset flow already flagged as broken in the "Auth-hardening debt" section (§12 above) — `consumeLifecycleToken` is exactly what `app/api/auth/reset-password/confirm/route.ts:67` calls. Added to SECTION 7.
- **`account_email_verifications`** — fully specified by the same file, lines 110-138 (`markEmailVerified`/`isEmailVerified`). Its `upsert(..., { onConflict: "role,user_id" })` call means `UNIQUE(role, user_id)` is not optional — without it, that upsert raises a Postgres error at runtime. Added to SECTION 7.
- **`settings`** — a generic key/value table, confirmed real at `app/api/experience/route.ts:74-92` and `app/api/notes/route.ts:31-35` (full `{key, value}` shape), and pinged for existence only at `app/api/health/route.ts:35` and `app/api/summary/route.ts:37`. Added to SECTION 12.
- **`skill_suggestions`** — only a bare existence/count check found (`app/admin/dashboard/_lib/data-loader.ts:272`). Added as a minimal stub, flagged Class B (would need a dashboard column list to go beyond `id`) — this is the one remaining VERIFY marker in the file after this task.

All four were visible as table-name string constants in `app/db/schema.ts` and/or the original 2026-06-05 audit's "missing tables" list since before Task 9 began, but neither prior draft pass gave any of them a shape. This is exactly the class of silent gap Task 12 was commissioned to find.

### 18.2 Missing constraint found via `.upsert()`/`.onConflict()` audit

- **`ranking_cache` had no `UNIQUE(job_id)`.** `app/lib/matching/ranking-cache-engine.ts:30-34` calls `.upsert({ job_id, results, expires_at })` with **no `onConflict` argument at all**. Without a unique constraint on `job_id`, PostgREST's default upsert target is the primary key (`id`), which the payload never supplies — so every "cache write" for a given job silently inserts a new row instead of replacing the old one, growing the table unboundedly and defeating the cache's purpose. Added `UNIQUE(job_id)` to the table. **This fixes only half the bug** — the application code must also be changed to pass `{ onConflict: "job_id" }`; that is out of scope for this schema task and is recorded, not fixed.
- Every other `.upsert()`/`.onConflict()` call site audited matched an existing UNIQUE/PK target correctly: `job_match_scores` (`onConflict: "job_id,jobseeker_id"` ↔ `UNIQUE(job_id, jobseeker_id)`), `jobseeker_saved_jobs` (`"jobseeker_id,job_id"` ↔ matching UNIQUE), `skill_correction_cache` (`"raw_input"` ↔ `UNIQUE`), `role_equivalence_cache` (`"role_a, role_b"` ↔ `UNIQUE(role_a, role_b)`), `skill_embeddings_cache` (`"skill_term"` ↔ `UNIQUE`), `skill_synonyms` (`"alias"` ↔ the unique index on `alias`), `jobseeker_features` (payload includes `id`, the PK, so the default target is correct).
- One further `.upsert()` was found targeting the **excluded `users` table** — `app/api/jobseeker/profile/route.ts:200`. Not a schema gap (the table is correctly excluded per binding decision #3); added to the running tally of live code that still depends on `public.users` (see §18.4 below).

### 18.3 PostgREST embed / FK audit

Every `table!inner(...)` embed found in `app/` (`jobs!inner`, `employers!inner` — in `app/api/jobseeker/saved-jobs/route.ts`, `app/api/jobseeker/recommendations/route.ts`, `app/api/jobseeker/jobs/route.ts`, `app/api/jobseeker/jobs/[id]/route.ts`, `app/api/jobseeker/applications/[id]/route.ts`, `app/api/jobs/[id]/route.ts`, `app/api/jobs/route.ts`) has a matching FK already present in the draft (`jobseeker_saved_jobs.job_id → jobs`, `applications.job_id → jobs`, `jobs.employer_id → employers`). No missing-FK-for-embed issues found. No `.onConflict(` calls were found anywhere outside the `.upsert()` sites already covered above.

### 18.4 `jobs.status` vs `job_status` vs `is_active` vs `archived` vs `is_published` — every read/write traced

- **`job_status`** is the real, consistently-written column. Written as `"pending"` (`app/api/employer/jobs/route.ts:139`, `app/api/employer/jobs/[id]/route.ts:120`), `"active"`/`"rejected"`/`"archived"`/`"draft"`/`"closed"` (via `updateJobStatus()` in `app/lib/db-helpers.ts:196-211`, called from `app/api/admin/jobs/[id]/status/route.ts:27` and `app/api/admin/jobs/batch-approve/route.ts:38`). Read via `.eq("job_status", "active"/"pending")` in `app/api/jobs/route.ts:74`, `app/api/jobs/filters/route.ts:12,28`, `app/api/admin/jobs/batch-approve/route.ts:21`, and `jobData.job_status !== "Open"` in `app/api/jobs/[id]/apply/route.ts:96`.
- **A genuine, newly-found bug**: `app/api/jobs/[id]/apply/route.ts:96` gates application on `jobData.job_status !== "Open"` — **capitalized "Open"** — but no code path anywhere ever writes that exact capitalized value; every writer uses lowercase (`"active"`, `"pending"`, etc., per `updateJobStatus`'s `'draft'|'pending'|'active'|'closed'|'archived'` union at `db-helpers.ts:196`). This specific apply-gate can plausibly never pass. Recorded, not fixed (application-layer logic bug, not a schema problem — `job_status` has no CHECK constraint, so nothing here is a schema violation).
- **A separate, genuine bug, consistent with Task 11's already-documented "two competing apply endpoints" finding**: `app/api/jobseeker/applications/route.ts:116,122` selects and reads a column literally named **`status`** on `jobs` (`.select("id, employer_id, position_title, status, is_published, archived")` then `job.status !== "active"`). No code anywhere ever writes a `jobs.status` column — only `job_status` is ever written. This SELECT would be expected to fail at the database level (PostgREST errors on an unknown column) if `jobs.status` truly doesn't exist, which is consistent with this being the same under-tested, divergent second apply endpoint already flagged. **No `jobs.status` column was added to the baseline** — doing so would be inventing a column with zero write-side evidence; the bug is recorded here instead.
- **`is_active`/`archived`** — confirmed real, used consistently alongside `job_status` as additional gating flags (`app/api/jobs/[id]/apply/route.ts:83,96`, `app/api/jobs/route.ts:68`, `app/api/jobs/[id]/route.ts:46,54`).
- **`is_published`** — see Task 11's resolution (§1, item 10): real, distinct, three independent call sites, no migration provenance. Unaffected by this section's findings.

### 18.5 `public.users` — scale of the live dependency

The draft itself contains zero references to `users` (confirmed by a direct grep of the SQL file — no `CREATE TABLE users`, no `REFERENCES users(...)`). But a repo-wide check in this task found **24 files** in `app/` still calling `.from("users")` — including `app/api/jobseeker/profile/route.ts:200` (an `.upsert()`, newly found in this task), on top of the 5+ instances already documented in Task 11 (`reset-password/confirm`, `account-deletion/request`, `account-deletion/process`, `access-requests/[id]/status`, `jobseeker/applications/route.ts`). This is recorded as the scale of a known, pre-existing debt — not something this schema task fixes; binding decision #3 (exclude `public.users`) is unaffected and correct, but promoting this baseline to an executable migration without a corresponding application-code migration plan would break all 24 of these call sites.

## 19. Part D — blocker fixes

- **D.1 — `handle_new_user()` / `on_auth_user_created`**: ported as executable SQL in SECTION 11, faithful to `scripts/migrations/20260426_fix_auth_trigger.sql:7-74` (jobseeker/employer branches only, `'auth_managed'` placeholder, `ON CONFLICT (id) DO UPDATE`, no admin branch — all unchanged). Every column it writes was checked against the FINAL column lists in SECTION 2: **no column it writes is missing from this baseline.** The one open question carried over from Task 10/11 — whether `ON CONFLICT (id) DO UPDATE` behaves correctly now that `id` carries a `REFERENCES auth.users(id) ON DELETE RESTRICT` FK — is noted inline as a residual risk for the local test plan, not fabricated away.
- **D.2 — RPC function inventory**: every `.rpc("...")` call site in `app/` and `scripts/` was grepped.
  - **Ported** (code calls them): `match_jobseekers_to_job` (faithful port from `docs/migrations/phase5b_pgvector.sql:28-50` — still returns `nsrp_id`, not `jobseekers.id`; both call sites already defensively fall back to `item.id || item.nsrp_id`, so this is recorded as a future-rewrite recommendation, not fixed), `upsert_job_match_scores` (faithful port, `supabase/migrations/20260430120000_...sql:8-74` — every column it writes exists in SECTION 9), `compute_job_percentiles` (faithful port, `supabase/migrations/20260430140000_...sql:7-32`).
  - **Correctly excluded, not "deferred"**: `cleanup_stale_dimensions` is not a function at all — `supabase/migrations/20260430130000_cleanup_stale_dimensions.sql` is a one-time data-cleanup `UPDATE`, never a `CREATE FUNCTION`; there is nothing to call and nothing to port.
  - **Called but no local source to port**: `run_sql`, `exec_sql`, `get_table_columns` — called from `app/api/admin/fix-db/route.ts:6` and several `scripts/*.{js,mjs,ts}` dev-ops utilities, but no `CREATE FUNCTION` for any of the three exists anywhere in this repository's SQL. These appear to be ad-hoc utility RPCs created directly on a hosted project and never captured in a committed migration. Flagged for manual review; nothing to port.
- **D.3 — the two Class B items, resolved without a dashboard**:
  - `pgcrypto`: **removed entirely**, not merely resolved-and-kept. `gen_random_uuid()` has been Postgres core since version 13; `supabase/config.toml:36` pins `major_version = 17`. No extension line is needed on this target.
  - `applications.applicant_name`/`applicant_email`: **decided to exist**, from the weight of code evidence (4 independent call sites across 2 features assume they're real vs. 1 stale-looking comment in a 3rd, unrelated feature) — full reasoning inline in the SQL file at that column's location.

## 20. Report

- **Tables audited in Part C: 40** (every `CREATE TABLE` now in the file, including the 4 newly added) **+ 1 view** (`employer_feedback_summary`).
- **CODE-ONLY columns/tables found and added**: 4 entire tables (`auth_lifecycle_tokens`, `account_email_verifications`, `settings`, `skill_suggestions`) plus, within existing tables from Task 11's own audit trail, nothing further beyond what Task 11 already caught — Task 12's column-level finds were concentrated in the net-new tables and the `ranking_cache` constraint, not in previously-covered tables.
- **DRAFT-ONLY columns found**: none newly identified in this pass beyond what Tasks 9-11 already flagged (e.g. `referral_slips.employer_feedback_at`, deliberately excluded).
- **Type conflicts found**: none newly identified — the one candidate (`job_status` vs. the capitalized `"Open"` apply-gate literal) is a value-level application bug, not a column-type conflict (`job_status` is plain `TEXT` with no CHECK, so no type system would catch it).
- **Missing FK/UNIQUE for onConflict or embeds**: 1 found and fixed — `ranking_cache` missing `UNIQUE(job_id)` (§18.2). All PostgREST embeds already had matching FKs (§18.3).
- **Bug found and fixed that no VERIFY marker had flagged**: `jobs.job_embedding` was still `vector(1536)` despite Task 11's own comments claiming the 768-dim fix had been applied everywhere — it had not been applied at that specific column. Fixed to `vector(768)`.
- **Remaining VERIFY count by class, after this task**: **Class A: 0. Class B: 1** (`skill_suggestions`, newly added this task, thin evidence). **Class C: 0** (all 10 closed in Part A). **Class D: 0.**

## 21. File-modification confirmation

Only `docs/schema/proposed-canonical-baseline.sql` and `docs/schema/baseline-decision-record.md` were edited in this task. No other file in the repository was read for the purpose of modification, and no command was run against any database, local or remote, Docker, network, browser, or GitHub. A read-only, in-memory Node.js check (no file writes) was used once to confirm parenthesis and dollar-quote balance in the SQL draft after editing — it modified nothing.

---

# Task 13B — Draft-Schema Integrity Corrections (Human Review)

A human review of the draft (after Task 12/12.1) found several concrete omissions and integrity issues. Everything below documents the corrections applied directly in `proposed-canonical-baseline.sql`; this task did not promote the draft into a migration and did not execute anything.

## 22. Fields and constraints added or changed

| Table.column | Change | Evidence |
|---|---|---|
| `admins.role` | **Added**, `TEXT`, nullable, no CHECK (not in the requested CHECK list) | `app/api/auth/account-data/export/route.ts:143` |
| `admins.is_active` | **Added**, `BOOLEAN NOT NULL DEFAULT true` | `app/api/auth/account-data/export/route.ts:143`; `app/api/admin/account-deletion/process/route.ts:119` |
| `admins.last_login` | **Added**, `TIMESTAMPTZ`, nullable | `app/api/auth/account-data/export/route.ts:143` |
| `account_deletion_requests.role` | **CHECK added**: `IN ('jobseeker','employer','admin')` | `app/api/auth/account-deletion/request/route.ts:21-26`; `app/api/admin/account-deletion/process/route.ts:100-104` |
| `account_deletion_requests.status` | **CHECK added**: `IN ('pending','cancelled','processed')` | request/cancel/process routes, as already cited in §18 |
| `auth_lifecycle_tokens.role` | **CHECK added**: `IN ('jobseeker','employer','admin')` | `app/lib/auth-account-tokens.ts:4` (`AccountRole` type) |
| `auth_lifecycle_tokens.kind` | **CHECK added**: `IN ('password_reset','email_verify')` | `app/lib/auth-account-tokens.ts:5` (`TokenKind` type) |
| `account_email_verifications.role` | **CHECK added**: `IN ('jobseeker','employer','admin')` | same `AccountRole` type, shared file |
| `notifications.role` | **CHECK added**, explicitly NULL-permissive: `role IS NULL OR role IN ('jobseeker','employer','admin')` | `app/lib/notifications.ts:6` (`NotificationRole` type); kept nullable per the historical column shape, since no code path was found that requires it to be non-null at the database level |
| `messages.sender_role` | **Remains nullable in baseline version 1** (Task 13B briefly made it NOT NULL; reversed in Task 13B.1), existing CHECK unchanged, no DEFAULT | see §23 — superseded by the Task 13B.1 reversal |
| `jobs.employer_id` FK | **Changed `ON DELETE CASCADE` → `ON DELETE RESTRICT`** | see §24 |

No role CHECK was added to any table not explicitly listed above (e.g. `admins.role` deliberately has none) — per the instruction not to add one unless code demonstrably uses the same three literals for that specific column.

## 23. `messages.sender_role` nullability — deferred architectural decision

**Superseded by Task 13B.1.** Task 13B briefly made `sender_role` `NOT NULL`. A repo-wide check in that same task found that **no current `.insert()` into `messages` anywhere in `app/` actually supplies `sender_role` at all** — the only reference to it anywhere in `app/` is the frontend TypeScript type at `app/components/messaging/realtime-chat.tsx:18`, never a server-side write. The practical effect, had that change stood: once this baseline was ever executed, every message insert through the current, unmodified application code would have failed outright with a not-null violation, since the column has no `DEFAULT` and nothing populates it.

Task 13B.1 withdrew that change. The architectural decision now on record is:

- **`messages.sender_role` remains nullable in baseline version 1**, for compatibility with the current message-create path.
- **Current application code does not write this field.** This is a known, accepted gap in the application layer, not a schema defect to paper over with a default.
- **No `DEFAULT` is permitted on this column.** A default role would be a guess about who sent a given message — it could misclassify the sender's actual role, which is exactly the kind of silent, un-auditable error this entire schema-recovery effort has been trying to eliminate elsewhere (see, e.g., the dual-credential-store and `job_status` findings in earlier tasks). Nullable-with-no-default is the only option that doesn't fabricate data.
- **Promotion to NOT NULL is deferred to a future messaging/auth-alignment task**, which must, before making this column required: (1) derive `sender_role` from trusted server-side authentication (the session's resolved role) rather than any client-supplied value; (2) populate it on every insert path into `messages`; (3) add regression tests proving it is always populated correctly for each of the three roles; (4) backfill any existing local rows that predate the change, if the local environment has any; and only then (5) promote the column to `NOT NULL`. None of those five steps is performed in this task.
- The allowed-role `CHECK (sender_role IN ('jobseeker', 'employer', 'admin'))` is retained unchanged throughout — both the brief NOT NULL version and this reversal keep it exactly as Task 13B first wrote it.
- No `recipient_role` column was added, in either Task 13B or this correction.

## 24. `jobs.employer_id` — RESTRICT rationale

Employer profiles are not hard-deleted under the chosen deactivation/anonymization design (binding decision #16 — Task 4's two-stage deactivate-then-anonymize policy, not yet implemented, governs employer removal). `ON DELETE CASCADE` on `jobs.employer_id` meant that if anything ever did delete an employer row directly, every one of that employer's jobs would silently disappear too — and, transitively, every operational record that in turn references those jobs (applications, referrals, match scores, etc., several of which are themselves `RESTRICT` against `jobs`) would either block the deletion anyway (via their own `RESTRICT`) or, for the `CASCADE`-on-`jobs` ones, cascade further than intended. `ON DELETE RESTRICT` makes this explicit and intentional: an employer with any job cannot be deleted at the database level at all, forcing any future deletion code path through the deactivation/anonymization policy instead of an implicit cascade. This also resolves the "`jobs.employer_id` deviation" that Task 12 (§17) had reported but left unchanged pending this review.

## 25. Jobseeker coverage check (Task 13B, item 7)

A dedicated read-only search was run across every `.from("jobseekers")` call site in `app/` (32 files). The authoritative, most complete surface is `app/api/jobseeker/profile/route.ts` together with its backing Zod schema, `jobseekerProfileUpdateSchema` (`app/lib/validation-schemas.ts:249-318`) — every one of its ~45 fields (converted from camelCase to snake_case by the route itself, `route.ts:111-119`) was checked against the draft and **all already exist** in `jobseekers`. The provisioning insert (`route.ts:209-222`), the admin applicant list/detail views (`app/api/admin/applicants/route.ts:45`, `[id]/route.ts:26`), the LMI/PES report queries (`app/api/admin/reports/lmi/route.ts:36`, `pes/route.ts:26`), the matching engine's two full-profile loads (`app/lib/matching/agent.ts:422`, `app/lib/matching/services/ExplanationService.ts:23`), and the smaller lookups in `auth-utils.ts`, `supabase-middleware.ts`, `supabase-admin-data.ts`, `referrals/route.ts`, and `messages/route.ts` were all checked the same way — **no missing column was found** beyond the one unresolved case below.

**One apparent field-name conflict found, left as `-- VERIFY:`, not added, per instruction:** `jobseekers.education_level`. `app/lib/matching/agent.ts:422` explicitly selects `education_level` alongside `*`, and `app/lib/matching/deidentify.ts:44` comments it in a type definition as "top-level column on jobseekers table" — but the only place that value is actually consumed (`deidentify.ts:176-180`) reads exclusively from the embedded `jobseeker_education` child-table rows, never from a flat column, and a second, near-identical full-profile query (`ExplanationService.ts:23`) omits `education_level` from its select entirely. This cannot be resolved from code alone: either it's a real, stale, currently-unread column, or the explicit mention in `agent.ts:422` is a bug that would fail at the database level. Not added as a column; the full reasoning is inline in the SQL file at this location.

**Checked and deliberately excluded (not a conflict, not added — defensive/speculative code, no write evidence):** `target_psoc`, `preferred_salary`, `city_municipality` — all three appear only as optional (`?`) fields on the matching engine's internal `RawJobseeker` type (`deidentify.ts:34-38`), are never written by any `.insert()`/`.update()` found anywhere, and the one place `target_psoc` is actually read (`scoring-engine.ts:733`) explicitly guards against its absence (`if (!seeker.target_psoc || ...) return ...`). Per this task's instruction not to add aliases merely because code uses alternate names defensively, none of the three was added, and none needed its own `VERIFY` marker since there is no conflict to flag — just speculative, already-tolerant code.

## 26. Additional decision-record notes (Task 13B, item 9)

- **Job deletion/archival policy, and why `job_match_scores.job_id`'s FK is unchanged:** hard deletion of a `jobs` row is prohibited in this project's local baseline workflow — jobs are archived (`jobs.archived`/`jobs.is_active`/`jobs.job_status`, all already in the draft) rather than deleted, consistent with the same no-hard-delete principle governing jobseeker/employer removal (binding decision #16). Because jobs are never expected to actually reach a `DELETE`, `job_match_scores.job_id`'s existing `ON DELETE CASCADE` (§17/18) is left exactly as Task 12 set it — not because CASCADE was independently re-justified here, but because this task's scope explicitly excludes revisiting it, pending a later function/test review that would need to run against a disposable local database this read-only task cannot create.
- **`UNIQUE(job_id, jobseeker_id)` and multiple NULLs after `SET NULL`:** standard PostgreSQL `UNIQUE` constraints treat `NULL` as distinct from every other `NULL` (unlike every other value, which must be unique). Once `job_match_scores.jobseeker_id` is set to `NULL` by its `ON DELETE SET NULL` FK (applied in Task 12, §16 item #20) following a jobseeker's anonymization, the table can end up with many rows sharing the same `job_id` and a `NULL` `jobseeker_id` without ever violating `UNIQUE(job_id, jobseeker_id)` — Postgres simply never checks those rows against each other for this constraint. This is **acceptable and intentional**: an anonymized match record is historical evidence (the fairness/bias audit trail), not a live candidate score that should ever be recomputed or upserted again, so there is no correctness requirement forcing those rows to stay mutually unique.
- **Future test requirement, not implemented here:** whatever future local database test suite exercises the matching pipeline's upsert path (`upsert_job_match_scores()`, ported in Task 12 §19) must prove that it is never called in a way that would attempt to upsert a new score against a `jobseeker_id` that has already been set to `NULL` by anonymization — i.e. that the application layer excludes anonymized jobseekers from future matching runs before calling this function, not that the database enforces it structurally (it cannot, given the `SET NULL` design above). This is a test obligation for a later, disposable-local-environment task, not something addressed in this read-only/draft-only correction pass.
- **`account_deletion_requests.email` is a historical request snapshot, not the authoritative account identity.** It records the email address at the moment the deletion request was filed (`app/api/auth/account-deletion/request/route.ts:78`, sourced from `ctx.user!.email`). It must never be treated as a live join key back to a current `jobseekers`/`employers`/`admins`/`auth.users` row — the authoritative identity for all deletion-processing logic is `account_deletion_requests.user_id` plus `role`, exactly as `app/api/admin/account-deletion/process/route.ts` already uses them. This distinction matters because `targetEmail`-based filtering also appears in that same route (`process/route.ts:64-66,80-82`) for an E2E-test convenience path — that filter is a test aid, not evidence that email is ever the real identity key.

## 27. Remaining VERIFY markers after this task

**Two.** (1) `jobseekers.education_level` — new in this task, Class-C-like "apparent field-name conflict," not resolvable from code alone, documented in §25 above and inline in the SQL. (2) `skill_suggestions` — unchanged from Task 12, Class B, thin evidence, would need a dashboard column list to resolve further.

## Final readiness

Not restated here — see the chat response for this task's required exact closing line.
