# GensanWorks — Project State

Shared journal for all AI coding assistants (Claude Code, Antigravity, GitHub Copilot) and humans.

**Rules:** Read this file at session start. Check **Next Steps** before doing any work. After completing any task or making any decision, append to **Task History** and **Decision Log**, then rewrite **Next Steps**. Never delete history — only append. Use `YYYY-MM-DD` dates. Mark anything not verifiable from the repo as `[UNKNOWN]`.

---

## 1. Project Overview

- **What:** Web-based employment platform and labor-market information system for the PESO of General Santos City.
- **Users:** Job seekers, employers, PESO administrators.
- **Stack (verified from `package.json` / recent commits):** Next.js + TypeScript, Supabase (auth, Postgres, RLS, migrations in `supabase/migrations/`), deployed on Vercel. Tests: `tsx --test` (`npm test`), type-check `npm run type-check`, lint `npm run lint`.
- **Key subsystems:** role-based portals (jobseeker / employer / admin), job postings & applications, referral slips with QR codes, messaging & notifications (SSE/polling), admin dashboards & reports, AI-assisted job matching (deterministic scoring + Groq narrative), bias audit tooling.
- **Context:** Capstone project; currently in a controlled PESO pilot phase.
- **Guidance files:** `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` (note: the Copilot file dated 2026-03-29 still describes NextAuth/Drizzle — stack has since moved to Supabase).

## 2. Current State Snapshot

_Last updated: 2026-10-20 (master-plan reconstruction session)_

- **Branch `main`:** HEAD `c75b99e` (2026-10-20) "feat(auth): gate Google sign-in behind privacy consent; require signup consent". In sync with `origin/main` (pushed).
- **Uncommitted on `main` (another session may be editing):** `app/lib/matching/services/ExplanationService.ts`, `package.json`, `package-lock.json`, `.env.example`, several `scripts/*`, `seed_generated.sql`, `docs/migrations/mock_data_gensan.sql`; untracked `tests/matching-narrative-pilot-cascade.test.ts`, `tests/matching-stage1-determinism-pilot.test.ts`, `docs/schema/`, `scripts/verify-*.cjs`. Looks like pilot-constraint work on matching determinism and the narrative cascade; owner/status [UNKNOWN].
- **Git worktrees:**
  - `scratch/draft-core-a-baseline-v1` → branch `migration/draft-core-a-baseline-v1` (HEAD `d356f16`, 2026-10-13). **Holds most of the 13Z chain, which is NOT on `main`:** committed 13Z-S landing and 13Z-U/V; **uncommitted** `app/lib/profile-role.ts` (profile-role decision module), 14 `tests/task-13z*.test.ts` files (13Z-C … 13Z-S), `docs/schema/policy-drafts/profile-access-v1.sql`, `docs/schema/generated/core-a-canonical-baseline-v1.sql`, edits to auth/middleware/callback/supabase/matching files, and new admin referral-slip applicant routes.
  - `scratch/verify-13z-cumulative` (detached at `686000c`); `.kilo/worktrees/thirsty-sputter` (detached at `277bd28`). Purpose [UNKNOWN].
- **Consent migration `20260829120000_add_signup_consent_fields.sql`:** committed; **applied** (owner verified the 4 columns on 2026-10-20). Target project not stated [UNKNOWN].
- **Consent gate deployed to production:** code pushed; whether Vercel deployed it [UNKNOWN — needs owner input].
- **Admin MFA:** not implemented (required before any real-data pilot).

## 3. Decision Log (append-only)

| Date | Decision | Rationale / Source |
|---|---|---|
| 2026-03-27 | Phase 0–9 delivery plan adopted | Commit `e86e7cf` and `docs(status)` commits |
| 2026-04 | Migrated to Next.js + Supabase rebuild (from NextAuth/Drizzle) | `package.json` description; Supabase auth/callback commits 2026-04-26 [exact date UNKNOWN] |
| 2026-04-26 | All API routes / dashboard pages marked `force-dynamic` | Commits `70ddb6d`, `9d051a1` (Vercel runtime errors) |
| 2026-04-29 | `jobseekers` table is the source of truth for applicant data (not `users`) | Commits `0b77d97`, `9f2a12f`, `95f8c02` |
| 2026-08-28 | Supabase keepalive workflow added to prevent free-tier auto-pause | Commit `7390bce` |
| 2026-10-02 | Pilot constraints adopted: deterministic Stage-1 matching by default (Groq role-equivalence off); synthetic data only until Phase 0 privacy/security done; two-stage account deletion (deactivate → anonymize); required consent on jobseeker+employer signup with timestamp + notice version; Groq primary+fallback only for narratives, else score-only; SSE/polling not Socket.IO on Vercel; admin MFA documented as required, not claimed; RLS changes only as generated migration files, never applied by an agent | Post-audit user decisions |
| 2026-10-20 | Google sign-in re-allowed for **jobseekers only**, behind consent gate (held at `/auth/consent` until consent recorded; decline → `is_active=false`). Admin Google login stays removed. Option C (no profile before consent) planned follow-up | User decision |
| 2026-10-20 | Shared project journal system adopted (`PROJECT_STATE.md` + rules in `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, Claude Code Stop hook) | User request |
| 2026-10-20 | Master phase plan = engineering Phase 0–9 roadmap (`.github/copilot-instructions.md` §II, dated 2026-03-29) **cross-referenced to** manuscript Specific Objectives SO1–SO7 (`Files/Revised 5.docx` §1.2.2, dated 2026-10-02). Manuscript SO1–SO7 treated as the authoritative capstone scope; Phase 0–9 as the engineering breakdown. Phases R (Research), M (Matching), Z (13Z hardening) and P (Pilot) added by inference because the roadmap lacks them | Reconstruction session; **DRAFT pending owner confirmation of gaps** |
| 2026-10-20 | Owner confirmed §7 Master Phase Plan has no missing phases or features ("nothing more"). §7 is now the agreed plan. Goal: bring every pre-pilot phase to 100% so the manuscript can be written; Phase P and Ch. 4–5 depend on the pilot itself | Owner reply |
| 2026-10-20 | Admin Google callback (`app/api/auth/callback/admin/route.ts`) is kept, not removed: hardened by 13Z-T (admin only with an active admins profile, everyone else signed out), unreachable through the Supabase redirect allow-list, and covered by tests | Batch 2 review |
| 2026-10-20 | profile-access-v1 promoted to `supabase/migrations/20261020130000_profile_access_v1.sql` (draft body + `GRANT SELECT (consent_given_at)` on jobseekers). Owner must run read-only pre-checks first; the draft was written as SYNTHETIC TARGET ONLY, so applying to production is an owner decision | Batch 2 (owner: do remaining tasks automatically) |
| 2026-10-20 | Account anonymization (deletion stage 2) is admin-triggered only (no cron), dry run by default, disabled until ACCOUNT_ANONYMIZATION_RETENTION_DAYS is set. Known residuals: auth.identities identity_data and Storage files | Batch 3; code-reviewer findings applied |
| 2026-10-20 | Owner overrode pilot rule #8 for profile-access-v1 only: Claude Code applied it to production via the Supabase connection. Rule #8 still applies to any other RLS change | Owner answer to the M8 apply question |
| 2026-10-21 | Google sign-in extended to employers (supersedes 2026-10-20 jobseeker-only). Admin never via Google. Portal choice for NEW users only (short-lived `gw_oauth_role` cookie); existing profiles never change role. Google employers created `pending` with an establishment name | Owner: "approve employer google" |
| 2026-10-21 | Automatic-execution policy adopted in `CLAUDE.md`: safe project-local work runs without approval; Git automation is read-only; hard-denied operations need `APPROVE RISKY ACTION: <exact command or change>`. `npm install` auto-allowed only to restore the existing lockfile (adding/upgrading deps still needs approval, per "Approval required") | Owner-pasted policy |
| 2026-10-21 | `.claude/settings.json` permissions tightened to match the policy: explicit safe npm scripts only (no `npm run *`, no `npx *`); `npm ci` / `npm install --package-lock-only` instead of bare `npm install`; Edit/Write limited to the repo; extra denies for find -delete, branch/tag/remote deletion, global installs, `.env` reads via shell. Hooks kept unchanged | Owner: "APPROVE RISKY ACTION: Add matching permission deny rules…" |
| 2026-10-21 | Batch 3 defaults: archive = employers.is_active=false (+ their jobs offline); SRS review state = account_status; review history and "matching report sent" = audit_logs rows (no schema change); access-request details stored as labelled lines in `reason`; application cover letter/resume delivered as the first message (applications has no such columns) | Owner: "do all automatically"; no migrations needed |
| 2026-10-22 | Referral statuses stored lowercase (referred/interview/hired/rejected/withdrawn); title case is display only. Hire date = referral updated_at once status is hired (terminal). Unused routes built on the removed `users` table are retired with 410 rather than rebuilt | Batch 4 defaults under "do all automatically" |
| 2026-10-22 | Admin "delete applicant" = stage-1 deactivation through the existing two-stage deletion policy (no hard delete). Email verification state = Supabase Auth `email_confirmed_at`. Bias audit "logistics zone" = jobseeker city; education dimension unavailable until a column exists | Batch 5 defaults under "do all automatically"; no schema change |
| 2026-10-22 | AI skill-spelling correction in matching Stage 2.5 is off by default (`MATCHING_AI_SKILL_CORRECTION_ENABLED`, fail-closed), alongside the existing role-equivalence flag, so pilot scores are deterministic. Unpublished jobs are hidden from the public job detail API; employer contact details require sign-in | Pilot constraint 1 + CLAUDE.md privacy rules; Batch 7 |
| 2026-10-22 | Demo seed uses real Mindanao employer names with fictional contacts and postings; seeded jobs are live (`active`) on the public site until the cleanup script is run. Job ads use age range 18–60 (RA 10911 bars age preferences) | Owner request; pilot constraint #2 (synthetic data) |
| 2026-10-22 | UI cleanup tokens: `--primary`/`--ring` = PESO navy `225 45% 30%` (#2A3B6F); `--accent` = light navy tint (hover never red); `--destructive` darkened to red-600 for 4.8:1 with white text; status tokens success/warning/info. Radius extras capped at 0.75rem. UI anti-patterns are guarded by a ratchet test (`tests/ui-hygiene.test.ts`, counts may only go down) | Owner-approved UI cleanup P0 plan, Steps 1–2 (branch `ui-cleanup`) |

## 4. Task History (append-only)

| Date | Agent | Task | Result |
|---|---|---|---|
| 2026-03-27 → 2026-04-16 | [UNKNOWN] | Phases 0–5, 8: DB setup, auth hardening, dashboards, messaging, security tests, mock APIs | Committed (`e86e7cf` … `98437c1`) |
| 2026-04-24 → 2026-04-29 | [UNKNOWN] | Saved jobs, recommendations, referrals, audit logging; Vercel build fixes; auth redirect-loop fixes; AI ranking engine | Committed |
| 2026-05-02 → 2026-05-28 | [UNKNOWN] | Portal refactors, message threading, referral slips + QR, matching refinements, skill synonyms, embedding cache | Committed |
| 2026-06-04 → 2026-06-06 | [UNKNOWN] | TF-IDF scoring, PSOC alignment, bias audit engine, admin dashboard split, password reset | Committed |
| 2026-08-22 → 2026-08-28 | [UNKNOWN] | Narrative RBAC tests, keepalive workflow, matching profile completeness + backfill | Committed |
| 2026-10-02 | Claude Code | Read-only repo audit → pilot constraints set | Decisions recorded (see Decision Log) |
| 2026-10-04 → 2026-10-05 | [UNKNOWN] | Canonical profile alignment; disabled unsafe account actions | Committed (`5a967c8`, `686000c`) |
| 2026-10-20 | [UNKNOWN] | Consent gate + Google jobseeker sign-in (in progress) | Uncommitted; validation status [UNKNOWN] |
| 2026-10-20 | Claude Code | Set up automatic project journal system | Created `PROJECT_STATE.md`, `AGENTS.md`; appended rules to `CLAUDE.md`, `.github/copilot-instructions.md`; added Stop hook to `.claude/settings.json`. No commit. |
| 2026-10-05 → 2026-10-13 | [UNKNOWN] | 13Z chain (13Z-C … 13Z-S, 13Z-U/V) in worktree `scratch/draft-core-a-baseline-v1` | 13Z-S landing + 13Z-U/V committed on branch `migration/draft-core-a-baseline-v1` (`1fdda6c`, `d356f16`); 13Z-C…S code + tests **uncommitted** in worktree |
| 2026-10-20 | [UNKNOWN] | Consent gate + Google jobseeker sign-in (follow-up to row above) | Committed `c75b99e` on `main` and pushed to `origin/main`. Includes `tests/google-consent-gate.test.ts`, updated 13Z-V tests, and a build type-error fix |
| 2026-10-20 | Claude Code | Reconstructed master phase plan from roadmap + manuscript SO1–SO7, cross-checked against git, worktrees, tests and docs | Added §7 Master Phase Plan & §8 Critical Path; snapshot + Next Steps rewritten. No other file modified; no tests or builds run; no remote access. Awaiting owner confirmation of gaps |
| 2026-10-20 | Claude Code | Owner confirmed plan; produced batch plan to reach 100% on pre-pilot phases | Next Steps rewritten as Batches 1–5. Open [UNKNOWN]s (13Z letter gaps, synthetic project, migration/deploy state, seed-SQL key) still unanswered |
| 2026-10-20 | Claude Code | Owner rule: every SQL/manual action is pasted in full in chat and logged in §9 Owner Manual Actions | Added §9 with M1–M4; saved as persistent memory |
| 2026-10-20 | Owner | M1: applied the consent-columns migration | Verified: `consent_given_at` + `consent_privacy_notice_version` exist on `jobseekers` and `employers` |
| 2026-10-20 | Owner | M2 confirmed deploy done; M3 checked, no key rotation needed | §9 updated; M4 steps sent |
| 2026-10-20 | Claude Code | Diagnosed Vercel Google sign-in DNS failure; set Google OAuth client ID/secret in gitignored `.env.local` at owner request (app code does not read them; Supabase provider uses them) | Root cause: Vercel env points to old Supabase project `tsvioxrlmcsqdricdgkd`. Added M5. Owner declined rotating the client secret that was pasted in chat |
| 2026-10-20 | Owner | M5 done (Vercel env fixed); Google sign-in now reaches `/jobseeker/dashboard` on `gensanworks.vercel.app` | Dashboard then crashed: `Cannot read properties of undefined (reading 'bg')` |
| 2026-10-20 | Claude Code | Fixed dashboard crash + added custom error pages | `job-seeking-status-toggle.tsx`: null/unknown `job_seeking_status` falls back to `not_looking` (live DB column apparently allows NULL). New `app/components/error-details-panel.tsx` ("Are you the developer? Show technical details": message, digest, path, time, copy; stack only outside production). `app/error.tsx` + `app/global-error.tsx` show a friendly message, with raw error only in the panel. New `app/not-found.tsx` (404). `tsc --noEmit` ✅, eslint on changed files ✅, unit tests not run. Uncommitted |
| 2026-10-20 | Claude Code | Committed + pushed the dashboard fix and error pages (owner approved) | `36846c7` pushed to `origin/main`. `npm test`: 274 tests, 190 pass, 4 fail, 80 skipped. Failures pre-existing and unrelated: 3 suites can't load (test runner lacks Supabase env vars: groq-model-config, matching-narrative-rbac, referrals-notifications-fixes); `security.test.ts` expects global `/:path*` headers in `next.config.ts`. Other sessions' uncommitted files left untouched |
| 2026-10-20 | Owner + Claude Code | M4 verification query | D3 pass; D4 likely pass. Root cause of dashboard crash corrected: the stored value was `'active'` (invalid), not NULL. Added M6 |
| 2026-10-20 | Owner | M4 D5 + D6 | D5 ✅ no Google button on `/login/admin`; D6 ✅ jobseeker dashboard loads after `36846c7`. D4 decline-account identity still to be confirmed |
| 2026-10-20 | Claude Code | Fixed `/signup/admin-request` header showing the Jobseeker/Employer switcher | `app/signup/admin-request/page.tsx`: added `showPrimaryPortals={false}` + `showAdminPortalButton` (same as `/login/admin`). eslint ✅, tsc ✅. Uncommitted, awaiting owner approval to commit/push |
| 2026-10-20 | Claude Code | Committed + pushed admin-request switcher fix (owner approved) | `27c723b` on `origin/main`. M6 diagnose: no invalid job_seeking_status values remain; column default still unknown |
| 2026-10-20 | Owner + Claude Code | M6: column default check | Default `'not_looking'::text`, nullable YES. Source of 'active' is not in the repo; next step is inspecting the live `handle_new_user()` definition. NOT NULL + CHECK constraint deferred to the canonical baseline migration (approval needed) |
| 2026-10-20 | Owner + Claude Code | M6: live `handle_new_user()` inspected | Live trigger matches the repo port: inserts jobseekers (id, email, first/last name, password_hash) and **never sets job_seeking_status**, so not the source. No app code writes 'active' (only `'actively_looking'` at `app/api/jobseeker/profile/route.ts:208`; status API is enum-validated). Likely explanation: owner already ran M6 step 2 (old default was 'active'); otherwise another trigger on `jobseekers`. Live trigger still creates a profile for OAuth users before consent; Option C still needed |
| 2026-10-20 | Owner | Confirmed M6 step 2 was run earlier; confirmed `tycoonjamesflores@gmail.com` was the D4 decline test | M4 ✅ and M6 ✅ |
| 2026-10-20 | Claude Code | **Batch 1: 13Z chain merged with `main`** (owner: "run it") | Worktree changes committed as `705694b` on `migration/draft-core-a-baseline-v1`, then `main` merged in. 9 conflicts. Consent duplicates (validation-schemas, signup page, 13Z-V test) and login pages took `main` (jobseeker-only Google). `api-handler` and `/api/auth/me` took 13Z-O/P. Middleware = consent gate before 13Z-S role gating. Callback hand-merged: strict exactly-one-active decision for email; Google is jobseeker-only via the consent gate. Layout `image` casts reverted to 13Z-O typing. 13Z-S test section C updated to the 2026-10-20 Google decision. code-reviewer subagent found 3 issues, all fixed: (1) consent accept could reactivate admin/deletion-deactivated accounts; this hole also existed on `main` in production; (2) callback admitted employers via Google; (3) decline-then-accept on an already-inactive account. Fix: decline marker `app_metadata.consent_declined_at`, written only when decline deactivates an active row (`deactivateActiveJobseeker`); accept reactivates only with the marker. Validation: `tsc` ✅, `next build` ✅, eslint ✅, tests 453 pass / 2 fail (pre-existing: security headers; `proposed-canonical-baseline.sql` untracked) with standalone tsconfig + placeholder env + NODE_ENV=test. Users who declined before this change have no marker and must be reactivated by an admin |
| 2026-10-20 | Claude Code | Pushed Batch 1 (owner approved) | 27c723b..466c998 pushed to origin/main; Vercel deploy and production checks pending |
| 2026-10-20 | Claude Code | Cleared ~104 pending changes (owner: do it automatically) | Ignored: .vs/, graphify-out/, Files/ (personal manuscripts). Moved one-off DB-writing scripts verify-dedupe.cjs / verify-fix-finalize.cjs to scratch/one-off-scripts/ (gitignored, not deleted). Committed + pushed 5 commits 960e6e9..e291d2b: hardcoded DB credentials removed from scripts and seed SQL; pilot narrative score-only fallback (constraint #5) + determinism/cascade tests; test-script module-mocks flag + supabase CLI ^2.119.0 (dev only); 13Z-I CRLF fix; schema baseline drafts; journal files. Tests 459 pass / 1 fail (pre-existing security headers); tsc ✅; next build ✅ |
| 2026-10-20 | Claude Code | **Batches 2–4** (owner: do the remaining tasks automatically) | B2a: `npm test` works with no setup (`tests/test-env.ts` placeholders + standalone tsconfig); outdated security-headers test fixed (config uses `/:path((?!_next/static).*)`). B2b: Option C migration `20261020120000_...sql` + `tests/option-c-migration.test.ts`. B2c: 13Z-W `e2e/consent-gate.spec.ts`, 7/7 pass against production (non-mutating). B2d: profile-access-v1 migration + 13Z-I guard updated. B3a: SO5 skills demand vs supply in LMI API + chart + CSV (`app/lib/lmi-skills.ts`, `tests/lmi-skills.test.ts`). B3b: `POST /api/admin/account-deletion/anonymize` + `app/lib/account-anonymization.ts` + tests; code-reviewer found 7 issues across 2 rounds (metadata not cleared, partial failure not retried, single request row, stale request, starvation, oldest-request-decides, timestamp assumption), all fixed. B4: evidence saved to `docs/testing-evidence/` (unit 490 pass / 0 fail, coverage 71.79% lines, tsc ✅, next build ✅, e2e 7/7). Migrations NOT applied |
| 2026-10-20 | Owner + Claude Code | M7: applied Option C to production | First attempt ran only the IF snippet (syntax error, nothing changed; my instructions showed only the diff). Owner then ran the full CREATE OR REPLACE FUNCTION; verified with pg_get_functiondef |
| 2026-10-20 | Claude Code | M8 step 1 via Supabase connection (owner: do it automatically), read-only queries only | RLS enabled on admins/employers/jobseekers (owner postgres, not forced); anon + authenticated hold full table grants; no column ACLs; handle_new_user owned by postgres, SECURITY DEFINER. Migration column lists reconciled to live columns; 13Z-I test now checks them against a live snapshot. No writes made |
| 2026-10-20 | Claude Code | M8 step 2: applied profile-access-v1 to production (owner approved) | Single transaction, no errors. Grants/policies verified; public API probe 401 on GET/PATCH for admins/employers/jobseekers; e2e 13Z-W 7/7 on production; /api/summary 200. Found an unrelated pre-existing bug: /api/summary totalApplicants counts the retired `users` table (homepage shows 0) |
| 2026-10-20 | Claude Code | M10 attempt: consent Accept showed "Unable to save your choice" | Root cause from Postgres logs: `jobseekers_email_key` unique violation (4x, 12:26 UTC). Orphan profile cad9e78d (tyctyke@gmail.com, consented 2026-10-19) has no auth user (auth user was deleted for retesting); the new Google auth user 6f336367 has no profile (Option C), so the accept insert collided on email. Orphan has 0 related rows. Not caused by RLS. Fixed in `ff21ab6`: duplicate email now returns a clear 409 (never auto-links); consent checkboxes were invisible on 4 pages (flex shrink to 0 width, now `shrink-0` + `accent-sky-600`); consent page shows the checkbox below Accept/Decline. Tests 491 pass; build ✅. Orphan cleanup awaits owner approval |
| 2026-10-20 | Claude Code | Checkbox still invisible on /auth/consent after `ff21ab6` (owner screenshot) | Live /signup renders the box correctly in a clean Chromium (16x16, visible), so the `shrink-0` fix works; the owner's Brave showed the label text flush-left with no gap, i.e. the input was not laid out at all. Cause confirmed by owner 2026-10-20: the checkbox appears once the blocker is off (Brave Shields), so a content blocker hides elements whose id contains "consent". Fix (uncommitted at time of writing): neutral DOM id `privacy-ack` / `privacy-ack-error` on all 4 pages; form/schema key `consentAccepted` unchanged; guard test forbids consent/cookie in ids. Tests 494 pass, tsc ✅, build ✅ |
| 2026-10-20 | Claude Code | M10 A1: owner signed in as jobseeker and was sent back to /login?role=jobseeker. Investigated (read-only: Supabase logs + SQL) | Not caused by RLS: simulated authenticated own-row reads (id,is_active) return the row; cross-table lookups return 0. Findings: (1) `auth.users` has only 2 accounts: admin@gensanworks.com (email, last sign-in 2026-08-28) and the Google test user tyctyke@gmail.com; **no seeded jobseeker/employer/admin profile has a login** (seeded profile rows were never given Auth users), so email logins A1-A3 cannot succeed with seeded data. (2) admin@gensanworks.com auth id 1ae2db26 != admins.id 0cf1648a: no admins row for that login, so 13Z strict role check sends it back to /login/admin (the older metadata-role fallback that masked this was removed in 13Z-S). (3) No password login reached Supabase Auth today; only Google logins. (4) Orphan jobseekers row cad9e78d is gone (deleted by owner or other session; not by Claude). (5) Postgres log: `column notifications.read_at does not exist` at 13:12 UTC (existing bug) |
| 2026-10-20 | Owner + Claude Code | M10 check B (Google, fresh account, Accept) | ✅ PASS, verified by Claude Code via read-only SQL: Google user (msugensan.edu.ph) signed in 13:24:13 UTC; jobseekers row exists, is_active=true, consent_given_at set, job_seeking_status=not_looking (correct default); profile did not exist before Accept (Option C confirmed end to end). Two other Google auth users (13:22-13:23) have no profile yet |
| 2026-10-20 | Claude Code | M13 attempt: jobseeker signup for tycoonjamesflores@gmail.com failed with "Database conflict: Unique constraint violated"; M10 check C status | Cause (read-only SQL): orphan profile row e1cf9130 (tycoonjamesflores@gmail.com, created 2026-08-07, is_active=false, no consent, no Auth user, 0 related rows in 14 child tables) still holds the unique email (`jobseekers_email_key`) after the owner removed the Auth user. Same class as cad9e78d. Check C NOT yet verified: Google test user c51987d9 signed in once (13:27:44 UTC), has no profile and no decline marker, so decline-then-accept is unfinished or unobserved |
| 2026-10-20 | Claude Code | Owner asked to delete all Supabase accounts and dummy data; chose the widest scope (every login incl. admin + all data) | Inventory (read-only): auth.users 3, jobseekers 122 (119 @example.com) + children, employers 21, jobs 100, admins 1, landing_metrics 3, storage 0; no non-CASCADE FKs block deletion; seed files exist (`seed_generated.sql`: 118 jobseekers/99 jobs/30 employers, approximate copy). The destructive DO-block was **declined at the tool confirmation prompt; nothing was deleted** (verified: counts unchanged). Awaiting owner direction. Note: `scripts/seed-admin.ts` is for the retired NextAuth model and cannot recreate an admin under Supabase Auth |
| 2026-10-20 | Claude Code | Owner chose "wipe all data except the admin"; Claude Code attempted it, the Supabase execute_sql call was denied by the auto-mode safety classifier | Nothing deleted by Claude Code; no workaround attempted. SQL handed to the owner as M15 (run in the Supabase SQL editor). Scope: delete all jobs, employers, jobseekers (children cascade), landing_metrics and every auth user except admin@gensanworks.com; keep that login and the admins row |
| 2026-10-20 | Owner + Claude Code | M12: admin login fix (owner: "fix admin") | UPDATE public.admins SET id='1ae2db26…' (guarded, 1 row) succeeded; admins.id now matches auth.users id for admin@gensanworks.com; role-resolution simulation: admins 1 row, employers 0, jobseekers 0. Wipe (M15) still pending the owner |
| 2026-10-21 | Owner + Claude Code | M10 re-run after the wipe; results verified by read-only SQL | A1 email jobseeker ✅ (active, consent + version); B Google jobseeker (msugensan) ✅ (profile only after consent, app_metadata consent_version set); C Google decline (tycoonbank) ✅ (no profile, no marker: decline before any profile creates nothing, as designed with Option C); A2 email employer ✅ (active, consent, account_status pending); A3 admin login not yet tried. Owner requested Google sign-in for employers (changes the 2026-10-20 jobseeker-only decision; plan sent for approval) |
| 2026-10-21 | Claude Code | Implemented Google sign-in for employers (uncommitted, awaiting owner approval to commit/push) | Files: `app/lib/google-consent.ts` (role-aware consent: getProfileRole incl. admin/conflict, insertEmployer pending, race re-check with self-undo, role cookie helpers; employer area routes to `/auth/consent?role=employer`), `app/api/auth/consent/route.ts`, `app/auth/callback/route.ts` (admits jobseeker|employer; never completes an admin session; clears cookie on all exits; reconsider keeps stored role), `app/auth/consent/page.tsx` (employer variant with establishment name), `app/login/page.tsx`, `app/signup/page.tsx`, `app/lib/validation-schemas.ts`, tests + e2e updated. code-reviewer: 5 findings fixed and re-verified; race cannot leave two profiles. Remaining: legacy `app/api/auth/callback/admin/route.ts` still grants admin to a Google user with an admin row (unlinked; deletion needs owner approval); low: concurrent same-role accepts show the email-in-use message. Validation: tests 506 pass / 0 fail, tsc ✅, eslint ✅, next build ✅ |
| 2026-10-21 | Claude Code | Committed + pushed employer Google sign-in and the neutral checkbox id (owner: "commit and push") | `e4708a0` on origin/main (no AI co-author trailer). Production check after Vercel deploy: owner Google employer signup test; e2e consent-gate re-run |
| 2026-10-21 | Owner + Claude Code | Production checks after `e4708a0` | Google employer signup ✅ verified by SQL: kuya.taikun@gmail.com employer "Taikun. Designs", account_status pending, consent on row + app_metadata, no jobseeker row. Brave checkbox ✅ (owner). Owner asked for a new admin account; Claude Code cannot create logins or set passwords, so M16 hands the owner the dashboard steps + linking SQL |
| 2026-10-21 | Owner + Claude Code | M16 + M10 A3: new admin account | Owner created the login and linked it; verified by SQL: 2 admins rows (admin@gensanworks.com kept, never signed in since 2026-08-28; new owner admin signed in 17:34 UTC), each with exactly one role profile. **M10 complete: A1 ✅ A2 ✅ A3 ✅ B ✅ C ✅ D ✅** |
| 2026-10-21 | Claude Code | Owner: Employer Approvals page shows 0 while dashboard shows pending; requested a full-system scan (council plan) | Read-only live schema snapshot saved for agents (scratchpad live-schema-2026-10-21.md). 4 specialist scanners launched in parallel (backend/API, frontend/links, database/RLS, security/privacy), then council-synthesizer. Found immediately: **CRITICAL** — job_match_scores, ai_matching_logs, dead_letter_queue, skill_synonyms, skill_embeddings_cache have `ALL TO public USING (true) WITH CHECK (true)` + full anon grants, so the public anon key can read/write/delete AI matching data (tables currently empty). Fix needs an RLS migration (owner approval) |
| 2026-10-21 | Claude Code | System scan, round 1 result | All 4 scanners hit their turn limits; the session ended before 3 of them saved. Saved: backend report (38 findings, partial). **Employer Approvals = 0 root cause:** `app/api/admin/employers/route.ts:34` filters on non-existent column `is_archived`; the error is unchecked, so it returns a silent empty 200. The dashboard uses a different, valid query. Major classes: retired `users` table, `applications.applicant_id` (live: jobseeker_id), `jobs.status` (live: job_status), `notifications/messages.read_at`, admin_access_requests phone/organization/notes, employers srs_*/is_archived; apply flow checks job_status === "Open" while approval sets "active", so apply always fails. Round 2: 3 narrower scanners (remaining API folders, frontend, security) relaunched with incremental file writes |
| 2026-10-21 | Claude Code | Consolidated system scan into `docs/system-scan-2026-10-21.md` (council plan) | ~82 findings (17 critical, 30 high). Round-2 agents stopped at the usage limit; uncovered areas listed in §9. Live-exploitable today: SEC-5 message .or() injection (any signed-in user can delete all messages), referrals GET/POST/DELETE without role checks (bulk PII + destruction), unauthenticated /api/matching/[jobId], jobseeker self-shortlisting via /api/matching/feedback, public/profile employer scraping, public Cache-Control on admin analytics, password_hash in responses, anon-writable AI tables. Core flows broken by schema drift: employer approvals, apply, applicant pipeline, notifications/messages, access requests, referrals, matching (empty vacancy, unconsented candidates). 7 fix batches proposed; awaiting owner approval |
| 2026-10-21 | Owner | "do all automatically" | Approves all 7 batches with the proposed defaults (canonical status sets, archive via is_active, sent-to-employer via audit_logs, delete dead routes). File deletion is blocked by the permission settings, so dead routes are neutralized rather than deleted |
| 2026-10-21 | Claude Code | **Batch 1 (security)** | Fixed: SEC-5 .or() injection (UUID validation + sanitizeSearchTerm everywhere); referrals GET scoped by role, POST admin-only (body employerId ignored), PATCH admin or owning employer (+ remarks/applicant_id drift, audit log), DELETE admin-only soft withdraw; /api/matching/[jobId] admin-only; matching feedback admin or owning employer + zod; public profile relationship-gated for approved employers, no disability data to employers, live columns; employer outcomes ownership; system-alerts forbidden check; admin analytics Cache-Control private no-store; password_hash stripped (omitSecrets); profile GET auto-provisioning removed (consent bypass); NSRP id crypto + uniqueness; employer cannot self-publish (employerOwnJobStatusSchema, live job_status columns) + archive button fixed; public slip masked for anonymous + rate limit + qr_code_url; 10-char random slip numbers; retired admin Google callback signs out. Tests 518 pass / 0 fail incl. new tests/security-batch1.test.ts (17); tsc ✅; next build ✅ |
| 2026-10-21 | Claude Code | **Batch 2 (DB security)** | Migration file `20261021120000_lock_down_ai_tables_and_functions.sql` + static test. Verified no browser code uses the five AI tables (service-role only). Not applied: Supabase connection is disconnected and pilot rule #8 applies; owner action M17. Broader anon grant revocation on other tables deferred until browser-side reads are fully inventoried |
| 2026-10-21 | Claude Code | Added "Automatic execution" + "Hard-denied destructive operations" sections to `CLAUDE.md` from the owner's pasted policy | Docs only; no code changed. Not committed |
| 2026-10-21 | Claude Code | Rewrote the `permissions` block of `.claude/settings.json` (backup: `.claude/settings.json.before-permissions-2026-10-21.backup.json`) | JSON valid; hooks byte-identical (checked). File is not tracked by git. Not committed |
| 2026-10-21 | Claude Code | **Batch 3 (core flows, schema drift)** | Employer Approvals now lists `is_active=true` employers (root fix for the owner's "0" report); page fetches once with status=all. Archive / archived list / batch-approve / create / status cascade use live columns (is_active, account_status, verified_at, job_status). SRS review uses account_status + verified_at; history in audit_logs with a checked insert and partial-progress reporting. Apply flow: requires job_status "active", writes jobseeker_id, cover letter/resume go into the first message; 23505 → "already applied". Applicant pipeline (employer job applications, status, message, jobseeker application detail) on live columns; employer embed no longer leaks password_hash. Notifications/messages: read_at removed (read + is_read); new bulk `PATCH /api/messages/read`. Access requests: phone/organization/notes packed into `reason`; review writes reviewed_by + audit log. Referrals: duplicate open referral → 409, slip insert checked, referral linked to its application. Matching: vacancy built from live job columns (`vacancy-from-job.ts`), candidates filtered to active + consented + not "not_looking", bias_flags removed from the upsert, RPC errors thrown, "sent to employer" via audit_logs (`report-sent.ts`); employer sees rankings only after the report is sent. Admin "send notification" now calls `POST /api/notifications`. Old tests 13G, 13Z-D, 13Z-F updated to the live schema; new `tests/core-flows-batch3.test.ts`. Validation: tsc ✅, tests 542 pass / 0 fail, next build ✅ |
| 2026-10-21 | Claude Code | Committed + pushed Batches 2–3 | `6fa8b38` on origin/main (CLAUDE.md excluded, no AI co-author trailer) |
| 2026-10-22 | Claude Code | **Batch 4 (status vocabulary + reports + retired `users` table)** | New `app/lib/referral-status.ts`: stored values referred/interview/hired/rejected/withdrawn, UI labels Pending/For Interview/Hired/Rejected/Withdrawn, readers accept legacy spellings. Referral writers store canonical values (the status PATCH previously wrote "Hired"). Label-based `.eq("status","Hired")` filters replaced in placement-stats, DOLE, PES, summary, testimonials; LMI/hiring-rate/summary/referral analytics count by label. Reports: placements dated by the hire transition (updated_at), exclusive end dates (`report-dates.ts`), month/quarter windows no longer drop the last day, unchecked count/lookup errors now return 500. `users` table removed from admin/users (rewritten over jobseekers+employers+admins, search sanitized), analytics/export, DOLE, masterlist, summary exports, applicants export (explicit non-sensitive columns), charts, public/impact (avg salary now from live job salary ranges), /api/summary (counts jobseekers). Unused broken routes job-seeker-alerts, dashboard/activity, geographic, overview now answer 410 (`retired-route.ts`). Dashboard health probes now check errors and probe existing tables; backup time shows "not tracked" instead of a fake timestamp. Validation: tsc ✅, tests 560 pass / 0 fail (new `tests/status-reports-batch4.test.ts`; 13J updated), next build ✅ |
| 2026-10-22 | Claude Code | Committed + pushed Batch 4 | `f23d3de` on origin/main |
| 2026-10-22 | Claude Code | **Batch 5 (privacy features)** | Account deletion: cancel no longer writes the missing `cancelled_at`; status/audit feed/activities derive cancellation time from `updated_at` of a cancelled row. Account-data export rewritten on live columns (jobseeker child tables + referral slips included, credentials stripped, every section's error checked). Lifecycle tokens use live `auth_lifecycle_tokens` columns (type/used_at; single-use conditional update); email verification state read/written in Supabase Auth (`email_confirmed_at`) since `account_email_verifications` does not exist (reset-password confirm stays disabled per 13O). Referral slips: live job/jobseeker columns (age from birth_date, address from house_number/barangay/city/province, education from jobseeker_education, industry_code in place of psoc_code); insert no longer writes missing `pdf_url`; PATCH writes only qr_code_url and notifies the job's own employer (body employerId ignored). Bias audit: suitability_score/birth_date/city aliases (both queries); education dimension reads "unknown" (no column). Admin applicant DELETE: no hard delete; stage-1 deactivation + processed deletion request + `user_delete` audit, so stage-2 anonymization applies after retention. Validation: tsc ✅, tests 573 pass / 0 fail (new `tests/privacy-batch5.test.ts`; 13O updated), next build ✅ |
| 2026-10-22 | Claude Code | Committed + pushed Batch 5 | `ddfb75e` on origin/main |
| 2026-10-22 | Claude Code | **Batch 6 (frontend links + navigation)** | FE-1 footer Admin Portal → /login/admin; FE-2 employer matching back link → /employer/jobs/[id]/applications; FE-3 "View Establishment Profile" (404) removed; FE-11 admin layout redirects straight to /login/admin; admin match list label "De-identified" (false: name/email shown) → "Job-relevant factors only"; FE-8 new `app/admin/mobile-header.tsx` gives admins the sidebar drawer below lg; FE-9/10 nav entries for Access Requests (with pending badge key) and Users (admin), Saved Jobs and Referrals (jobseeker), "View Matches" on employer job rows. FE-13/14/15/7 were fixed in earlier batches. Not done (file deletion blocked / needs owner decision): duplicate admin pages (audit vs audit-logs, three archived-jobs variants, diagram placeholders) and the unused `app/admin/dashboard/_lib/mock-data.ts`. Validation: tsc ✅, tests 580 pass / 0 fail (new `tests/navigation-batch6.test.ts`), next build ✅; eslint on touched files shows only pre-existing `no-explicit-any` errors |
| 2026-10-22 | Claude Code | Committed + pushed Batch 6 | `66d4f9a` on origin/main |
| 2026-10-22 | Claude Code | **Batch 7 (uncovered areas, scan doc §9)** | Method: static schema-drift checker (scratchpad `drift-check.cjs`) comparing every `.from(table)` chain's select/filter/write columns in app/ against the live schema snapshot, plus manual review of uploads, `.or()` sites and profile updates. Fixed: **job detail `/api/jobs/[id]` always 404'd** (selected missing psoc_code/featured/slots_remaining) — now live columns, unpublished jobs visible only to owner/admin, employer contact details only to signed-in users (anonymous visitors previously got email/phone); **matching determinism**: Stage 2.5 Groq skill-spelling correction rewrote scoring inputs on every run — now off unless `MATCHING_AI_SKILL_CORRECTION_ENABLED=true` (pilot constraint 1), and the agent builds its vacancy with `vacancyFromJob` (multi-skill postings split); health/summary probes used the missing `settings` table (health always "degraded" and leaked the DB error); license upload accepted any image/* incl. SVG with no size limit and a client-chosen extension; employer profile update failed on form fields without a column, logged the full payload, returned password_hash and raw DB errors; unsafe `.or()` on missing columns in db-helpers. Verified OK: other upload routes (type/size/rate checks), jobseeker/employer profile schemas (zod strips unknown keys; no protected fields), remaining `.or()` sites (UUID/sanitized). Left as-is (degrade gracefully, unused): /api/faqs, /api/partners, /api/notes, /api/experience, skill_correction_cache, jobseekers.profile_embedding write. Not run: e2e smoke (would hit the production database; needs owner go-ahead and synthetic accounts). Validation: tsc ✅, tests 589 pass / 0 fail (new `tests/uncovered-areas-batch7.test.ts`), next build ✅ |
| 2026-10-22 | Claude Code | Owner asked for every remaining task before manuscript editing | Read-only review of §6–§9, worktrees and tests. Verified: 13Z chain on `main`, determinism/cascade tests committed, worktree leftovers are junk files only. Next Steps rewritten as one A/B/C list. No code changed |
| 2026-10-22 | Claude Code | Demo data seed on production (owner request: 117 jobseekers, 23 Mindanao employers, 113 Mindanao jobs, no blank inputs) | Ran `docs/seed/demo-mindanao-seed.sql` via the Supabase connection as one transaction. Result: 23 employers (approved, real Mindanao organization names, all contacts/TINs/documents fictional), 113 active jobs, 117 jobseekers (114 matching-eligible) with 204 education, 172 experience, 380 language, 117 license and 168 training rows. Blank check: 0 empty columns except suffix (people without one), last_login (no logins exist) and jobs.rejection_reason (only for rejected postings). Emails `@demo.gensanworks.test`, phones `0900…`; no auth accounts created. Cleanup: `docs/seed/demo-mindanao-cleanup.sql`. Also fixed matching ignoring checkbox skills saved as strings (`deidentify.ts`, new `tests/deidentify-string-skills.test.ts`). Tests 591 pass / 0 fail, tsc ✅. Not committed |
| 2026-10-22 | Claude Code | Reviewed first matching run on seeded data (owner log paste) | Fish Processor @ General Tuna: 114 scored, top 2 are fish processors (97.8/97.6), fish/food occupations average highest (78.6) but unrelated occupations still average 56–69 (weak separation; calibration item for later, scoring unchanged). Fixed: removed the per-run profile key dump and per-candidate name logging in HybridEngine (PII in logs), Others placeholder no longer sent for embedding and typed skills included; missing system_observability_logs table now warns once instead of erroring every run; Groq 401/403 no longer retried (goes straight to the fallback model). Owner action: primary model openai/gpt-oss-20b returns 403 (key/org model access). Tests 591 pass, tsc ✅. Not committed |
| 2026-10-22 | Claude Code | Verified M17 on production (read-only) | 0 policies, 0 anon/authenticated grants on the AI tables; matching still ran afterwards (owner log). §9 M17 marked done |
| 2026-10-22 | Claude Code (implementation-lead) | **UI cleanup P0, Steps 1–2** on branch `ui-cleanup` (uncommitted) | Step 1: `tests/ui-hygiene.test.ts` ratchet (15 patterns over app/**/*.tsx, baselines = 2026-10-22 counts), `e2e/fixtures/no-native-dialog.ts`, `e2e/ui-baseline.spec.ts` (public pages, not run), employer e2e class selectors → `data-testid` (`employer-job-item`, `employer-application-item`). Step 2: navy tokens + status tokens, font weights 400/500/700, unused AI CSS utilities removed, Button `loading`, dialog overlay without blur + 28px close target, AlertDialog rebuilt (role=alertdialog, outside-click blocked), new ConfirmDialogProvider/useConfirm (mounted in providers), skeletons, EmptyState, ErrorState, StatCard, StatusBadge, PageHeader, badge status variants, `formatCount`/`formatPeso`. tsc ✅, tests 624 pass / 0 fail, build ✅, lint: pre-existing errors only |
| 2026-10-22 | Claude Code (implementation-lead) | UI cleanup Steps 1–2: review fixes (code, a11y, QA, security reviewers) | ConfirmDialog returns focus to the opener, refocuses Cancel per request, cancels on route change; Button `loading` uses aria-disabled (keeps focus) instead of `disabled`; destructive hovers ≥4.5:1; `--input` 215 16% 56% (3.4:1) and Input/Select use `border-input`; ratchet is exact-match, scans .ts+.tsx, adds fontHeavy/fontLight/windowAlert/windowPrompt and side radii; screenshots go to gitignored `ui-evidence/<label>/`; stale employer job e2e marked `test.fixme` (rewrite in Step 5); heading levels, sr-only spacing, -0 formatting, skeleton aria-busy removed. tsc ✅, tests 633 pass / 0 fail, build ✅. "Before" screenshots not captured (need a7648e6 worktree, owner approval) |

## 5. Known Issues / Deferred Items

- Admin MFA not implemented — must be done/documented before any real-data pilot.
- Account deletion two-stage policy (deactivate → anonymize after retention) — implementation status [UNKNOWN].
- Option C for Google OAuth (no profile row before consent) — deferred follow-up.
- RLS consolidation — must be delivered as migration files + synthetic tests for human review only.
- `.github/copilot-instructions.md` stack description (NextAuth/Drizzle) is outdated.
- `pages/api/socketio.ts` unsuitable on Vercel — do not rely on it.
- **(added 2026-10-20)** Most of the 13Z hardening exists only in the `scratch/draft-core-a-baseline-v1` worktree, uncommitted. `main` has no `app/lib/profile-role.ts` and none of the 13Z-C…S tests.
- **(added 2026-10-20)** `app/api/auth/callback/admin/route.ts` still exists on `main` and records admin access requests "Submitted via Google OAuth sign-in". The admin Google button was removed in `c75b99e`, but this route is still live ("admin Google path fix").
- **(added 2026-10-20)** `handle_new_user()` / `on_auth_user_created` trigger still creates profiles for every new auth user, including OAuth users (`docs/schema/baseline-decision-record.md` §D.1). Option C needs a trigger change, shipped only as a migration file.
- **(added 2026-10-20)** `gensanworks-audit.md` §16.8 reports a Supabase service-role key embedded in seed SQL. Current status and whether the key was rotated: [UNKNOWN — needs owner input].
- **(added 2026-10-20)** SO5 needs a "top required skills" LMI visualization. `app/api/admin/reports/lmi/route.ts` aggregates sector and placements but no skills; skills-demand views exist only on the admin dashboard and homepage. Whether these satisfy SO5: [UNKNOWN].
- **(added 2026-10-20)** Homepage hero links to `/jobs` (`app/components/homepage/hero-section.tsx:247`), but no `app/jobs` route exists, so it 404s.
- **(added 2026-10-20)** Live `jobseekers.job_seeking_status` likely allows NULL (the canonical baseline wants `NOT NULL DEFAULT 'not_looking'`). UI now tolerates it; schema fix belongs to the baseline migration.
- **(added 2026-10-20)** Manuscript "should-have" features, outside SO1–SO7: advanced multi-skill vacancy parsing, full DOLE-compliant report generation, complete match-disparity bias monitoring. All partial.
- **(added 2026-10-20)** Supabase security advisor (2026-10-20): ERROR view `public.employer_feedback_summary` is SECURITY DEFINER; WARN `handle_new_user()` and `rls_auto_enable()` are executable by anon/authenticated via RPC (revoke EXECUTE); WARN mutable search_path on `upsert_job_match_scores`, `compute_job_percentiles`; WARN leaked-password protection disabled (Auth setting); INFO 11 tables have RLS with no policies (deny-all to clients, intended since the server uses service_role).
- **(added 2026-10-21)** Legacy `app/api/auth/callback/admin/route.ts` still redirects a Google user with an active admins row to /admin/dashboard. Not linked from the UI; reachable only if Supabase's redirect allow-list includes it. Recommend removing (owner approval).
- **(added 2026-10-21) CRITICAL:** anon-writable AI matching tables (job_match_scores, ai_matching_logs, dead_letter_queue, skill_synonyms, skill_embeddings_cache): policy `ALL TO public USING (true)` + full anon grants. Fix: drop those policies (server uses service_role, which bypasses RLS) and revoke anon/authenticated grants; migration + owner approval.
- **(added 2026-10-20)** `notifications.read_at` column missing in the live database (Postgres log 13:12 UTC); notifications read/unread queries fail.
- **(added 2026-10-20)** `app/api/summary/route.ts:62-63` counts the retired `users` table for totalApplicants, so the homepage shows 0 applicants; should count `jobseekers` (13F).
- **(added 2026-10-20)** Live gap until M8 is applied: `jobseekers_own_update` + table UPDATE grant let a signed-in jobseeker change any column of their own row via the public API (including `is_active` and consent fields). **Closed 2026-10-20 by M8.**

## 6. Next Steps (always current — rewrite, don't append)

Consolidated pre-manuscript list (2026-10-22). Scan batches 1–7 are done. §7/§8 are partly stale: the 13Z chain is on `main` (branch has 0 commits not on main), the determinism/cascade tests are committed, Option C, profile-access-v1 and the consent e2e are done.

**A. Owner actions**
1. ✅ M17 applied (verified 2026-10-22).
2. After the Vercel deploy, click through production: employer approval, post + approve a job, apply, move an applicant, refer, matching + send report, notifications/messages, Users page, reports.
3. M9: choose the retention period and set `ACCOUNT_ANONYMIZATION_RETENTION_DAYS`.
4. Decide: delete the duplicate admin pages + unused mock-data.ts; remove the stale worktrees (scratch/*, .kilo).
5. Decide: where synthetic demo/pilot data lives (production `dkpzieytlqkbhhpqpvyr` or a separate synthetic project; pilot constraint #2).
6. Supabase Auth: enable leaked-password protection (advisor WARN).
7. Decide: admin MFA implemented now (Supabase TOTP) or documented as a prerequisite before real data (constraint #7).

**B. Engineering (agent, after A1–A2)**
8. ✅ Demo seed done 2026-10-22 (117 jobseekers, 23 employers, 113 jobs). Still optional: seeded applications/referrals for pipeline and placement charts.
9. Playwright e2e run against the deployed app with synthetic accounts; save output to `docs/testing-evidence/`.
10. Refresh test evidence: unit suite (589 pass) + coverage (last 71.79% vs 80% target), saved to `docs/testing-evidence/`.
11. Admin MFA (if chosen in A7).
12. Docs refresh: README + `.github/copilot-instructions.md` stack, handoff/system manual, Appendix C claim check against the fixed system.
12a. UI cleanup P0 (branch `ui-cleanup`): Steps 1–2 done and awaiting commit approval; Steps 3–6 next. Lower `tests/ui-hygiene.test.ts` baselines as counts drop (ratchet is exact-match; failing messages say which baseline to lower).
13. Optional / scale: report pagination (PostgREST 1000-row cap); full DOLE-compliant report generation and match-disparity monitoring stay "partial" (should-haves).

**C. Pilot readiness (needed for Ch. 4–5, not for Ch. 1–3 edits)**
14. Onboarding package: demo accounts, role manuals, walkthroughs.
15. Final privacy-notice text (placeholder version id today).
16. Pilot task protocol + TAM instrument approved by adviser/PESO; then the pilot (n≈50) and results.

---

## 7. Master Phase Plan & Completion Status

_Status: **Confirmed by owner 2026-10-20** — no missing phases or features._

**Sources and method**
- **Capstone scope (authoritative):** Specific Objectives SO1–SO7 in `Files/Revised 5.docx` §1.2.2 (2026-10-02), plus its should-have list and its Limitations section.
- **Engineering breakdown (authoritative):** Phase 0–9 roadmap with exit criteria in `.github/copilot-instructions.md` §II (2026-03-29). Its status flags are stale. `README.md` "Implementation Phases" (0–7) is an earlier, coarser version of the same plan.
- **Added by inference** (no formal source): Phase R (research/manuscript), Phase M (AI matching, SO3), Phase Z (13Z authorization chain), Phase P (pilot evaluation, SO7). These come from the manuscript, commit history and worktree contents.
- **Evidence used:** file existence on `main`, git log, worktree status, test file names, docs. **No tests were run.** "✅" means implemented and committed; it does **not** mean tests currently pass. Recorded pass evidence exists only for the matching suite (35/35, `docs/testing-evidence/full-matching-test-suite-output.txt`) and narrative RBAC (`docs/testing-evidence/rbac-narrative-api-test-output.txt`).
- **Completion %** values are rough judgment estimates from item counts, not measurements.

Legend: ✅ Done · 🔄 In Progress · ⬜ Not Started · ❓ Unknown / needs owner input

### Objective → Phase traceability

| Objective | Summary | Phase(s) | Status |
|---|---|---|---|
| SO1 | Jobseeker registration with semantic skill tagging; ≥90% complete AI-compatible profiles | 3, M | 🔄 Module built; ≥90% measured only during pilot |
| SO2 | Employer vacancy management, applicant pipeline, admin-generated ranked shortlists; baseline-vs-pilot timing comparison | 4, P | 🔄 Module built; comparison is pilot work |
| SO3 | Two-stage matching (deterministic score + LLM explanation), validated on determinism, constraints, protected-attribute invariance, zero critical hallucinations | M | 🔄 Validated (35 tests); pilot determinism and cascade changes uncommitted |
| SO4 | Real-time comms + referral tracking: notifications, QR referral slips, employer feedback; 100% traceability | 5 | ✅ Built / ❓ 100% traceability is a pilot measure |
| SO5 | LMI dashboards: ≥3 visualizations (sectoral vacancy demand, top required skills, placement outcome rates) | 6 | 🔄 Sector + placement present; skills viz location ❓ |
| SO6 | Admin dashboard + RBAC across 3 roles, moderation, KPIs, DOLE-aligned reports; verified RBAC testing | 2, 6, Z | 🔄 Built; RBAC hardening (13Z) not merged to `main` |
| SO7 | TAM evaluation (n≈50; PU/PEOU ≥4.00) | P | ⬜ Pilot not conducted |

### Phase R — Research, Requirements & Manuscript (inferred) — ~85%
| Item | Status | Evidence |
|---|---|---|
| Problem validation with PESO (P1–P5, key-informant consultation) | ✅ | Manuscript Ch. 1; `Files/consultation-5.9.2026 (1).docx` |
| Chapters 1–3 (objectives, RRL, methodology, ERD, DFD, activity diagrams) | ✅ | `Files/Revised 5.docx` |
| Panel-review edits to Ch. 1–3 | 🔄 | `Files/Manuscript Revision 3.md` lists open edits (Edit 1-01 …) |
| Appendix C testing evidence / claim verification | ✅ | `docs/Capstone Paper/Artifacts/appendix_c_part1-4*.md` |
| Chapters 4–5 (results, conclusions) | ⬜ | Depends on pilot |

### Phase 0 — Foundation & Infrastructure — ~90%
| Item | Status | Evidence |
|---|---|---|
| Next.js + TypeScript project, scripts | ✅ | `package.json` |
| Supabase project + migrations folder | ✅ | `supabase/migrations/` (10 files) |
| Role route guards (middleware) | ✅ | `middleware.ts`, `app/lib/supabase-middleware.ts` |
| Canonical schema baseline (single consolidated schema) | 🔄 | `docs/schema/proposed-canonical-baseline.sql` + decision record (draft, not applied); `core-a-canonical-baseline-v1.sql` in worktree |
| Synthetic vs production Supabase project separation | ❓ | Pilot constraint #2 requires synthetic-only data, but owner chose production `dkpzieytlqkbhhpqpvyr` for shipping on 2026-10-20. Whether a separate synthetic project exists: [UNKNOWN — needs owner input] |

### Phase 1 — Authentication & Account Management — ~80%
| Item | Status | Evidence |
|---|---|---|
| Email/password login, role redirect | ✅ | `app/login/`, commits 2026-04-26 |
| Jobseeker / employer signup | ✅ | `app/api/auth/signup/*` |
| Consent-aware email signup (timestamp + notice version) | ✅ | `c75b99e`; `tests/signup-consent-requirement.test.ts`, `tests/task-13zv-signup-landing-consent.test.ts` |
| Google sign-in for jobseekers behind consent gate (Option B) | ✅ | `c75b99e`; `app/auth/consent/`, `app/api/auth/consent/`, `app/lib/google-consent.ts`, `tests/google-consent-gate.test.ts` |
| OAuth callback creates no profiles | ✅ | `c75b99e` (`app/auth/callback/route.ts`) |
| Option C — trigger skips OAuth users (no profile before consent) | ✅ | Applied to production 2026-10-20 (M7), verified via pg_get_functiondef; Google signup check pending (M10) |
| Admin Google path removed | 🔄 | Button removed from `/login/admin` (`c75b99e`); `app/api/auth/callback/admin/route.ts` still present |
| Email verification, password reset, change password | ✅ | `app/api/auth/verify-email`, `reset-password`, `change-password` |
| Admin access-request workflow | ✅ | `app/signup/admin-request`, `app/api/admin/access-requests`, `app/admin/access-requests` |
| Two-stage account deletion (deactivate → anonymize) | 🔄 | 2026-10-20: stage 2 route built + reviewed; disabled until retention period set (M9) |
| Rate limiting / request IDs on auth | ✅ | `app/lib/api-guardrails.ts`, `tests/api-guardrails.test.ts` |
| Admin MFA | ⬜ | Required before real-data pilot (constraint #7) |

### Phase 2 — Role Dashboards — ~90%
| Item | Status | Evidence |
|---|---|---|
| Jobseeker / employer / admin dashboards | ✅ | `app/*/dashboard`; `tests/phase-2-*.test.ts`, `tests/dashboard-data.test.ts` |
| Admin period filter + KPI sync | ✅ | `dfaa73f`, `e33d089` |
| Real-time metrics (polling/SSE) | ✅ | `app/lib/realtime-metrics.ts`, `app/api/admin/realtime-metrics` |
| Mobile responsiveness | 🔄 | `e2e/responsive-workflow.spec.ts` exists; pass status ❓ |

### Phase 3 — Jobseeker Portal & Applications (SO1) — ~85%
| Item | Status | Evidence |
|---|---|---|
| Job browse/search/detail | ✅ | `app/api/jobs`, `app/jobseeker/jobs`; `tests/phase-3-jobs.test.ts` |
| Apply + applications list | ✅ | `app/api/jobs/[id]/apply`, `app/jobseeker/applications`; `tests/phase-3-apply-auth.test.ts` |
| Profile wizard (NSRP fields, skills, education, experience) | ✅ | `app/jobseeker/profile/profile-wizard.tsx`, `9349e8e` |
| Resume / profile-image upload | ✅ | `app/api/upload/*` |
| Saved jobs, recommendations | ✅ | `app/jobseeker/saved-jobs`, `b78ef5a` |
| Profile completeness scoring + backfill (SO1 metric) | ✅ | `277bd28`, `20260828190000_add_matching_completeness_pct.sql` |
| ≥90% complete profiles (SO1 success criterion) | ⬜ | Pilot measure |
| Per-day application rate limit (10/day) | ❓ | Not verified |

### Phase 4 — Employer Portal (SO2) — ~85%
| Item | Status | Evidence |
|---|---|---|
| Job posting CRUD | ✅ | `app/api/employer/jobs`, `app/employer/jobs`; `tests/phase-4-employer.test.ts` |
| Applicant pipeline + status updates | ✅ | `app/api/employer/applications`, `6bf6f6e` |
| Employer profile wizard, SRS | ✅ | `app/employer/profile/employer-wizard.tsx`, `9349e8e` |
| Employer view of admin-generated ranked shortlists | ✅ | `app/employer/matching/[job_id]` |
| Employer approval / verification by PESO | ✅ | `app/admin/employer-approvals` |
| Employer summary analytics | ✅ | `app/api/employer/summary` |

### Phase 5 — Messaging, Notifications & Referrals (SO4) — ~85%
| Item | Status | Evidence |
|---|---|---|
| Messaging with threads | ✅ | `app/api/messages`, `c02afae`; `tests/phase-5-messaging.test.ts` |
| Notifications + SSE streams | ✅ | `app/api/notifications`, `.../stream`; `81c12aa`, `tests/referrals-notifications-fixes.test.ts` |
| Socket.IO not relied on (pilot constraint #6) | ✅ | SSE/polling path in use; `pages/api/socketio.ts` still present |
| Referral slips + QR + public verification page | ✅ | `3a648a7`; `app/referral/[slip-number]`, `app/api/public/referrals` |
| Referral status tracking (jobseeker-id fixes) | ✅ | `tests/task-13i-*`, `tests/task-13j-*` |
| Employer feedback collection | ✅ | `20260604020000_employer_feedback.sql` |
| Admin referral-slip applicant lookup (13Z-J1) | 🔄 | Worktree only (`app/api/admin/referral-slips/applicants/`, `list/`) |
| Email/SMS delivery channels | ❓ | `scripts/verify-delivery-channels.js` exists; production delivery status [UNKNOWN] |
| Push notifications (service worker) | ❓ | `public/sw.js` exists; no push route found |

### Phase M — AI-Assisted Matching (SO3) (inferred) — ~85%
| Item | Status | Evidence |
|---|---|---|
| Stage 1 deterministic scoring (5 dimensions, TF-IDF, PSOC, location, education) | ✅ | `app/lib/matching/scoring-engine.ts`; `ba3ca79`, `19b8e79` |
| Stage 2 LLM explanation with de-identification + grounding | ✅ | `app/lib/matching/agent.ts`, `deidentify.ts`; `tests/professor-fixes.test.ts` |
| Bias audit engine + admin audit UI | ✅ | `bee93da`; `app/lib/matching/__tests__/bias.test.ts`, `app/admin/audit` |
| Narrative API RBAC | ✅ | `c1c328a`; `tests/matching-narrative-rbac.test.ts`; evidence output in `docs/testing-evidence/` |
| Matching validation suite (35/35) | ✅ | `docs/testing-evidence/full-matching-test-suite-output.txt`; Appendix C part 2 |
| Pilot determinism: Groq role-equivalence off by default (constraint #1) | 🔄 | Untracked `tests/matching-stage1-determinism-pilot.test.ts` (another session) |
| Narrative cascade Groq-only → score-only (constraint #5) | 🔄 | Untracked `tests/matching-narrative-pilot-cascade.test.ts`; `ExplanationService.ts` modified, uncommitted |
| UUID / education query contracts | 🔄 / ✅ | 13Z-C in worktree (uncommitted); 13T committed (`686000c`) |
| Should-have: multi-skill vacancy parsing; complete match-disparity monitoring | 🔄 | Manuscript lists both as partial; `docs/migrations/match_disparity_monitoring.sql` |

### Phase 6 — Admin, Analytics, LMI & Reports (SO5, SO6) — ~75%
| Item | Status | Evidence |
|---|---|---|
| User / employer / job / applicant moderation | ✅ | `app/admin/users`, `employers`, `jobs`, `applicants`, archived-* |
| Admin analytics (timeline, placement, hiring rate, referrals) | ✅ | `app/api/admin/analytics/*`; `tests/phase-6-admin-analytics.test.ts` |
| LMI report — sectoral vacancy demand | ✅ | `app/api/admin/reports/lmi/route.ts` |
| LMI — placement outcome rates | ✅ | LMI route + `analytics/placement-stats` |
| LMI — top required skills / skills-gap visualization | ✅ | 2026-10-20: `skills` in `/api/admin/reports/lmi`, chart + CSV in LMI tab, `tests/lmi-skills.test.ts` |
| PES reports (DOLE-aligned fields) | 🔄 | `app/api/admin/reports/pes`; "automated full DOLE-compliant report generation" is a should-have (partial) |
| CSV export | ✅ | `app/api/admin/export/*`, `analytics/export` |
| Audit logs | ✅ | `app/api/admin/audit-logs`, `app/admin/audit-logs` |
| Placeholder admin pages (diagram pages, auth settings) | 🔄 | `gensanworks-audit.md` §14 |

### Phase Z — Authorization Hardening: 13Z chain (inferred) — ~45% on `main`
Branch `migration/draft-core-a-baseline-v1`, worktree `scratch/draft-core-a-baseline-v1`.
| Item | Status | Evidence |
|---|---|---|
| 13F/13G/13I/13J/13O/13T remediations | ✅ | Tests on `main`; `5a967c8`, `686000c` |
| 13Z-C matching UUID contract | 🔄 | Worktree test, uncommitted |
| 13Z-D admin route schema compatibility | 🔄 | Worktree test, uncommitted |
| 13Z-E/F authorization boundary + SRS failure handling | 🔄 | Worktree `task-13ze-*`, uncommitted |
| 13Z-I employer GET protection + `profile-access-v1.sql` draft | 🔄 | Worktree; policy is DRAFT, has a guard that refuses to execute |
| 13Z-J1 / J2 referral applicant lookup / admin browser DB boundary | 🔄 | Worktree, uncommitted |
| 13Z-K server/client Supabase boundary | 🔄 | Worktree, uncommitted |
| 13Z-L/M standalone config + guarded AI correction client | 🔄 | Worktree, uncommitted |
| 13Z-O session contract · 13Z-P `/api/auth/me` shape · 13Z-Q exactly-one profile narrowing | 🔄 | Worktree, uncommitted |
| 13Z-S profile-role decision module · middleware navigation gating · OAuth callback hardening | 🔄 | `app/lib/profile-role.ts` + 3 tests in worktree, uncommitted. **`main` uses a different callback** (consent-based, `c75b99e`). Will need reconciliation |
| 13Z-S landing: Google removed from signup landing | ✅ → superseded | `1fdda6c` on branch; superseded on `main` by jobseeker-only Google behind consent (`c75b99e`) |
| 13Z-U/V consent on all email signup flows | ✅ | Branch `d356f16`; carried into `main` via `c75b99e` |
| 13Z-W end-to-end consent test | ✅ | `e2e/consent-gate.spec.ts`, 7/7 against production 2026-10-20 (`docs/testing-evidence/e2e-consent-gate-production-output.txt`) |
| 13Z-G, H, N, R, T(Z) | ❓ | No test or doc found for these letters. Skipped, merged into other items, or not yet done? [UNKNOWN — needs owner input] |
| Profile-access-v1 policy promoted to a CLI migration + synthetic tests | ✅ | `supabase/migrations/20261020130000_profile_access_v1.sql` + 13Z-I static checks, 2026-10-20 |
| Profile-access-v1 policy applied to a live DB | ⬜ | Must be done by a human, after approval |

### Phase 7 — Testing & QA — ~60%
| Item | Status | Evidence |
|---|---|---|
| Unit/contract tests (`tsx --test`) | ✅ | 31 test files on `main`; 14 more in worktree |
| Current pass status of the full suite on `main` | ✅ | 2026-10-20: 490 pass / 0 fail (`docs/testing-evidence/unit-test-suite-output.txt`) |
| Playwright e2e specs (jobseeker, employer, admin, signup, responsive) | 🔄 | `e2e/*.spec.ts`, `playwright.config.ts`; pass status ❓ |
| e2e in CI | 🔄 | `.github/workflows/e2e-tests.yml`; run results ❓ |
| Coverage gate (80% lines) | 🔄 | 2026-10-20: 71.79% lines (`docs/testing-evidence/unit-test-coverage-output.txt`) |
| ISO/IEC 25010 test mapping, compatibility testing | 🔄 | Manuscript Table 38; Appendix C |

### Phase 8 — Security, Privacy & Compliance — ~55%
| Item | Status | Evidence |
|---|---|---|
| Security test suite | ✅ | `tests/phase-8-security.test.ts`, `tests/security.test.ts` |
| Pen-test report, rate-limit review, compliance checklist | ✅ | `docs/penetration-test-report.md`, `rate-limit-review.md`, `compliance-checklist.md` |
| Security scans in CI | ✅ | `security-scan.yml`, `dynamic-security-scan.yml` |
| Privacy notice + consent versioning | ✅ | `app/privacy/page.tsx`, `app/lib/privacy-notice-version.ts` (placeholder version id) |
| Consolidated RLS policies | 🔄 | profile tables done (M8, 2026-10-20); other tables deny-all to clients (RLS, no policies) |
| Admin MFA | ⬜ | Constraint #7 |
| Secret in seed SQL (audit §16.8) | ❓ | Status and rotation [UNKNOWN] |
| Final legal privacy-notice text | ❓ | Placeholder version accepted until legal text is final |

### Phase 9 — Deployment & DevOps — ~65%
| Item | Status | Evidence |
|---|---|---|
| Vercel deploy pipeline | ✅ | `.github/workflows/deploy.yml` (`vercel build --prod`) |
| CI, keepalive, backup-restore drill, load-test workflows | ✅ | `.github/workflows/*` |
| Runbook, backups, deployment, troubleshooting, monitoring docs | ✅ | `docs/runbook.md`, `backups.md`, `deployment.md`, `post-launch-monitoring-dashboard.md` |
| Consent migration applied to live DB | ✅ | Owner verification query, 2026-10-20 (4 consent columns present); see §9 M1 |
| Consent gate live in production | ❓ | Pushed to `origin/main`; deploy result [UNKNOWN] |
| Production env vars for consent/Google (Supabase Google provider, redirect URLs) | ❓ | [UNKNOWN] |
| Synthetic / preview environment for testing | ❓ | See Phase 0 |

### Phase P — Pilot Evaluation & Handoff (SO2, SO7) (inferred) — ~10%
| Item | Status | Evidence |
|---|---|---|
| Onboarding: guided walkthroughs, contextual help, demo accounts, role manuals (P5 response) | 🔄 | `app/help`, `app/admin/help` exist; walkthroughs/manuals [UNKNOWN] |
| TAM instrument (Tables 31–33) finalized | ❓ | In manuscript; final form [UNKNOWN] |
| Pre-pilot baseline (Table 44 indicators) | ✅ / ❓ | Manuscript says baseline was estimated; data location [UNKNOWN] |
| Pilot task protocol (completion, time, errors) | ❓ | Manuscript Edit 3-xx recommends adding it |
| Conduct pilot (n≈50) + post-pilot observation | ⬜ | Not conducted |
| Results analysis, Ch. 4–5, final defense | ⬜ | — |
| Handoff documentation for PESO | 🔄 | `docs/system_architecture_manual.md`, `README.md` (partly outdated) |

### Overall
Weighted judgment: **~70% of engineering scope built**, **~10% of pilot/evaluation scope done**. Biggest structural gap: the 13Z authorization hardening is not on `main`.

---

## 8. Critical Path to Pilot

What remains before the system can go live for the controlled pilot, in dependency order. Items 1–9 are engineering blockers; 10–13 are pilot readiness.

1. **Confirm environment facts (owner):** whether the consent migration is applied to `dkpzieytlqkbhhpqpvyr`, whether `c75b99e` is deployed, and whether a synthetic Supabase project exists. If production has the consent code but not the migration, signup/consent writes may fail.
2. **Bring the 13Z-C…S chain onto `main`:** commit the worktree changes on `migration/draft-core-a-baseline-v1` and reconcile them with `c75b99e`. Both rewrote `app/auth/callback/route.ts`, `supabase-middleware.ts`, `login/page.tsx` and `login/admin/page.tsx`, so expect conflicts. Then merge. Approval required (auth change).
3. **Admin Google path fix:** remove or disable `app/api/auth/callback/admin/route.ts`.
4. **Option C:** `handle_new_user()` skips OAuth users. Migration file + synthetic test; a human applies it.
5. **13Z-W:** end-to-end consent test (email signup without consent fails; Google accept → portal; Google decline → deactivated).
6. **Profile-access-v1 RLS:** promote the draft to a Supabase CLI migration with synthetic tests; human review, then human applies.
7. **Pilot matching constraints:** finish and commit the in-progress determinism-default and Groq-only cascade work (constraints #1, #5).
8. **Two-stage account deletion:** confirm or implement the anonymization stage (constraint #3).
9. **Admin MFA:** implement, or at minimum document it as a hard prerequisite before any real data (constraint #7). Also resolve the seed-SQL secret finding.
10. **Green test run on `main`:** unit + e2e; record the results here.
11. **SO5 check:** confirm three LMI visualizations (sector demand, top skills, placement rates) are available to admins from pilot data.
12. **Onboarding package:** demo accounts (synthetic), role manuals, walkthroughs.
13. **Pilot protocol + TAM instrument** finalized and approved by adviser/PESO, then pilot launch.

---

## 9. Owner Manual Actions

Everything the owner must do by hand (SQL, migrations, console settings, deploys, key rotation). Agents never apply these. Each item is also pasted in full in chat when first requested. Mark items ✅ when done; never delete them.

| # | Added | Action | Why | Status |
|---|---|---|---|---|
| M1 | 2026-10-20 | Run `supabase/migrations/20260829120000_add_signup_consent_fields.sql` in the Supabase SQL editor (synthetic project first if one exists, then production `dkpzieytlqkbhhpqpvyr`). Verify: `select column_name from information_schema.columns where table_name in ('jobseekers','employers') and column_name like 'consent%';` → 4 rows | `c75b99e` (already on `origin/main`) reads and writes `consent_given_at` / `consent_privacy_notice_version`; signup and consent fail without these columns | ✅ done 2026-10-20: owner's verification query returned all 4 columns (jobseekers + employers). Which project (synthetic or production) [UNKNOWN] |
| M2 | 2026-10-20 | Check the Vercel dashboard for whether `c75b99e` deployed to production successfully | Consent gate live status [UNKNOWN] | ✅ done 2026-10-20: owner confirmed the deploy |
| M3 | 2026-10-20 | Check `seed_generated.sql` / seed SQL for an embedded Supabase service-role key (audit §16.8); if one is or was there, rotate it in Supabase → Settings → API | Exposed service-role key bypasses all RLS | ✅ closed 2026-10-20: owner checked, no rotation needed |
| M4 | 2026-10-20 | Supabase → Authentication → Providers → Google enabled, with production redirect URL `https://<prod-domain>/auth/callback` listed under Authentication → URL Configuration | Jobseeker Google sign-in behind the consent gate. Code sends `redirectTo: ${window.location.origin}/auth/callback` (`app/login/page.tsx:104`, `app/signup/page.tsx:135`), so every origin used must be allow-listed. Full steps: (A) Google Cloud OAuth client with redirect URI `https://dkpzieytlqkbhhpqpvyr.supabase.co/auth/v1/callback`; (B) Supabase Google provider enabled with that client ID/secret; (C) Supabase URL Configuration: Site URL = prod domain, Redirect URLs = `https://<prod-domain>/auth/callback` (+ `http://localhost:3000/auth/callback` for local testing); (D) test. Details in chat 2026-10-20 | 🔄 2026-10-20: A–C ✅ (Google sign-in reaches dashboard); D3 ✅ (tyctyke@gmail.com has consent_given_at + version, is_active=true); D4 likely ✅ (tycoonjamesflores@gmail.com: consent null, is_active=false; owner to confirm this was the decline test); D5 ✅ no Google button on /login/admin; D6 ✅ dashboard loads. Earlier note: 2026-10-20: Google sign-in on `gensanworks.vercel.app` failed with DNS error. Vercel build points to deleted/old Supabase project `tsvioxrlmcsqdricdgkd`; blocked on M5 |
| M5 | 2026-10-20 | Vercel → Project → Settings → Environment Variables (Production): set `NEXT_PUBLIC_SUPABASE_URL` = `https://dkpzieytlqkbhhpqpvyr.supabase.co`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (if set), `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` to the **dkpzieytlqkbhhpqpvyr** values (same as local `.env.local`); `NEXT_PUBLIC_APP_URL` = `https://gensanworks.vercel.app`. Then **Redeploy** (NEXT_PUBLIC_* are baked in at build time). Verify: the Google button URL starts with `dkpzieytlqkbhhpqpvyr.supabase.co` | Production build uses old project `tsvioxrlmcsqdricdgkd` (DNS no longer resolves), so all auth on Vercel is broken, not just Google | ✅ done 2026-10-20: Google sign-in now reaches the dashboard |
| M6 | 2026-10-20 | Check, then fix, the live default for `jobseekers.job_seeking_status`. Diagnose: `select column_default, is_nullable from information_schema.columns where table_name='jobseekers' and column_name='job_seeking_status';` and `select job_seeking_status, count(*) from jobseekers group by 1;`. Proposed fix (needs owner approval, data change): `update jobseekers set job_seeking_status='not_looking' where job_seeking_status is null or job_seeking_status not in ('actively_looking','open','not_looking'); alter table jobseekers alter column job_seeking_status set default 'not_looking';` | New non-seeded accounts (tyctyke@gmail.com, tycoonjamesflores@gmail.com, jobseeker@gensanworks.com) have `job_seeking_status='active'`, which is not one of the 3 valid values. That was the real cause of the 'bg' crash (UI now tolerates it, `36846c7`). No repo code writes 'active', so it is a live DB default/trigger outside the repo | 🔄 2026-10-20: distribution now not_looking 43 / open 40 / actively_looking 39 (122 rows, **no 'active' rows left**; earlier 3 had it). Owner to confirm whether step 2 was run. Column default not yet seen (SQL editor shows only the last result) Default confirmed 'not_looking'::text, is_nullable YES. Data ✅ clean. Remaining: source of 'active' not in repo (seed 'active' values are jobs.status). Suspect live handle_new_user() differs from repo; owner to run `select pg_get_functiondef('public.handle_new_user'::regproc);` and paste it |
| M7 | 2026-10-20 | Apply Option C: run `supabase/migrations/20261020120000_option_c_skip_oauth_profile_before_consent.sql` in the SQL editor. Verify with `select pg_get_functiondef('public.handle_new_user'::regproc);` (shows the provider early return), then a fresh Google test signup: 0 jobseekers rows on the consent page, 1 row with consent_given_at after Accept. Rollback block is at the end of the file | Google users get no profile before consent (decision 2026-10-20) | ✅ done 2026-10-20: owner ran the full function; pg_get_functiondef shows SET search_path TO 'public' and the provider early return. Fresh-Google-signup check is part of M10 |
| M8 | 2026-10-20 | profile-access-v1. Step 1 (read-only): run the column list query and pre-checks (b) policies and (d) column privileges from the migration header, and paste the results. Step 2: after column reconciliation, decide synthetic vs production and run `supabase/migrations/20261020130000_profile_access_v1.sql` in the SQL editor (not `supabase db push`) | RLS: clients may read only their own id/is_active (+consent_given_at); critical path #6 | ✅ done 2026-10-20: applied by Claude Code via the Supabase connection on explicit owner approval (rule #8 overridden for this migration). Verified: only own-row column SELECT grants remain; anon REST GET/PATCH on all 3 tables -> 401; e2e 7/7. Evidence: docs/testing-evidence/rls-profile-access-v1-verification.txt |
| M9 | 2026-10-20 | Decide the pilot retention period, then set Vercel env `ACCOUNT_ANONYMIZATION_RETENTION_DAYS` (whole days) and redeploy. Before the first execute run, check for updated_at triggers (read-only): `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgrelid IN ('public.jobseekers'::regclass,'public.employers'::regclass,'public.admins'::regclass) AND NOT tgisinternal;` Then run a dry run first: POST /api/admin/account-deletion/anonymize with {"execute": false} | Deletion stage 2 stays disabled until then | ⬜ pending (owner decision) |
| M10 | 2026-10-20 | Google checks on production: (1) new Google jobseeker gets consent page, Accept, dashboard; (2) second account Decline, sign in again, Accept, dashboard; (3) tyctyke@gmail.com goes straight to the dashboard. Email-login and role-blocking checks are covered by the 13Z-W e2e run | Batch 1 Google paths need real accounts | ⬜ pending |
| M11 | 2026-10-20 | Decide on orphan jobseekers row cad9e78d (tyctyke@gmail.com, auth user deleted, 0 related rows): delete it (`DELETE FROM public.jobseekers WHERE id = 'cad9e78d-bf2c-4f21-894b-c4922fe64f5e' AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'cad9e78d-bf2c-4f21-894b-c4922fe64f5e');`) so the new Google sign-in can create its profile | Blocks M10 Google test with this email | ✅ superseded by M15 (orphan rows removed by the wipe) |
| M12 | 2026-10-20 | Admin login fix (data change, awaiting owner approval): align the admins row to the existing Auth login. `UPDATE public.admins SET id = '1ae2db26-f817-43db-ba64-f370e4522a78' WHERE email = 'admin@gensanworks.com' AND id = '0cf1648a-3e54-408d-b86b-49d352e64965' AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id = '1ae2db26-f817-43db-ba64-f370e4522a78');` (no foreign keys reference admins.id; one row). Verify: `select id, email, is_active from public.admins;` then sign in at /login/admin | admin@gensanworks.com has a login but no matching admins row | ✅ done 2026-10-20: owner said "fix admin"; Claude Code ran the guarded one-row UPDATE via the Supabase connection. Verified: admins.id now equals the Auth login id; no jobseeker/employer row shares it; simulated authenticated read of own admins row returns 1 row. Admin sign-in confirmed 2026-10-21 via the new M16 admin login (M10 A3 ✅) |
| M13 | 2026-10-20 | Create real test accounts through the app: sign up a jobseeker and an employer at /signup (tick the privacy box); confirm email if asked. Needed because seeded profiles have no Auth logins, so M10 A1/A2 cannot use seeded emails | Email login checks need accounts that exist in Auth | ✅ done 2026-10-20 (jobseeker tycoonjamesflores@gmail.com, employer tycoonsec.accs@gmail.com) |
| M14 | 2026-10-20 | Delete orphan jobseekers row e1cf9130 (tycoonjamesflores@gmail.com; no Auth user, 0 related rows) so that email can sign up: `DELETE FROM public.jobseekers WHERE id = 'e1cf9130-528e-44fd-8a3c-9dcd7806e915' AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'e1cf9130-528e-44fd-8a3c-9dcd7806e915');` Verify: `select count(*) from public.jobseekers where lower(email) = 'tycoonjamesflores@gmail.com';` returns 0 | Signup for that email fails on the unique email constraint | ✅ superseded by M15 (orphan rows removed by the wipe) |
| M15 | 2026-10-20 | Wipe all data except the admin (owner decision 2026-10-20). Run in the Supabase SQL editor: step 1 count check, step 2 the DELETE block, step 3 verify (exact SQL in chat 2026-10-20). Keeps `admin@gensanworks.com` (auth user + admins row). Restore path for dummy data: `seed_generated.sql` (approximate copy). After it: M12 to align admin id, then re-signup test accounts (M13) | Clean slate for testing and pilot; removes orphan rows that break signup (M11/M14 become unnecessary) | ✅ done by owner 2026-10-20 (verified 2026-10-21: jobs 0, landing_metrics 0, only new test accounts remain; admin kept) |
| M16 | 2026-10-21 | New admin account: (1) Supabase Dashboard → Authentication → Users → Add user → Create new user (owner's email + password, Auto Confirm on). (2) Run the linking SQL (in chat 2026-10-21): it removes the empty jobseekers row the signup trigger auto-creates for that login and inserts an admins row with the login's id. (3) Sign in at /login/admin. Old admin@gensanworks.com kept until the owner decides | Owner wants an admin login they control | ✅ done 2026-10-21: new admin login linked; owner signed in to /admin/dashboard (last_sign_in 17:34 UTC); verified 0 jobseeker/employer rows on that id |
| M17 | 2026-10-21 | Run `supabase/migrations/20261021120000_lock_down_ai_tables_and_functions.sql` in the Supabase SQL editor (copy everything from BEGIN; to COMMIT;). Then run the two validation queries in its header (both should return 0 rows) and run matching on one job as admin | Anyone with the public anon key can read/write/delete AI matching tables; SECURITY DEFINER functions callable via RPC; advisor ERROR view | ✅ done (verified 2026-10-22 by read-only query: 0 policies and 0 anon/authenticated grants on the 5 AI tables) |
