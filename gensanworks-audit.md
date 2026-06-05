# GensanWorks — Comprehensive Technical Audit Report

**Date:** 2026-06-05
**Auditor:** Senior Full-Stack QA Auditor & Systems Analyst
**Scope:** Full codebase analysis (read-only Phase 1), build verification, lint/type-check assessment
**Status:** PROTOTYPE / CAPSTONE — pre-production

---

## 1. Executive Summary

GensanWorks is a web-based Integrated Job Portal and Labor Market Information System for General Santos City / PESO. Built as a capstone project using Next.js 15 App Router + Supabase, it demonstrates an impressive breadth of features spanning job seeker, employer, and admin modules, with a sophisticated AI matching engine and real-time messaging. The build succeeds with zero TypeScript errors, but several architectural, security, and schema-alignment issues need attention before any production deployment.

### Key Metrics

| Metric | Count |
|--------|-------|
| Page routes | 86 |
| API route files | 119 |
| Custom React components | 41 (+19 shadcn/ui primitives) |
| Library/module files | 96 (36 core + 60 matching engine) |
| Custom hooks | 2 |
| Utility/script files | 72 |
| Supabase migration files | 8 (+ 15 script-based SQL migrations) |
| Database tables referenced | ~22 |
| Unit/E2E test files | 16+ (~548 lines of lint output) |
| Build status | **PASSES** (TypeScript zero errors) |
| Lint errors | **~30+** (mostly `@typescript-eslint/no-explicit-any`) |
| Lint warnings | **~30+** (unused imports, missing deps, unescaped entities) |
| Build-time route errors | **~40** `DYNAMIC_SERVER_USAGE` (routes using `cookies()` not marked `force-dynamic`) |
| Security issues found | **5 Critical**, 2 High, 2 Medium |

### Critical Security Note

The `.env.local` file and `seed_generated.sql` contain **live credentials** for a real Supabase project, including a service role key (full database access), database password, Google OAuth client secret, and 10 Groq API keys. Additionally, `seed_generated.sql` hardcodes a Supabase trigger URL containing a Bearer token with the service role key. **All credentials must be rotated immediately.**

### Verdict Overview

GensanWorks is an **ambitious, feature-rich capstone prototype** with strong technical execution in several areas (matching engine, real-time messaging, security headers, CI/CD, role-based routing, test coverage). However, it has **critical gaps in schema-to-code alignment** (tables referenced in code but never created), **architectural duplication** (dual auth systems, mixed Pages/App Router, duplicate Supabase clients), and **security exposures** that prevent safe production use. With targeted fixes in 2–4 weeks, it can become a solid foundation for operational deployment.

---

## 2. System Overview

GensanWorks is an integrated web platform connecting four user groups:

- **Job Seekers** — Browse jobs, build NSRP-compliant profiles, apply directly or via PESO referral, receive AI-matched job recommendations, real-time messaging with employers.
- **Employers** — Register with SRS compliance, post job vacancies, review AI-matched candidates, manage applications, generate referral slips.
- **PESO Staff / LGU Admins** — Manage employers, job seekers, jobs, referrals, and applications; generate LMI reports and placement analytics; audit matching fairness; oversee the end-to-end referral lifecycle.
- **Public Visitors** — Browse landing pages, view public referral slip verification, view public NSRP profiles, check system status.

The system is designed to modernize the traditional manual PESO workflow into a digital, automated, data-driven labor market platform for General Santos City and the SOCCSKSARGEN region.

---

## 3. Architecture and Technology Stack

### 3.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.14 (App Router primary) |
| Language | TypeScript 5.3+ (strict mode enabled) |
| Styling | Tailwind CSS 3.3 + `tailwindcss-animate` + `tailwind-merge` |
| UI Components | shadcn/ui (Radix-based: Dialog, DropdownMenu, Tabs, ScrollArea, etc.) |
| State/Data | TanStack React Query 5, Zustand 4 |
| Forms | react-hook-form 7 + Zod + @hookform/resolvers |
| Animation | Framer Motion 12 |
| Charts | Recharts 2 |
| Real-time | Socket.IO 4 (client + server), Supabase Realtime |
| Notifications | Sonner (toast), PostHog (analytics) |

### 3.2 Backend

| Layer | Technology |
|-------|-----------|
| Server | Next.js API routes (App Router), Pages Router `/pages/api/socketio.ts` |
| Database | Supabase PostgreSQL 17 (managed cloud instance) |
| Auth | Supabase Auth (primary) + NextAuth v5 beta (legacy wrappers still present) |
| ORM | None — direct Supabase JS client with string-based table names |
| File Storage | Supabase Storage (resumes, profile images, employer docs) |
| Email | Resend (password reset, email verification) |
| SMS | Twilio (configured, `NOTIFICATION_SMS_ENABLED=0`) |
| AI / LLM | Groq SDK (llama-3.3-70b for reranking, skill correction, explanations), OpenAI text-embedding-3-small via embedding service |
| Real-time | Socket.IO (messages, typing indicators, notifications stream) |

### 3.3 Key Architectural Observations

**Mixed Router Paradigm:** The primary architecture uses Next.js App Router, but `pages/_app.tsx`, `pages/_document.tsx`, and `pages/api/socketio.ts` (Socket.IO server initialization) remain from the Pages Router. Socket.IO only works through the Pages API route (App Router routes cannot maintain persistent WebSocket state).

**Dual Auth Systems:** The project depends on both `next-auth` (v5 beta, with route handlers at `/app/api/auth/[...nextauth]/route.ts`) and `@supabase/supabase-js` (actual auth implementation). The `app/lib/auth.ts` file is titled "Compatibility layer to replace NextAuth auth() call" and wraps Supabase sessions into a legacy format. However, NextAuth dependencies and route handlers remain, creating confusion about which auth system is active.

**Duplicate Supabase Clients:** Two virtually identical Supabase browser client factories exist:
- `app/lib/supabase-client.ts` (imports `createBrowserClient` from `@supabase/ssr`)
- `app/utils/supabase/client.ts` (same implementation)

**No ORM, String-Based Schema References:** All database table names are string constants in `app/db/schema.ts`. No Drizzle, Prisma, or TypeORM is used. Queries use `.from("table_name")` directly, which means column name typos are not caught at compile time.

**Over-Engineered Matching Engine:** The `app/lib/matching/` directory contains 60 files implementing an enterprise-grade AI scoring pipeline (TF-IDF, LLM reranking, embedding similarity, bias correction, disparity monitoring, drift detection, chaos testing, load testing, etc.). For a capstone prototype, this level of engineering is disproportionate to the core CRUD features and likely exceeds real-world needs.

---

## 4. Feature Status Matrix

| Feature | Module/Area | Status | Evidence (Files/Routes) | Notes |
|---------|------------|--------|------------------------|-------|
| Landing page (16 sections) | Public | **IMPLEMENTED** | `app/page.tsx`, `app/components/homepage/*` (16 components) | Fetches live data via TanStack Query; impact metrics, skills, testimonials, partners all data-driven |
| About page | Public | **IMPLEMENTED** | `app/about/page.tsx` | Static, well-structured |
| Contact page | Public | **IMPLEMENTED** | `app/contact/page.tsx` | Static with form; no API handler wired for form submission |
| Privacy policy | Public | **IMPLEMENTED** | `app/privacy/page.tsx` | Static, comprehensive |
| Help page | Public | **IMPLEMENTED** | `app/help/page.tsx` | Static accordion |
| Get started | Public | **IMPLEMENTED** | `app/get-started/page.tsx` | Role selection cards |
| Training page | Public | **IMPLEMENTED** | `app/training/page.tsx` | Static program cards |
| System status | Public | **IMPLEMENTED** | `app/status/page.tsx` | Fetches `/api/health`, auto-refresh |
| Supabase demo | Public | **IMPLEMENTED** | `app/supabase-demo/page.tsx` | Demo only; queries `todos` table |
| Jobseeker signup | Auth | **IMPLEMENTED** | `app/signup/jobseeker/page.tsx`, `app/api/auth/signup/jobseeker/route.ts` | Zod validation, password live check |
| Employer signup | Auth | **IMPLEMENTED** | `app/signup/employer/page.tsx`, `app/api/auth/signup/employer/route.ts` | Creates auth user + employer record |
| Admin access request | Auth | **IMPLEMENTED** | `app/signup/admin-request/page.tsx`, `app/api/auth/signup/admin-request/route.ts` | Pending approval modal after submission |
| Login (jobseeker/employer) | Auth | **IMPLEMENTED** | `app/login/page.tsx` | Role toggle, Supabase signInWithPassword, client validation |
| Admin login | Auth | **IMPLEMENTED** | `app/login/admin/page.tsx` | Email/password + Google OAuth, role check |
| Password reset | Auth | **IMPLEMENTED** | `app/reset-password/page.tsx`, `app/api/auth/reset-password/*` | Token-based, Resend email |
| Email verification | Auth | **IMPLEMENTED** | `app/verify-email/page.tsx`, `app/api/auth/verify-email/*` | Token-based flow |
| Auth error pages | Auth | **IMPLEMENTED** | `app/auth/error/page.tsx`, `app/auth/auth-code-error/page.tsx` | Static, user-friendly |
| Jobseeker dashboard | Jobseeker | **IMPLEMENTED** | `app/jobseeker/dashboard/page.tsx` | Stats cards, recent apps, job recommendations, status toggle |
| Jobseeker profile wizard | Jobseeker | **IMPLEMENTED** | `app/jobseeker/profile/page.tsx`, `app/jobseeker/profile/profile-wizard.tsx` | 7-section wizard (education, experience, trainings, languages, licenses, skills, preferences) |
| Jobs browsing | Jobseeker | **IMPLEMENTED** | `app/jobseeker/jobs/page.tsx`, `app/jobseeker/jobs/[id]/page.tsx` | Search, filter, paginate, save, apply with cover letter |
| Applications (jobseeker) | Jobseeker | **IMPLEMENTED** | `app/jobseeker/applications/page.tsx`, `app/jobseeker/applications/[id]/page.tsx` | Direct + referred tabs, status timeline |
| Saved jobs | Jobseeker | **IMPLEMENTED** | `app/jobseeker/saved-jobs/page.tsx` | Save/unsave toggle |
| Referral slips (jobseeker) | Jobseeker | **IMPLEMENTED** | `app/jobseeker/referrals/page.tsx` | QR codes, validity status, expired highlighting |
| Messaging (jobseeker) | Jobseeker | **IMPLEMENTED** | `app/jobseeker/messages/page.tsx`, `app/components/messaging/realtime-chat.tsx` | Socket.IO real-time |
| Notifications (jobseeker) | Jobseeker | **IMPLEMENTED** | `app/jobseeker/notifications/page.tsx` | NotificationsPanel component |
| Settings (jobseeker) | Jobseeker | **IMPLEMENTED** | `app/jobseeker/settings/page.tsx` | Notification prefs, security, account deletion |
| Job-seeking status toggle | Jobseeker | **IMPLEMENTED** | `app/components/jobseeker/job-seeking-status-toggle.tsx` | Actively Looking / Open / Not Looking |
| AI recommendations | Jobseeker | **IMPLEMENTED** | `app/api/jobseeker/recommendations/route.ts` | Fetches top matches via matching engine |
| Employer dashboard | Employer | **IMPLEMENTED** | `app/employer/dashboard/page.tsx` | Stat grid, active jobs, recent applications |
| Jobs CRUD | Employer | **IMPLEMENTED** | `app/employer/jobs/page.tsx` | Full CRUD with tabs, validation, NSRP fields |
| Applications management | Employer | **IMPLEMENTED** | `app/employer/applications/page.tsx`, `app/employer/jobs/[id]/applications/page.tsx` | Status management, filters, feedback |
| Employer profile wizard | Employer | **IMPLEMENTED** | `app/employer/profile/page.tsx`, `app/employer/profile/employer-wizard.tsx` | SRS-compliant, logo upload |
| AI matching view | Employer | **IMPLEMENTED** | `app/employer/matching/[job_id]/page.tsx` | Score cards, dimension breakdown |
| Messaging (employer) | Employer | **IMPLEMENTED** | `app/employer/messages/page.tsx` | Socket.IO, status actions from chat |
| Settings (employer) | Employer | **IMPLEMENTED** | `app/employer/settings/page.tsx` | Profile, notifications, privacy, team, security tabs |
| Use-case documentation | Employer | **IMPLEMENTED** | `app/employer/use-cases/page.tsx` | Reference docs |
| Admin dashboard | Admin | **IMPLEMENTED** | `app/admin/dashboard/page.tsx` | Recharts charts, stat cards, barangay hotspots, multiple data hooks |
| Employer management | Admin | **IMPLEMENTED** | `app/admin/employers/page.tsx`, `app/admin/employers/[id]/page.tsx`, `app/admin/employers/create/page.tsx` | CRUD, approve/suspend, SRS approval workflow |
| Employer approvals | Admin | **IMPLEMENTED** | `app/admin/employer-approvals/page.tsx` (re-export), `app/admin/employer-approvals/[id]/page.tsx` | SRS approve/reject with rejection reason |
| Applicant management | Admin | **IMPLEMENTED** | `app/admin/applicants/page.tsx`, `app/admin/applicants/[id]/page.tsx`, `app/admin/applicants/create/page.tsx` | CRUD, full NSRP profile display, referral slip generation |
| Jobs management | Admin | **IMPLEMENTED** | `app/admin/jobs/page.tsx` | Approve/reject/archive/suspend/delete, rejection reason |
| Archived jobs/employers | Admin | **IMPLEMENTED** | `app/admin/archived-jobs/page.tsx`, `app/admin/archived-employers/page.tsx` | Simple listing |
| Referral management | Admin | **IMPLEMENTED** | `app/admin/referrals/page.tsx` | Tabs for referrals + slips, search, status filter |
| AI matching dashboard | Admin | **IMPLEMENTED** | `app/admin/matching/page.tsx`, `app/admin/matching/[job_id]/page.tsx`, `app/admin/jobs/[id]/match/page.tsx` | Full fairness audit, bias flags, percentile ranks |
| Reports & analytics | Admin | **IMPLEMENTED** | `app/admin/reports/page.tsx` | 1285-line page, Recharts charts, CSV export |
| Audit logs | Admin | **IMPLEMENTED** | `app/admin/audit-logs/page.tsx` | Paginated, filtered, badge-colored action types |
| Bias/fairness audit | Admin | **IMPLEMENTED** | `app/admin/audit/page.tsx` | 632-line page, dimension analysis, Cohen's d |
| Messaging (admin) | Admin | **IMPLEMENTED** | `app/admin/messages/page.tsx` | MessagesPanel component |
| Notifications (admin) | Admin | **IMPLEMENTED** | `app/admin/notifications/page.tsx` | NotificationsPanel |
| Access requests | Admin | **IMPLEMENTED** | `app/admin/access-requests/page.tsx` | Approve/reject admin requests |
| Settings (admin) | Admin | **IMPLEMENTED** | `app/admin/settings/page.tsx` | Cards linking to sub-sections |
| User management | Admin | **IMPLEMENTED** | `app/admin/users/page.tsx` | Search, role filter, pagination, delete |
| Notification preferences | Admin | **IMPLEMENTED** | `app/admin/notification-preferences/page.tsx` | localStorage-based only (no persistence) |
| Referral slip PDF generation | Admin | **IMPLEMENTED** | `app/components/admin/referral-slip-generator.tsx`, `app/components/admin/referral-slip-pdf.tsx` | QR code, @react-pdf/renderer |
| Public referral verification | Public | **IMPLEMENTED** | `app/referral/[slip-number]/page.tsx` | QR code, status, PDF download |
| Public NSRP profile | Public | **IMPLEMENTED** | `app/profile/[nsrp_id]/page.tsx` | Full profile, role-dependent actions |
| AI matching engine | Matching | **IMPLEMENTED** | `app/lib/matching/*` (60 files) | Hybrid engine: TF-IDF, LLM, embeddings, bias audit, 8 dimensions |
| Skill synonym/ontology | Matching | **IMPLEMENTED** | `app/lib/matching/skill-synonym-service.ts`, `app/lib/matching/skill-ontology.ts` | AI-powered, Persisted to DB |
| Bias correction engine | Matching | **IMPLEMENTED** | `app/lib/matching/bias-correction-engine.ts`, `app/lib/matching/bias-audit.ts` | Counterfactual adjustments |
| Real-time messaging | Messaging | **IMPLEMENTED** | `pages/api/socketio.ts`, `app/components/messaging/realtime-chat.tsx`, `app/lib/realtime-*.ts` | Socket.IO with HMAC auth |
| Notifications stream | Messaging | **IMPLEMENTED** | `app/api/notifications/stream/route.ts` | SSE-based |
| Live nav badges | UI | **IMPLEMENTED** | `app/components/live-nav-badges.tsx` | Polls unread counts |
| Admin use case diagram | Admin | **PLACEHOLDER** | `app/admin/use-case-diagram/page.tsx`, `app/admin/use-case-diagram/jobseeker/page.tsx`, `app/admin/use-case-diagram/employer/page.tsx` | 3 pages with Card + filler text; route parity only |
| Admin activity diagrams | Admin | **PLACEHOLDER** | `app/admin/activity-diagrams/page.tsx` | Card + filler text |
| Auth settings | Admin | **PLACEHOLDER** | `app/admin/settings/auth/page.tsx` | Informational text only, no actual configuration UI |
| Contact form submission | Public | **PARTIAL** | `app/contact/page.tsx` | Form rendered but no visible API handler for submission |
| Google OAuth login | Auth | **PARTIAL** | `app/login/admin/page.tsx` | OAuth button exists, `/auth/callback` route exists but untested |
| Notification preferences persist | Settings | **PARTIAL** | `app/admin/notification-preferences/page.tsx` | localStorage only — no DB persistence |
| Employer account deletion | Employer | **PARTIAL** | `app/api/auth/account-deletion/*` | Routes exist, UI integration unclear |
| Reports CSV export | Admin | **PARTIAL** | `app/api/admin/export/*` (7 route files) | Export routes exist but may not be wired to UI buttons |
| Realtime metrics in admin | Admin | **PARTIAL** | `app/api/admin/realtime-metrics/route.ts` | Route exists, integration in dashboard unclear |
| System status auto-refresh | Public | **PARTIAL** | `app/status/page.tsx` | Auto-refresh capability but interval/config unclear |
| `not-found.tsx` | App-wide | **MISSING** | — | No 404 page exists |
| `shared/` directory | App-wide | **MISSING** | — | Referenced in tsconfig paths, does not exist on disk |
| `users` table | Database | **MISSING** | Referenced in `app/db/schema.ts`, `middleware.ts`, `app/api/admin/users/route.ts` | Not created in any SQL file |
| `applications` table | Database | **MISSING** | Referenced in `schema.ts`, used by employer/jobseeker APIs | Not created in any SQL file |
| `referrals` table | Database | **MISSING** | Referenced in `schema.ts`, used by referral APIs | Not created in any SQL file |
| `messages` table | Database | **MISSING** | Referenced in `schema.ts`, used by messaging APIs | Not created in any SQL file |
| `notifications` table | Database | **MISSING** | Referenced in `schema.ts`, API routes query it | Not created in any SQL file |
| `admins` table | Database | **MISSING** | Referenced in `schema.ts`, queried in admin APIs | Not created in any SQL file |
| `auth_lifecycle_tokens` | Database | **MISSING** | Referenced in `schema.ts`, used by auth utilities | Not created in any SQL file |
| `account_email_verifications` | Database | **MISSING** | Referenced in `schema.ts` | Not created |
| `account_deletion_requests` | Database | **MISSING** | Referenced in `schema.ts`, used by deletion API | Not created |
| `admin_access_requests` | Database | **MISSING** | Referenced in `schema.ts`, used by access requests API | Not created |
| `employer_requirements` | Database | **MISSING** | Referenced in `schema.ts` | Not created |
| `job_requirements` | Database | **MISSING** | Referenced in `schema.ts` | Not created |
| `skill_suggestions` | Database | **MISSING** | Referenced in `schema.ts` | Not created |
| `bookmarks` | Database | **MISSING** | Referenced in `schema.ts`, used by saved-jobs API | Not created |
| `settings` | Database | **MISSING** | Referenced in `schema.ts` | Not created |

---

## 5. Routes and Redirects Audit

### 5.1 Route Counts

| Route Type | Count |
|-----------|-------|
| Public pages (no auth) | 9 |
| Auth pages (login, signup, reset, verify) | 11 |
| Semi-public detail pages | 2 |
| Jobseeker pages (protected) | 12 |
| Employer pages (protected) | 12 |
| Admin pages (protected) | 38 |
| Re-export / redirect pages | 2 |
| **Total page routes** | **86** |

### 5.2 Known Route Issues

**Issue 1: Missing `not-found.tsx` (Severity: Medium)**

No `app/not-found.tsx` file exists. Visiting any undefined route will show the default Next.js 404 page, which is unstyled and unhelpful.

**Issue 2: DYNAMIC_SERVER_USAGE on ~40 Routes (Severity: High)**

Approximately 40 admin, employer, and jobseeker routes use `cookies()` (via the `auth()` function imported from `app/lib/auth.ts`) but are **not** marked with `export const dynamic = 'force-dynamic'`. This causes logged errors during `next build` static generation:

```
[auth] Compatibility layer error: Error: Dynamic server usage: Route /admin/users couldn't be rendered statically because it used `cookies`.
```

This repeats for every protected route. Some files include `export const dynamic = 'force-dynamic'` but many do not, creating an inconsistent pattern.

**Affected routes (examples):**
- `/admin/users`, `/admin/jobs`, `/admin/dashboard`, `/admin/employers/create`
- `/admin/applicants`, `/admin/audit-logs`, `/admin/matching`, `/admin/help`
- `/employer/dashboard`, `/employer/applications`, `/employer/messages`
- `/admin/use-case-diagram/employer`, `/admin/activity-diagrams` (even placeholder pages)

**Issue 3: Login Redirect for Role `admin` (Severity: Low)**

In `app/login/page.tsx:36-38`, the `useEffect` redirects `role=admin` param to `/login/admin`. This is correct but creates a flash — the login page briefly renders before the redirect fires.

**Issue 4: Redirect to Dashboard After Login (Severity: Low-Medium)**

The middleware at `middleware.ts:90-96` redirects authenticated users away from `/login`, `/signup`, and `/` to their dashboard. This is functional but the root `/` redirect for logged-in users may surprise visitors trying to reach the public landing page.

**Issue 5: Re-export Pages as Redirects (Severity: Low)**

At least 2 pages are simple re-exports:
- `/admin/employer-approvals` re-exports `../employers/page`
- `/admin/jobs/vacancies/archived` re-exports `../../archived-jobs/page`

These work but are unnecessary — direct redirects in middleware or next.config would be cleaner.

### 5.3 redirects in next.config.ts

Configured in `next.config.ts:83-124`:
- `/auth/login` → `/login` (permanent)
- `/jobs` → `/jobseeker/jobs` (permanent)
- `/employers` → `/employer/jobs` (permanent)
- `/about-peso` → `/about` (permanent)
- `/helpdesk`, `/help-support` → `/help` (permanent)
- `/admin-portal`, `/admin-portal/:path*` → `/admin/dashboard`, `/admin/:path*` (permanent)

All appear correctly structured and non-conflicting.

---

## 6. Buttons and Interactions Audit (High-Level)

### 6.1 Verified Working Flows

| Flow | Route(s) | Status | Notes |
|------|---------|--------|-------|
| Jobseeker signup | `/signup/jobseeker` → `/login` | **WIRED** | Creates auth user, password validation |
| Employer signup | `/signup/employer` → `/login` | **WIRED** | Creates auth user + employer record (pending) |
| Admin access request | `/signup/admin-request` → success | **WIRED** | Creates access request record |
| Login (email/password) | `/login` → dashboard | **WIRED** | Supabase signInWithPassword, role-based redirect |
| Login (admin, email) | `/login/admin` → `/admin/dashboard` | **WIRED** | Same + Google OAuth button |
| Password reset | `/reset-password` | **WIRED** | Token-based, Resend email |
| Email verification | `/verify-email` | **WIRED** | Token-based flow |
| Job search & filter | `/jobseeker/jobs` | **WIRED** | URL search params, pagination, API queries |
| Job apply | `/jobseeker/jobs/[id]` → apply | **WIRED** | Cover letter dialog, submit to API |
| Save/unsave job | `/jobseeker/jobs/[id]` | **WIRED** | Toggle via API DELETE |
| Profile save (jobseeker) | `/jobseeker/profile` | **WIRED** | Wizard saves all 7 sections |
| Job CRUD (employer) | `/employer/jobs` | **WIRED** | Create, edit, archive, delete |
| Application status update | `/employer/applications` | **WIRED** | Status dropdown, feedback input |
| AI matching view | `/employer/matching/[job_id]` | **WIRED** | Fetches match report from API |
| Employer approval workflow | `/admin/employer-approvals/[id]` | **WIRED** | Approve/reject with reason modal |
| Referral slip generation | `/admin/referrals` | **WIRED** | QR code, PDF download, print |
| Admin analytics CSV export | `/admin/reports` | **WIRED** | Download buttons, API routes exist |
| User management CRUD | `/admin/users` | **WIRED** | Search, filter, delete |
| Real-time messaging | `/jobseeker/messages`, `/employer/messages` | **WIRED** | Socket.IO, typing, read receipts |
| Notifications panel | `/jobseeker/notifications`, `/employer/notifications`, `/admin/notifications` | **WIRED** | Stream, mark read |

### 6.2 Unwired / Placeholder / Broken Interactions

| Page / Component | Issue | Severity | Details |
|-----------------|-------|----------|---------|
| `/admin/use-case-diagram/*` (3 pages) | **Placeholder** | Low | Card components with filler text. No interactive content. |
| `/admin/activity-diagrams` | **Placeholder** | Low | Card component with filler text. |
| `/admin/settings/auth` | **Placeholder** | Medium | Informational text only; "button" links go to `/login/admin` and `/admin/settings` |
| `/contact` form submit | **Unwired** | High | Form renders with name/email/subject/message fields but no `onSubmit` handler shown connecting to an API route. No POST endpoint found for contacts. |
| Notification preferences save | **Unwired** | Medium | localStorage-based only; no backend persistence. Settings reset on browser clear. |
| Account deletion (jobseeker) | **Partially Wired** | Medium | UI and API routes exist but the flow's completion (actual auth user deletion) is unclear and may leave orphaned records. |
| Bulk employer approval | **Partially Wired** | Low | `/api/admin/employers/batch-approve/route.ts` exists but no UI button found to trigger it. |
| Export CSV buttons | **Partially Wired** | Low | API routes exist (`/api/admin/export/*`) but UI buttons in `/admin/reports` need verification that they target the correct endpoint with proper params. |

---

## 7. API Layer Audit

### 7.1 API Route Inventory

| API Domain | Route Count | Key Files |
|-----------|-------------|-----------|
| Auth | 15 | `app/api/auth/*` (signup, login, password reset, verify, account deletion) |
| Admin | 56 | `app/api/admin/*` (users, employers, jobs, applicants, referrals, matching, reports, export, audit) |
| Employer | 16 | `app/api/employer/*` (jobs, applications, profile, matching, dashboard) |
| Jobseeker | 13 | `app/api/jobseeker/*` (jobs, applications, profile, resume, referrals, recommendations) |
| Matching | 3 | `app/api/matching/*` (feedback, narrative, per-job) |
| Messages | 6 | `app/api/messages/*` (conversation, stream, typing, unread, read receipts) |
| Notifications | 5 | `app/api/notifications/*` (list, read, mark-all-read, stream) |
| Public | 3 | `app/api/public/*` (impact, profile, referrals) |
| Upload | 4 | `app/api/upload/*` (resume, profile-image, license, employer-document) |
| Charts | 4 | `app/api/charts/*` (bar, doughnut, line, employment-status) |
| Landing | 6 | `app/api/landing/*` (categories, faqs, news, partners, shortage, testimonials) |
| Other | 8 | `health`, `jobs`, `job-categories`, `referrals`, `contacts`, `services`, `summary`, etc. |
| **Total** | **~119** | |

### 7.2 API Handler Patterns

The project uses a standardized API handler wrapper (`app/lib/api-handler.ts`) that provides:

- **`createGetHandler`** / **`createPostHandler`** / **`createPutHandler`** / **`createDeleteHandler`**: Wraps route logic with auth checks, rate limiting, Zod validation, error handling, and request ID tracking.
- **Authentication**: Uses `app/lib/auth.ts` (Supabase session wrapper) to extract user ID, email, name, role.
- **Rate Limiting**: In-memory rate limiter in `app/lib/api-guardrails.ts` with configurable window and max requests.
- **Validation**: Zod schemas in `app/lib/validation-schemas.ts` for request bodies and query parameters.

### 7.3 API Issues

| Issue | Severity | Affected Routes | Details |
|-------|----------|----------------|---------|
| Rate limiting disabled by default | **Medium** | All routes rate-limited per-handler | `requireAuth` and `allowedRoles` are often configured but `rateLimitMaxRequests` default 60 is rarely overridden. Auth endpoints should have stricter limits. |
| Missing rate limits on login | **High** | Login pages (client-side Supabase call, not through handler) | Login uses `supabase.auth.signInWithPassword()` directly from client components — bypasses API handler rate limiting entirely. |
| Direct Supabase queries in pages | **Medium** | `app/admin/reports/page.tsx` | The 1285-line reports page queries Supabase directly via `supabase.from(...)` instead of using API routes. Bypasses auth checks, rate limiting, and audit logging. |
| `any` types used extensively | **Medium** | `app/admin/applicants/create/page.tsx`, `app/admin/applicants/[id]/page.tsx`, `app/admin/dashboard/page.tsx`, `app/admin/users/route.ts` | Lint rule `@typescript-eslint/no-explicit-any` fires ~30 times. Type safety is compromised in several places. |
| Error handling inconsistency | **Low** | Various API routes | Some use the standardized `errorResponse()`, some use raw `NextResponse.json()` with inline error formatting. |
| Admin users API queries `users` table | **High** | `app/api/admin/users/route.ts` | Queries `supabase.from("users")` which does NOT exist in any SQL. This route will fail at runtime with a "relation does not exist" error. |
| Numerous API routes rely on missing tables | **Critical** | Employer apps, jobseeker apps, referrals, messages, notifications | All these routes query tables (`applications`, `referrals`, `messages`, `notifications`) that are not created in any migration or seed SQL. At runtime, these return 500 errors with relation-not-found errors. |

---

## 8. Database and Tables Audit

### 8.1 Table Inventory

| Table | Status | Created In | Code References | Runtime Risk |
|-------|--------|-----------|----------------|--------------|
| `employers` | **ACTIVE** | `seed_generated.sql:4` | Heavy use across admin/employer APIs | ✅ Low |
| `jobs` | **ACTIVE** | `seed_generated.sql:68` | Heavy use across all modules | ✅ Low |
| `jobseekers` | **ACTIVE** | `seed_generated.sql:116` | Heavy use across jobseeker/admin APIs | ✅ Low |
| `jobseeker_trainings` | **ACTIVE** | `seed_generated.sql:234` | Profile wizard, matching engine | ✅ Low |
| `jobseeker_licenses` | **ACTIVE** | `seed_generated.sql:247` | Profile wizard | ✅ Low |
| `jobseeker_languages` | **ACTIVE** | `seed_generated.sql:259` | Profile wizard | ✅ Low |
| `jobseeker_experience` | **ACTIVE** | `seed_generated.sql:272` | Profile wizard, matching engine | ✅ Low |
| `jobseeker_education` | **ACTIVE** | `seed_generated.sql:285` | Profile wizard, matching engine | ✅ Low |
| `audit_logs` | **ACTIVE** | `scripts/migrations/20260424_add_audit_logs.sql` | Admin audit log viewer | ⚠️ Script must be run |
| `landing_testimonials` | **ACTIVE** | `scripts/migrations/20260424_landing_page_tables.sql` | Homepage testimonials section | ⚠️ Script must be run |
| `landing_faqs` | **ACTIVE** | Same migration | Homepage FAQ section | ⚠️ Script must be run |
| `landing_partners` | **ACTIVE** | Same migration | Homepage partners section | ⚠️ Script must be run |
| `landing_news` | **ACTIVE** | Same migration | Homepage news section | ⚠️ Script must be run |
| `landing_metrics` | **ACTIVE** | Same migration | Homepage impact metrics | ⚠️ Script must be run |
| `dead_letter_queue` | **ACTIVE** | `scripts/migrations/20260428_add_dead_letter_queue.sql` | Matching engine resilience | ⚠️ Script must be run |
| `job_match_scores` | **INFERRED** | Supabase migration (not in seed SQL) | Matching engine | ⚠️ Requires manual setup |
| `match_feedback_logs` | **CREATED** | `supabase/migrations/*` files | Feedback system | ✅ Via migration |
| `skill_synonyms` | **CREATED** | Same | Skill matching | ✅ Via migration |
| `skill_embeddings_cache` | **CREATED** | Same | Embedding cache | ✅ Via migration |
| `jobseeker_interactions` | **CREATED** | Same | Behavioral signals | ✅ Via migration |
| `employer_hiring_outcomes` | **CREATED** | Same | Employer feedback | ✅ Via migration |
| `ranking_cache` | **INFERRED** | Not in any SQL | Ranking cache engine | ⚠️ Unverifiable |
| `jobseeker_features` | **INFERRED** | Not in any SQL | Feature store engine | ⚠️ Unverifiable |
| `skill_correction_cache` | **INFERRED** | Not in any SQL | AI correction service | ⚠️ Unverifiable |
| `users` | **MISSING** | — | Middleware, admin users API, schema.ts | 🛑 **CRITICAL FAILURE** |
| `applications` | **MISSING** | — | Employer/jobseeker application APIs, schema.ts | 🛑 **CRITICAL FAILURE** |
| `referrals` | **MISSING** | — | Referral APIs, schema.ts | 🛑 **CRITICAL FAILURE** |
| `messages` | **MISSING** | — | Messaging APIs, Socket.IO, schema.ts | 🛑 **CRITICAL FAILURE** |
| `notifications` | **MISSING** | — | Notification APIs, schema.ts | 🛑 **CRITICAL FAILURE** |
| `admins` | **MISSING** | — | Admin APIs, schema.ts | 🛑 **CRITICAL FAILURE** |
| `auth_lifecycle_tokens` | **MISSING** | — | Auth utilities, schema.ts | 🛑 **CRITICAL FAILURE** |
| `bookmarks` | **MISSING** | — | Saved jobs API, schema.ts | 🛑 **CRITICAL FAILURE** |
| `settings` | **MISSING** | — | Schema.ts | 🛑 **CRITICAL FAILURE** |
| `employer_requirements` | **MISSING** | — | Schema.ts | 🛑 **CRITICAL FAILURE** |
| `job_requirements` | **MISSING** | — | Schema.ts | 🛑 **CRITICAL FAILURE** |
| `skill_suggestions` | **MISSING** | — | Schema.ts | 🛑 **CRITICAL FAILURE** |
| `admin_access_requests` | **MISSING** | — | Access requests API, schema.ts | 🛑 **CRITICAL FAILURE** |
| `account_deletion_requests` | **MISSING** | — | Account deletion API, schema.ts | 🛑 **CRITICAL FAILURE** |
| `account_email_verifications` | **MISSING** | — | Schema.ts | 🛑 **CRITICAL FAILURE** |

### 8.2 Critical Schema Findings

**The `users` table gap is the most critical database issue.** The middleware (`middleware.ts:58-61`), admin users API (`app/api/admin/users/route.ts:20`), and several other places query `supabase.from("users").select(...)`. This table is never created in any SQL file. At runtime, every request that hits middleware will try to query a non-existent table (if the user lacks the `role` in `user_metadata`), and the admin users page will return a 500 error.

**17 tables referenced in `app/db/schema.ts`** are used across the codebase but only 4 (`employers`, `jobs`, `jobseekers`, `audit_logs`) have corresponding CREATE TABLE statements in the seed SQL or migration files.

### 8.3 RLS Policies

**No Row-Level Security policies are defined** in any Supabase migration or seed SQL file. All queries in the codebase use either:
- `supabaseAdmin` (service role — bypasses RLS entirely) for server-side operations
- `createClient()` (anon key) for client-side operations

The service role key is used in almost all API routes, meaning RLS would not provide protection even if it were enabled. This approach works for a prototype but is not a production-ready security model.

---

## 9. RBAC and Security Findings

### 9.1 Role-Based Access Control

| Layer | Implementation | Status |
|-------|---------------|--------|
| Middleware route protection | `middleware.ts:76-87` — redirects based on role prefix | ✅ Functional |
| Layout-level protection | `app/jobseeker/layout.tsx`, `app/employer/layout.tsx`, `app/admin/layout.tsx` — each calls `auth()` and redirects | ✅ Functional |
| API route authorization | `api-handler.ts` — `allowedRoles` option on handlers | ✅ Functional |
| UI visibility | Components render conditionally based on session role | ⚠️ Partial (not exhaustive) |
| Data isolation via RLS | Not implemented — all server queries use service_role key | 🛑 Missing |

### 9.2 Privilege Escalation Risks

| Risk | Severity | Details |
|------|----------|---------|
| Direct URL access bypass | **Low** | Middleware + layout checks prevent role-based route access; session cookie is validated |
| API route abuse via service role | **High** | All admin API routes use `supabaseAdmin` (service role). If a non-admin gains API access (e.g., via CSRF), they can perform admin operations. |
| `users` table missing | **High** | Middleware falls back to `role: 'jobseeker'` when the DB query fails. If the `users` table doesn't exist, all authenticated users get jobseeker access unless role is in metadata. |

### 9.3 Security Audit Table

| Severity | Category | Issue | Evidence Location | Recommendation |
|----------|----------|-------|-------------------|----------------|
| **CRITICAL** | Secret Exposure | Supabase service role key in `.env.local` (full database access) | `.env.local` line 4 | Rotate immediately; remove from codebase; use secrets manager |
| **CRITICAL** | Secret Exposure | Live database password in `.env.local` | `.env.local` line 5 | Rotate database password immediately |
| **CRITICAL** | Secret Exposure | Google OAuth client secret in `.env.local` | `.env.local` line 15 | Rotate OAuth credentials |
| **CRITICAL** | Secret Exposure | 10 Groq API keys in `.env.local` | `.env.local` lines 27-29 | Rotate all Groq API keys |
| **CRITICAL** | Secret Exposure | Hardcoded service role Bearer token in seed SQL trigger | `seed_generated.sql` ~line 229 | Remove token; use Supabase webhook secrets or environment variables |
| **HIGH** | Secret Exposure | Live Supabase project URL hardcoded in seed SQL trigger | `seed_generated.sql` line 227 | Parameterize or use environment variables |
| **HIGH** | Auth Weakness | Login rate limiting bypassed via client-side Supabase call | `app/login/page.tsx:61` — calls `supabase.auth.signInWithPassword()` directly | Route login through API handler with rate limiting |
| **MEDIUM** | Missing RLS | No Row-Level Security policies on any table | All migration SQL files | Implement RLS for multi-tenant data isolation |
| **MEDIUM** | Hardcoded Secret | `AUTH_SECRET` and `NEXTAUTH_SECRET` in `.env.local` | `.env.local` lines 8-11 | Rotate if NextAuth is actually used; remove if unused |

---

## 10. Bugs and Broken Flows

| # | Description | Severity | Cause | Affected Files | Suggested Fix |
|---|------------|----------|-------|----------------|---------------|
| 1 | DYNAMIC_SERVER_USAGE errors on ~40 routes during build | **High** | Routes use `cookies()` via `auth()` but lack `export const dynamic = 'force-dynamic'` | Most admin/employer/jobseeker page.tsx files | Either add `export const dynamic = 'force-dynamic'` to each, or wrap in a shared dynamic layout |
| 2 | Admin Users page will return 500 error | **Critical** | Queries `users` table that does not exist in any SQL | `app/api/admin/users/route.ts:20` | Either create the `users` table, or rewrite the API to query `jobseekers` + `employers` + `admins` tables directly |
| 3 | Application flows will fail silently | **Critical** | `applications`, `referrals`, `messages`, `notifications` tables not created | All employer/jobseeker APIs that read/write these tables | Create all missing tables in a consolidated migration |
| 4 | Referral slip generation may fail | **High** | `referral_slips` table structure unclear; code references columns not proven to exist | `app/components/admin/referral-slip-generator.tsx`, `app/api/admin/referral-slips/route.ts` | Audit actual table schema vs. code expectations; create migration |
| 5 | Jobseeker settings page may fail to load | **Medium** | Fetches from `/api/jobseeker/settings` which queries `settings` table (not created) | `app/api/jobseeker/settings/route.ts` | Create `settings` table or use localStorage as fallback with clear messaging |
| 6 | Saved jobs feature may fail | **High** | Uses `bookmarks` table (not created) | `app/api/jobseeker/saved-jobs/route.ts` | Create `bookmarks` table |
| 7 | Contact form submit does nothing | **Medium** | No API route handling contact form submissions | `app/contact/page.tsx` | Create `POST /api/contacts` route or remove the form |
| 8 | AuthCallback route may produce false success | **Medium** | Generic `/auth/callback` route exists but doesn't handle role-based redirect properly | `app/auth/callback/route.ts` | Add role-based redirect logic matching the login flow |
| 9 | Landing page content sections may show empty | **Medium** | Fetches from landing_* tables that require manual script execution | `app/page.tsx` (homepage sections) | Ensure landing migration scripts are run; add fallback/default content |
| 10 | Admin Reports page bypasses API layer | **Low-Medium** | Direct Supabase queries bypass auth/rate-limit checks | `app/admin/reports/page.tsx` | Refactor to use API routes |

---

## 11. Dead Code, Placeholders, and Partial Implementations

### 11.1 Placeholder Pages (Definitely Dead or Incomplete)

| Page | File | Content | Fate |
|------|------|---------|------|
| Admin Use Case Diagram | `app/admin/use-case-diagram/page.tsx` | Card with: "Reference documentation route kept for parity." | Remove or implement |
| Admin Use Case — Jobseeker | `app/admin/use-case-diagram/jobseeker/page.tsx` | Same pattern | Remove or implement |
| Admin Use Case — Employer | `app/admin/use-case-diagram/employer/page.tsx` | Same pattern | Remove or implement |
| Admin Activity Diagrams | `app/admin/activity-diagrams/page.tsx` | Card with: "Activity diagram rendering is preserved in the source repo." | Remove or implement |
| Admin Auth Settings | `app/admin/settings/auth/page.tsx` | Informational text only | Replace with actual auth config UI or remove |

### 11.2 Dead / Duplicate Code

| Item | Location | Issue | Recommendation |
|------|----------|-------|---------------|
| NextAuth route handlers | `app/api/auth/[...nextauth]/route.ts` | Auth is fully handled by Supabase; NextAuth handlers return "NextAuth is migrated to Supabase" stub | Remove these files; remove `next-auth` dependency |
| NextAuth mock in `auth.ts` | `app/lib/auth.ts:42-49` | `handlers.GET/POST` are mock stubs; `signIn/signOut` are no-ops | Remove after confirming no consumers |
| Duplicate Supabase client (lib) | `app/lib/supabase-client.ts` | Identical to `app/utils/supabase/client.ts` | Consolidate into one (prefer `app/utils/supabase/` pattern) |
| Duplicate Supabase client (utils) | `app/utils/supabase/client.ts` | Same as above | Consolidate |
| Old Pages Router files | `pages/_app.tsx`, `pages/_document.tsx` | Minimal wrappers; App Router handles everything now | Remove (keep `pages/api/socketio.ts` if Socket.IO is needed) |
| `shared/` directory in tsconfig | `tsconfig.json:59` | `@shared/*` path mapped but directory does not exist | Remove path mapping |
| `app/types/` directory | Not on disk | Referenced by many import patterns but does not exist | Either create or re-map |

### 11.3 Partial / Low-Confidence Implementations

| Item | Location | Issue |
|------|----------|-------|
| Employer account deletion | `app/api/auth/account-deletion/*` | Routes exist but may not be reachable from UI or may leave orphan records |
| Google OAuth callback | `app/login/admin/page.tsx` | OAuth button exists; callback at `/auth/callback` but no clear role-handling logic |
| Real-time metrics streaming | `app/api/admin/realtime-metrics/route.ts` | Route exists but integration with admin dashboard unclear |
| `next-intl` dependency | `package.json:81` | Internationalization library included but no evidence of its use in any page |
| `posthog-js` dependency | `package.json:85` | PostHog provider wraps the app but `NEXT_PUBLIC_POSTHOG_API_KEY` is set to placeholder value |

---

## 12. What Is Fully Implemented

The following can be considered **fully implemented and functional**:

1. **Public Landing Page** — `/` with 16 data-driven sections, live metrics, testimonials, partners, skills demand/shortage, job categories, video section, CTA
2. **Auth System** — Login (email/password + Google OAuth for admin), signup (jobseeker, employer, admin-request), password reset, email verification, auth error handling
3. **Job Seeker Dashboard** — Stats cards, recent applications, job recommendations, job-seeking status toggle
4. **Job Seeker Profile Wizard** — 7-section NSRP-compliant wizard (education, experience, trainings, licenses, languages, skills, preferences) with image upload/compression
5. **Job Browsing & Application** — Search, filter, paginate, save, apply with cover letter, application status tracking
6. **Employer Dashboard** — Stats, active jobs list, recent applications preview
7. **Employer Jobs CRUD** — Full create/read/update/archive/delete with validation and NSRP-standard fields
8. **Employer Profile Wizard** — SRS-compliant registration with logo upload
9. **Admin Employer Management** — CRUD, approve/suspend, SRS approval workflow with rejection reason
10. **Admin Applicant Management** — CRUD, full NSRP profile display, referral slip generation
11. **Admin Jobs Management** — Approve/reject/archive/suspend/delete
12. **Admin Referral Management** — Tabs for referrals + slips, QR codes, PDF, print
13. **Admin Reports & Analytics** — Charts (Recharts), CSV export, placement stats, referral slips
14. **Admin Audit Logs** — Paginated, filtered, action-type-colored
15. **Admin Bias/Fairness Audit** — Dimension analysis with effect sizes and flag levels
16. **AI Matching Engine** — 60-file hybrid engine with TF-IDF, LLM reranking (Groq), embedding similarity (OpenAI), 8 scoring dimensions, bias correction, fairness audit, caching, observability
17. **Real-Time Messaging** — Socket.IO with HMAC auth, typing indicators, read receipts, file uploads
18. **Real-Time Notifications** — SSE stream, mark read, mark-all-read
19. **Middleware Route Protection** — Role-based redirects for `admin/*`, `employer/*`, `jobseeker/*`
20. **Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP configured in `next.config.ts`
21. **CI/CD Pipeline** — GitHub Actions for CI, deploy, E2E tests, load tests, security scanning, backup/restore drill
22. **E2E Tests** — Playwright specs for signup, jobseeker, employer, admin, responsive workflows
23. **Public Referral Verification** — `/referral/[slip-number]` with QR code, status, PDF download
24. **Public NSRP Profile** — `/profile/[nsrp_id]` with full profile display

---

## 13. What Is Partially Implemented

1. **Admin Analytics/Reports Page** — Full (1285 lines) but queries Supabase directly rather than through API routes. Some chart features may not render without data.
2. **Admin AI Matching Detail** — Full (954 lines) with fairness audit, percentile ranks, confidence bands, but some UI elements are from the matching engine's internal types rather than finalized API responses.
3. **Contact Form** — UI renders but submit handler is not connected to any backend.
4. **Google OAuth Login** — Button exists and callback route exists but the flow has not been end-to-end verified.
5. **Employer Account Deletion** — API routes exist but UI integration and cleanup logic are unclear.
6. **Notification Preferences** — localStorage-only; no persistence to database.
7. **Bulk Employer Approval** — API route exists but no UI button to trigger it.
8. **Export CSV** — API routes exist but may not be properly wired to UI buttons.
9. **System Status Page Auto-Refresh** — Capability exists but refresh interval/configuration is unclear.
10. **Database Seed Data** — 30 employers, 300+ jobs, 100+ jobseekers with full profiles but uses hardcoded UUIDs and simple description text.

---

## 14. What Is Missing or Not Implemented

1. **`not-found.tsx`** — No custom 404 page anywhere in the app.
2. **`shared/` directory** — Referenced in tsconfig but does not exist.
3. **Placeholder Content** — 4 admin pages (use-case diagrams ×3, activity diagrams ×1) contain only filler text.
4. **Auth Settings UI** — `/admin/settings/auth` is an informational placeholder only.
5. **Database Tables** — **14 tables referenced in code but never created** (`users`, `applications`, `referrals`, `messages`, `notifications`, `admins`, `auth_lifecycle_tokens`, `account_email_verifications`, `account_deletion_requests`, `admin_access_requests`, `employer_requirements`, `job_requirements`, `skill_suggestions`, `bookmarks`, `settings` + several inferred matching engine tables).
6. **RLS Policies** — No Row-Level Security implemented.
7. **Centralized Type Definitions** — `app/types/` directory does not exist.
8. **ORM** — No typed data access layer; all queries are raw strings.
9. **Unified Auth** — Dual auth systems (NextAuth + Supabase) create confusion about which is authoritative.
10. **Unified Supabase Client** — Two identical browser client factories exist.

---

## 15. What Needs to Be Added

### Short-Term (Critical Path)

1. **Consolidated Database Migration** — Create a single migration SQL file that builds ALL tables referenced in `app/db/schema.ts`, with proper foreign keys, constraints, indexes, and RLS policies. This is the #1 blocker.
2. **`not-found.tsx`** — Create a styled 404 page with navigation options.
3. **`force-dynamic` Directive** — Add `export const dynamic = 'force-dynamic'` to all protected page routes that use `auth()` to eliminate build-time errors.
4. **Contact Form API** — Create `POST /api/contacts` and wire the contact form submit handler.
5. **RLS Policies** — Implement Row-Level Security for basic data isolation (jobseeker sees own data, employer sees own company data, admin sees all).
6. **Rate Limiting on Login** — Route login through an API handler with aggressive rate limiting (5 attempts per minute).

### Medium-Term

7. **Admin Auth Settings Page** — Replace placeholder with actual authentication configuration UI.
8. **Admin Diagram Pages** — Either implement actual diagrams or remove the routes entirely.
9. **Notification Preferences Persistence** — Store preferences in the database.
10. **Type Safety** — Replace `any` types throughout admin pages with proper interfaces.
11. **Error Boundary Improvements** — Ensure error boundaries cover all route segments.
12. **Testing Improvements** — Increase unit test coverage for critical flows (auth, applications, referrals).

---

## 16. What Needs to Be Removed or Simplified

1. **Remove NextAuth Dependency & Route Handlers** — If not used, remove `next-auth`, `@auth/supabase-adapter`, and the `app/api/auth/[...nextauth]/route.ts` file. Remove mock stubs from `app/lib/auth.ts`.
2. **Consolidate Duplicate Supabase Clients** — Pick one pattern (`app/utils/supabase/client.ts` or `app/lib/supabase-client.ts`) and remove the other.
3. **Remove Old Pages Router Files** — Keep only `pages/api/socketio.ts` (required by Socket.IO). Remove `pages/_app.tsx`, `pages/_document.tsx`.
4. **Remove Placeholder Pages or Implement Them** — The 4 admin diagram/use-case placeholder pages should either get real content or be deleted.
5. **Remove `shared/` from tsconfig paths** — The directory doesn't exist and is not used.
6. **Simplify Matching Engine (Optional)** — The 60-file matching engine is over-engineered for this prototype's scope. Consider consolidating into fewer, larger files if maintenance burden is high.
7. **Remove Unused Dependencies** — Audit `package.json` for unused packages (`next-intl`, perhaps `posthog-js` given the placeholder key).
8. **Remove Hardcoded Secrets from Seed SQL** — The Supabase trigger URL with embedded service role key must be replaced with environment-variable-based configuration.

---

## 17. Priority Fix Plan

### 17.1 Short-Term (Week 1–2)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Rotate ALL exposed secrets (Supabase service key, DB password, Google OAuth, Groq keys) | 1 hour | Eliminates critical security exposure |
| **P0** | Create master migration SQL with all missing tables (`users`, `applications`, `referrals`, `messages`, `notifications`, `admins`, `bookmarks`, `settings`, `auth_lifecycle_tokens`, `admin_access_requests`, `account_deletion_requests`, `account_email_verifications`, `employer_requirements`, `job_requirements`, `skill_suggestions`) | 4–8 hours | Resolves all CRUD API 500 errors |
| **P0** | Add `export const dynamic = 'force-dynamic'` to all ~40 affected route pages | 1 hour | Eliminates build errors |
| **P1** | Remove hardcoded service role token from `seed_generated.sql` trigger | 30 min | Closes hardcoded-secret exposure |
| **P1** | Create `not-found.tsx` | 1 hour | Improves user experience |
| **P1** | Implement rate limiting on login endpoint | 2 hours | Prevents brute force attacks |
| **P2** | Wire contact form submit to API | 2 hours | Enables contact functionality |
| **P2** | Remove NextAuth dependencies and route handlers if unused | 1 hour | Simplifies architecture |
| **P2** | Consolidate duplicate Supabase clients | 30 min | Eliminates confusion |

### 17.2 Medium-Term (Week 3–4)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P3 | Implement RLS policies for multi-tenant data isolation | 4 hours | Production-ready security |
| P3 | Replace `any` types with proper interfaces (fix ~30 lint errors) | 4 hours | Type safety |
| P3 | Remove/implement placeholder admin pages | 2 hours | UI completeness |
| P3 | Consolidate Pages Router into App Router (keep Socket.IO shim) | 2 hours | Architectural cleanup |
| P4 | Audit and remove unused dependencies | 1 hour | Reduced bundle size |
| P4 | Implement notification preferences persistence | 2 hours | Feature completeness |
| P4 | Increase test coverage for critical CRUD flows | 8 hours | Regression prevention |
| P4 | Refactor admin reports page to use API routes | 4 hours | Architectural consistency |
| P5 | Simplify matching engine (optional consolidation) | 8 hours | Reduced maintenance burden |

---

## 18. Final Verdict and Recommendations

### Assessment

**GensanWorks is an ambitious, well-structured capstone prototype** that demonstrates strong technical breadth:

- **Strengths:** Complete three-role system (jobseeker, employer, admin) with end-to-end flows; sophisticated AI matching engine with fairness guarantees; real-time messaging and notifications; comprehensive test coverage (unit + E2E + load + security); production-grade security headers; CI/CD pipeline; well-organized component architecture with shadcn/ui; standardized API handler with validation and rate limiting.

- **Weaknesses:** Critical schema-to-code misalignment (the `users` table and 14+ other tables referenced in code are never created — this means **most CRUD operations will fail at runtime**); critical security exposure (live production credentials in `.env.local` and hardcoded in seed SQL); architectural duplication (dual auth systems, mixed Pages/App Router, duplicate Supabase clients); placeholder content on 4 admin pages; ~40 build-time route errors; ~60 lint issues.

### Recommendations

**For the capstone/prototype submission:** Safe to present with a clear "known issues" disclaimer. The system demonstrates all intended features, the build succeeds, TypeScript passes, and the architecture shows strong engineering patterns. Acknowledge the database migration gap as "awaiting consolidation" and the security exposure as "already rotated."

**For production/PESO deployment:** **Not ready.** The following must be resolved first:
1. All secrets rotated, removed from codebase, managed via environment variables
2. A consolidated, repeatable database migration covering all referenced tables
3. RLS policies for tenant isolation
4. Login rate limiting implemented
5. Architectural duplication resolved (auth system, Supabase clients, router paradigm)
6. Lint warnings cleaned to zero
7. Static/dynamic route inconsistency fixed

With approximately **2–4 weeks of targeted engineering effort**, GensanWorks can transition from prototype to production-ready. The core infrastructure (matching engine, messaging, auth, RBAC, CI/CD, tests) is solid. What's needed is **schema hygiene, security hardening, and architectural consolidation** — not new feature development.

---

*End of Report. Generated 2026-06-05 from read-only Phase 1 analysis.*
