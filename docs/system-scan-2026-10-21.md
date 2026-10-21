# GensanWorks: full-system scan and fix plan

**Date:** 2026-10-21 · **Scope:** read-only scan of the production code (`main` @ `e4708a0`) compared with the live Supabase schema of project `dkpzieytlqkbhhpqpvyr` · **Method:** specialist agents (backend API ×2, frontend, security/privacy) plus a live schema snapshot, consolidated by Claude Code. No code or data was changed by the scan.

> **Status: proposed. Waiting for owner approval batch by batch.** Finding IDs (API-n, API2-n, FE-n, SEC-n) refer to the raw scanner reports. Line numbers are from the scan and may shift slightly.

## 1. Headline

The main cause is **schema drift**. Much of the code was written against an older database design and still uses tables and columns that no longer exist. Examples: the `users` table, `applications.applicant_id` (live: `jobseeker_id`), `jobs.status` (live: `job_status`), `notifications.read_at` / `messages.read_at`, the `employers.srs_*` / `is_archived` columns, and the `admin_access_requests.phone/organization/notes` columns.

Most routes **ignore the Supabase error and return an empty 200**. So the pages show "0" or "nothing here" instead of an error. That is why the problems were invisible.

**Your reported bug, the Employer Approvals page showing 0:** `app/api/admin/employers/route.ts:34` filters on `is_archived`, a column that does not exist. The query errors, the route ignores the error, and it returns `{employers: []}`. The dashboard uses a different, valid query (`app/admin/dashboard/_lib/data-loader.ts:378`), so it correctly shows the 2 pending employers. A second bug sits behind it: the page fetches "all" plus each status separately and concatenates the results (`app/admin/employers/page.tsx:41-61`), so after the fix every employer would appear twice.

## 2. Severity overview

| Severity | Count (approx.) | Meaning |
|---|---|---|
| 🔴 Critical | 17 | Core workflow fully broken, or anyone can read/destroy other users' data |
| 🟠 High | 30 | Feature broken or significant data exposure |
| 🟡 Medium | 25 | Wrong numbers, silent failures, latent risks |
| ⚪ Low | 10 | Cosmetic, dead code, minor |

## 3. Security issues that work against production today (fix first)

| ID | Issue | Who can exploit it | Fix |
|---|---|---|---|
| SEC-5 | `app/api/messages/conversation/[peerId]/route.ts`: `peerId` is string-interpolated into a PostgREST `.or()` filter run with the service role. A crafted URL **deletes every message in the system** (DELETE) or dumps all messages (GET). | Any signed-in user | Validate `peerId` as a UUID; use parameterized filters. Audit every other `.or(\`…${}\`)` site |
| SEC-8 / API2-13 | `GET /api/referrals` returns up to 1000 referrals system-wide, with applicant name, email and phone | Any signed-in user (a jobseeker, a pending employer) | Admin: all rows. Employer: own rows. Jobseeker: own rows |
| SEC-9 / API2-14 | `POST /api/referrals` creates or updates referrals for anyone, with an `employerId` taken from the body, and edits applications and jobseekers | Any signed-in user | Admin only; always use `jobs.employer_id` |
| SEC-6 / API2-18 | `DELETE /api/referrals/[id]` deletes any referral **and hard-deletes the linked application** | Any signed-in user | Admin only, soft-cancel, audit log |
| SEC-7 | `PATCH /api/referrals/[id]/status`: no role check. It is broken today (missing `remarks` column), but fixing that column alone would let anyone mark referrals "Hired" | Any signed-in user, once the drift is fixed | Admin, or owning employer |
| API2-4 | `/api/matching/[jobId]` has **no auth**. Anyone can read match scores (strengths, gaps) or trigger LLM matching runs, which costs money | Anonymous | Admin only, or delete (no UI uses it) |
| API2-10 | `POST /api/matching/feedback` lets a jobseeker mark themselves **"shortlisted"** for any job, notify the employer, and poison recalibration data. This breaks the human-in-control rule | Any signed-in user | Admin, or owning employer only |
| SEC-2 / API2-23 / FE-7 | `/api/public/profile/[id]` lets any employer (even a pending one) fetch any jobseeker's profile, including disability fields | Any employer | Require an application/referral link to the employer's job; drop protected fields; correct the "De-identified" label |
| SEC-4 / API2-12 | `POST /api/employer/outcomes` records hiring outcomes for **other employers'** jobs, which feeds fairness and recalibration | Any employer | Check job ownership |
| API2-31 | Admin analytics routes send `Cache-Control: public, s-maxage`. A CDN can serve the admin data to the next anonymous caller of the same URL | Anonymous (via the CDN) | `private, no-store` on all authenticated routes |
| API2-22 | `select("*")` returns **`password_hash`**, TIN, religion and disability flags to the browser (PES report, applicant detail, own profile) | Admin pages / own user | Explicit column lists |
| SEC-1 | `/api/admin/system-alerts` lets non-admins through (only `unauthorized` is checked, not `forbidden`) | Any signed-in user | Check `forbiddenResponse` |
| DB (live) | `job_match_scores`, `ai_matching_logs`, `dead_letter_queue`, `skill_synonyms`, `skill_embeddings_cache` have policy `ALL TO public USING (true)` plus full anon grants | Anyone holding the public anon key | **Migration** (needs approval): drop those policies, revoke anon/authenticated |
| Legacy | `app/api/auth/callback/admin/route.ts` can still open an admin session through Google | Google user with an admin row | Delete the route (needs approval) |

Latent issues: they become exploitable when the matching drift is fixed, so fix them together. **SEC-3:** the employer job-status PATCH would let an employer self-publish and skip PESO moderation. **SEC-10 / API2-21:** the public referral-slip lookup would leak applicant email and IDs, and slip numbers can be enumerated.

## 4. Broken core workflows (schema drift, code-only fixes)

| Flow | What the user sees | Root cause | IDs |
|---|---|---|---|
| **Employer approvals** | List is 0; detail says "Employer not found"; archive fails; batch approve sets the wrong status | `is_archived`, `srs_*` columns, `srs_approval_history` table, status `"active"` instead of `"approved"`, duplicated fetch | API-1…8 |
| **Applying for a job** | Every apply fails ("no longer available" / "not available") | Checks `job_status === "Open"` but approval sets `"active"`; selects `status/is_published`; inserts `applicant_*`, `cover_letter`, `resume_url` | API-31…34 |
| **Employer applicant pipeline** | Can't change applicant status, can't message applicants, per-job applicant list fails | `applicant_id`, `users(*)` join, `feedback` column | API-26…29 |
| **Notifications** | Bell is always empty; "mark as read" fails | `read_at` (live has `read` and `is_read`) | API-35, 36 |
| **Messages** | Conversations load empty; mark-read fails; bulk mark-read route is missing | `read_at`; `PATCH /api/messages/read` does not exist | API-37, 38, FE-15 |
| **Admin access requests** | "Submitted" but nothing saved; admin queue and approval fail | `phone/organization/notes` columns | API-9, 10, 15 |
| **Referrals** | Status change always fails; public QR slip check always "not found"; slip insert unchecked; duplicate referrals possible | `remarks`, `pdf_url`, `applicant_id`, missing `application_id` link | API2-16, 17, 19, 20 |
| **AI matching (admin)** | "Run matching" scores candidates against an **empty vacancy**; results page shows nothing; "send to employer" not saved | Reads non-existent job columns (`required_skills`, `experience_min`…); `bias_flags`, `sent_to_employer`; missing RPC; unchecked persistence | API2-1…3, 5…9 |
| **Matching candidate pool** | Inactive, not-looking and **unconsented** profiles get scored | Backfill has no filters | API2-7 (pilot rule violation) |
| **Employer job archive** | "Failed to archive job" | Calls a route that does not exist | FE-13 |
| **Admin "send notification"** | Always fails | `POST /api/admin/notifications` does not exist | FE-14 |

The AI-matching row matters for the manuscript (SO3). Matching must score on **job-relevant factors**. Right now the vacancy side is empty, so scores reflect completeness and location noise. This must be fixed before any matching results are cited.

## 5. Wrong numbers in reports and LMI

| Issue | Effect | IDs |
|---|---|---|
| Status vocabulary is inconsistent (`pending` / `under_review` / `screening`; `referred` / `Hired` / `For Interview`; `approved` / `active`) | Placement, hire-rate and LMI "placed" counts are **always 0**; filters miss rows | API-30, API2-27 |
| Hire date uses the referral date | Monthly placement reports attribute hires to the wrong month | API2-28 |
| Unchecked errors produce zeros; date-only `endDate` excludes the last day; no pagination (1000-row cap) | Silent wrong totals | API2-29, 30 |
| Retired `users` table in dashboard/overview, activity, geographic, exports (DOLE, masterlist, summary), job-seeker alerts, admin Users page | Empty or failed exports and pages | API-14, 18, 19, 21 |
| Dashboard health card queries missing tables | Shows false "API down" | API-24 |

**Decision needed:** one canonical lowercase status set per entity (proposal: applications `pending|reviewed|shortlisted|interview|hired|rejected|withdrawn`; referrals `referred|interview|hired|rejected|withdrawn`; employers `pending|approved|suspended|rejected`; jobs `draft|pending|active|closed|rejected|suspended`), mapped once in `app/lib/constants.ts`.

## 6. Privacy and account features

| Issue | IDs |
|---|---|
| Data-privacy export returns empty or failed sections | API-11 |
| Cancel account deletion always fails (`cancelled_at`) | API-12, API-20 |
| Email verification uses a missing table (`account_email_verifications`) | API-13 |
| Admin hard-deletes a jobseeker, bypassing the two-stage deletion policy, the Auth user and the audit log | API2-25 |
| `GET` profile auto-creates an **unconsented** jobseeker row on any error (bypasses the consent gate) | API2-26 |
| NSRP ID generated with `Math.random` on a GET, no uniqueness check | API2-24 |
| Bias audit reads missing columns (`date_of_birth`, `logistics_zone`, `education_level`) | API-22 |
| Referral-slip issuing reads missing applicant/job columns | API-23 |
| Admin employer create writes missing columns and leaves an orphan Auth user | API-8 |

## 7. Frontend navigation

| ID | Issue | Fix |
|---|---|---|
| FE-1 | Footer "Admin Portal" goes to `/admin/login` (404) | Link to `/login/admin` |
| FE-2 | Employer matching "Back" goes to a 404 | Link to `/employer/jobs/[id]/applications` |
| FE-3 | Jobseeker "View Establishment Profile" goes to a 404 | Hide it (or build a public employer page; scope decision) |
| FE-4 | `/jobs` redirects anonymous visitors to the login wall | Fine for the pilot, or build a public job board later |
| FE-8 | **Admin has no navigation or logout on phones/tablets** | Add an admin mobile header like the employer/jobseeker ones |
| FE-9/10 | Orphan pages with no nav entry (employer matching, saved jobs, jobseeker referrals, admin access requests, admin users, analytics…); duplicate pages (audit vs audit-logs, three archived-jobs variants, use-case/activity diagram placeholders) | Add nav items; delete duplicates and placeholders (approval) |
| FE-11/12 | Admin login redirect flashes the jobseeker form; dead mock-data file | Small cleanup |

## 8. Database and Supabase settings (need approval; migration files only)

1. **RLS on the AI tables:** drop the `ALL TO public USING (true)` policies on the 5 tables; revoke anon/authenticated grants. The server uses the service role and is unaffected.
2. **Revoke anon/authenticated grants** on non-profile tables that only the server uses (applications, referrals, referral_slips, jobs writes, audit_logs, etc.). Keep the policies that the browser actually needs.
3. `employer_feedback_summary` view → `security_invoker = on` (advisor ERROR).
4. `REVOKE EXECUTE` on `handle_new_user()` and `rls_auto_enable()` from anon/authenticated (advisor WARN; callable via RPC today).
5. `SET search_path` on `upsert_job_match_scores`, `compute_job_percentiles`.
6. Auth setting (dashboard, by the owner): enable **leaked password protection**.
7. Optional columns, only if wanted (otherwise code maps to existing columns): `jobs/employers` archive (proposal: reuse `is_active=false` instead), `job_match_scores.sent_to_employer/sent_at` (proposal: record in `audit_logs` instead).

## 9. Not covered by this scan (verify in a follow-up)

The usage limit stopped the agents before these were reached:
- **Backend:** employer dashboard / job CRUD / profile / summary, jobseeker saved jobs / recommendations / status / settings, jobs list and detail, `public/**` (other than referrals and profile), `upload/**`, landing/FAQ/partners endpoints, contacts, settings, realtime, health.
- **Frontend:** full response-shape diff of all ~156 fetch calls (only route existence was checked), browser-side Supabase reads, placeholder-page inventory.
- **Security:** full route-auth classification, the rest of the `.or()` injection sites, upload validation, mass assignment in profile/job updates.

## 10. Recommended fix plan

| Batch | Contents | Type | Approval needed |
|---|---|---|---|
| **1. Stop the bleeding** | All §3 code items (SEC-5, referrals authz, matching endpoints, public profile, outcomes ownership, Cache-Control, password_hash, system-alerts) plus the latent SEC-3/SEC-10 | Code + tests | Yes: authorization changes (CLAUDE.md) |
| **2. DB security migration** | §8 items 1–5 as one review-only migration | Migration | Yes: RLS/grants (pilot rule #8) |
| **3. Core flows** | §4: approvals, apply, applicant pipeline, notifications/messages, access requests, referrals, matching vacancy mapping + candidate filters, archive/notify routes | Code + tests | Ordinary bug fixes, but auth-adjacent pieces flagged |
| **4. Status vocabulary + reports** | §5: canonical statuses, report date/pagination/error fixes, retire `users` references | Code (maybe a data backfill) | Status-set decision |
| **5. Privacy features** | §6 | Code | Hard-delete → anonymization path |
| **6. Navigation + cleanup** | §7 plus deleting dead/duplicate routes (`admin/dashboard/overview|activity|geographic`, `admin/fix-db`, `supabase-demo`, `auth/callback/admin`, `matching/[jobId]` if unused) | Code + deletions | Yes: deleting files |
| **7. Finish the scan** | §9 areas, then an end-to-end smoke run of every workflow | Read-only, then e2e | No |

Each batch: unit tests for the fixed behaviour (including cross-account/unauthorized cases), type-check, build, the code-reviewer pass for auth-related batches, then commit and push only on owner approval.

### Decisions for the owner
1. Approve Batch 1 (authorization changes) and Batch 2 (RLS migration).
2. Canonical status sets (§5): accept the proposal or adjust it.
3. Archive = `is_active=false` (no migration), or add `archived` columns?
4. "Sent to employer" tracking: `audit_logs` (no migration) or new columns?
5. Delete the dead routes and placeholder pages listed in Batch 6?
6. Public employer profile page (FE-3): hide the button for the pilot, or build it?
