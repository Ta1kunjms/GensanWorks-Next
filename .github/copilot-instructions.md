# GitHub Copilot Instructions for GensanWorks-Next
## Anti-Hallucination & Phase 0-9 Execution Contract

**Last Updated**: March 29, 2026  
**Project**: GensanWorks-Next (Next.js 15 + TypeScript + NextAuth v5 + Drizzle ORM + PostgreSQL)  
**Purpose**: Prevent hallucination. Enable end-to-end Phase 0-9 execution with integrity, traceability, and zero wasted effort.

---

## I. ANTI-HALLUCINATION CONTRACT

### Rule 1: Evidence-First, No Fabrication
- **MUST**: Every claim about code, file paths, APIs, or behavior must be validated by reading the actual file or executing a command
- **MUST**: Use `read_file`, `file_search`, `grep_search`, or `runSubagent(Explore)` before making codebase edits
- **NEVER**: Assume file existence, assume the shape of a function, assume how a test works, or guess at API endpoints
- **NEVER**: Fabricate npm scripts, file paths, function signatures, or database schemas

**Example of CORRECT behavior:**
```
User: "Add a new endpoint for job listings"
Agent: [Reads app/api/jobs/route.ts if it exists, or confirms it does NOT exist]
Agent: [Reads app/db/schema.ts to confirm job table structure]
Agent: [Reads existing endpoint like app/api/jobseeker/profile/route.ts to understand pattern]
Agent: [Only then creates the new endpoint following the validated pattern]
```

**Example of INCORRECT behavior (HALLUCINATION):**
```
User: "Add a job listings endpoint"
Agent: "I'll create app/api/public/jobs/route.ts following the pattern in app/api/admin/jobs/route.ts"
❌ Never validated that app/api/admin/jobs/route.ts exists or its pattern
❌ Never checked if app/api/public/ directory exists
❌ Never read the actual schema to confirm job table fields
```

### Rule 2: Traceable Decisions
- **MUST**: Every code change must be justified by tracing to a Phase exit criterion, a bug fix, or an explicit user request
- **MUST**: Every commit message must include:
  - Conventional commit prefix (feat, fix, docs, test, refactor, ops, chore)
  - Scope (e.g., auth, jobs, admin, upload)
  - Concise description (what + why)
  - Optional body with technical details or Phase reference
  
**Example GOOD commit:**
```
feat(jobs): add public job browse and detail endpoints (Phase 3)

- Implement GET /api/jobs (list with pagination, filters, search)
- Implement GET /api/jobs/[id] (detail with employer contact)
- Add rate limiting via guardrails middleware
- Tests: 8 new unit tests covering filters and pagination
Exit Criterion: User can view public jobs without authentication
```

**Example BAD commit:**
```
update jobs
(no scope, no phase, no justification, no details)
```

### Rule 3: No Assumptions About Intent
- **MUST**: When multiple interpretations exist, ask clarifying questions before proceeding
- **NEVER**: Override the Phase 0-9 roadmap unless explicitly requested by the user with a specific reason
- **NEVER**: Skip verification steps or testing because "we're in a hurry"

**When in doubt:**
```typescript
// CORRECT: Halts and asks
"I found 3 possible locations for job endpoints. Before proceeding, clarify:
1. Should new endpoints go in app/api/jobs/ or app/api/public/jobs/?
2. Is rate limiting required for anonymous users?
3. Should response include employer contact details?"

// INCORRECT: Guesses and proceeds
"I'll put the endpoint in app/api/public/jobs/route.ts with rate limiting disabled"
```

---

## II. PHASE 0-9 ROADMAP WITH EXIT CRITERIA

### Phase 0: Foundation & Infrastructure (Status: ~80% COMPLETE)
**Objective**: Initialize Next.js 15 project, set up database, auth scaffolding, deployment target

**Exit Criteria**:
- [x] Next.js 15 + TypeScript project initialized with path aliases
- [x] Drizzle ORM configured, migrations auto-generated from schema
- [x] PostgreSQL Supabase project ready (manual: create Project, storage buckets, copy connection URL)
- [x] NextAuth.js v5 beta configured with Credentials + Google OAuth strategies
- [x] Middleware guards protect role-based routes (/admin, /employer, /jobseeker)
- [x] Database migrations 0001-0004 created (notifications scope, messages scope, auth tokens, deletion)
- [x] Environment variables documented in .env.example and PHASE_0_SETUP.md
- [x] npm scripts working: dev, build, start, lint, type-check, test
- [ ] **MANUAL**: Run `npm run db:push` to apply all migrations to Supabase
- [ ] **MANUAL**: Populate .env.local with Supabase project credentials
- [ ] **MANUAL**: Verify `npm run dev` opens http://localhost:3000 without errors

**Files/Artifacts**:
- `app/lib/auth.ts` — NextAuth config, secret handling, role checks
- `middleware.ts` — Route guards
- `app/db/schema.ts` — Drizzle schema (14 tables with FK constraints)
- `.env.example` — Template for secrets and URLs
- `PHASE_0_SETUP.md` — Supabase setup guide
- `migrations/` — SQL migration files 0001-0004

**Key Scripts**:
```bash
npm run db:push      # Apply migrations to Supabase
npm run db:pull      # Refresh schema from database
npm run db:studio    # Open Drizzle Studio
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run type-check   # Verify TypeScript (no errors required before commit)
npm run lint         # ESLint check (warnings OK, errors block commit)
```

---

### Phase 1: Authentication & Account Management (Status: ✅ COMPLETE)
**Objective**: Robust auth flows, account security, role-based access control

**Exit Criteria**:
- [x] NextAuth session management with role-based guards
- [x] Credentials login (email + password with bcrypt)
- [x] Google OAuth signup/login
- [x] Email verification (request → send token → confirm via link)
- [x] Password reset (request → send token → confirm → update)
- [x] Account deletion workflow (request → 7-day grace → admin approval → permanent delete)
- [x] Change password endpoint with auth guardrails
- [x] Service worker for offline auth state
- [x] Rate limiting on auth endpoints (5 reqs/min per IP for login, 3/min for signup)
- [x] Request ID tracking for all auth operations
- [x] Admin access-request system (non-admin users request → admin approves/rejects)
- [x] Admin can delete user accounts manually
- [x] Post-auth redirect to role-specific dashboard
- [x] Unit tests for auth, guardrails, account deletion (8+ tests, all passing)
- [x] Auth smoke test verifies session, redirects, service worker

**Files/Artifacts**:
- `app/lib/auth.ts` — NextAuth configuration, role checks, secrets handling
- `app/lib/api-guardrails.ts` — Rate limiting, request IDs, IP extraction
- `app/lib/auth-account-tokens.ts` — Account deletion token logic
- `app/lib/auth-email.ts` — Email sending templates
- `app/(auth)/login/page.tsx` — Login UI (credentials + Google buttons)
- `app/(auth)/signup/jobseeker/page.tsx` — Jobseeker signup
- `app/(auth)/signup/employer/page.tsx` — Employer signup
- `app/(auth)/signup/admin-request/page.tsx` — Admin access request
- `app/(auth)/verify-email/page.tsx` — Email verification confirmation
- `app/(auth)/verify-email/reset-password/page.tsx` — Password reset confirm
- `app/api/auth/signup/*` — Signup endpoints (jobseeker, employer, admin-request)
- `app/api/auth/verify-email/*` — Verify email endpoints (request, confirm)
- `app/api/auth/reset-password/*` — Reset password endpoints (request, confirm)
- `app/api/auth/change-password/route.ts` — Change password
- `app/api/auth/account-deletion/*` — Account deletion (request, cancel, process)
- `app/api/admin/access-requests/*` — Admin access request endpoints
- `app/api/admin/account-deletion/process/route.ts` — Admin delete user
- `app/components/account-security-panel.tsx` — Account security UI component
- `public/sw.js` — Service worker for offline auth
- `tests/api-guardrails.test.ts` — Unit tests (5+ passing)
- `scripts/auth-smoke-check.js` — Smoke test runner
- `scripts/reset-admin-password.js` — Admin password reset utility
- `scripts/bootstrap-role-passwords.js` — Bootstrap initial passwords

**Key Scripts**:
```bash
npm run auth:smoke          # Run auth smoke test (session, redirects, SW)
npm run auth:bootstrap-passwords     # Reset all role passwords for testing
npm test                    # Run all unit tests (including api-guardrails)
```

**Committed Commits** (origin/main):
- `ce86cee` — auth(core): harden secret handling and login flow
- `864b7d0` — auth(api): add rate limits, request IDs, and lifecycle hardening
- `4a65559` — admin(security): harden access-request and deletion control
- `1a054da` — ops(auth): harden scripts and add auth guardrail coverage
- `4436a13` — docs(config): align auth setup docs and test scripts

---

### Phase 2: Dashboard & Role-Specific Views (Status: IN PROGRESS)
**Objective**: User dashboards tailored to role (jobseeker, employer, admin)

**Exit Criteria**:
- [ ] Jobseeker dashboard: job recommendations, active applications, saved jobs, profile completeness
- [ ] Employer dashboard: job postings overview, applications count, referral stats, analytics
- [ ] Admin dashboard: system metrics, user counts, access requests queue, flagged accounts
- [ ] Real-time metrics (Postgres LISTEN/NOTIFY via polling or SSE)
- [ ] Mobile responsive design (Tailwind md:, lg: breakpoints)
- [ ] Unit tests for dashboard data fetching

**Files/Artifacts**:
- `app/jobseeker/dashboard/page.tsx`
- `app/employer/dashboard/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/lib/realtime-metrics.ts` — Metrics polling/SSE
- `app/components/dashboard-cards.tsx` — Reusable dashboard UI components
- `app/components/live-nav-badges.tsx` — Real-time notification badges

**Uncommitted Working Tree**: Components and pages partially implemented, awaiting Phase 2 commit

---

### Phase 3: Public Job Browsing & Application (Status: NOT STARTED - BLOCKING)
**Objective**: Anonymous users can browse jobs, jobseekers can apply for jobs

**CRITICAL**: Phase 3 MUST be completed before Phase 4 (employer workflows depend on jobs existing)

**Exit Criteria**:
- [ ] GET /api/jobs — List all open jobs with pagination, search, filters (salary range, location, job type)
- [ ] GET /api/jobs/[id] — Detail view with employer name, description, requirements, apply button
- [ ] POST /api/jobs/[id]/apply — Submit application (jobseeker only, rate limited, validation)
- [ ] GET /api/jobseeker/applications — User's applications list with status (applied, shortlisted, rejected, offered)
- [ ] Jobseeker can upload resume (app/api/upload/resume/route.ts)
- [ ] Jobseeker can upload profile image (app/api/upload/profile-image/route.ts)
- [ ] Jobseeker can view and edit profile (app/api/jobseeker/profile/route.ts)
- [ ] Job search UI (client-side filtering, debounced API calls)
- [ ] Application detail view (status, timeline, employer feedback)
- [ ] Rate limiting: 10 applications per day per jobseeker
- [ ] Unit tests for job list, search, apply logic

**Files/Artifacts**:
- `app/api/jobs/route.ts` — GET /api/jobs
- `app/api/jobs/[id]/route.ts` — GET /api/jobs/[id]
- `app/api/jobs/[id]/apply/route.ts` — POST apply
- `app/api/jobseeker/profile/route.ts` — Jobseeker profile
- `app/api/jobseeker/applications/route.ts` — User's applications
- `app/api/upload/profile-image/route.ts` — Profile image upload
- `app/api/upload/resume/route.ts` — Resume upload
- `app/jobseeker/jobs/page.tsx` — Job browse UI
- `app/jobseeker/jobs/[id]/page.tsx` — Job detail + apply button
- `app/jobseeker/applications/page.tsx` — Applications list
- `app/jobseeker/profile/page.tsx` — Profile edit
- `app/jobseeker/layout.tsx` — Jobseeker layout with sidebar
- `tests/jobs-api.test.ts` — Job API tests

**Uncommitted Working Tree**: Partial implementation exists, ready to complete and commit

---

### Phase 4: Employer Job & Application Management (Status: NOT STARTED - DEPENDS ON PHASE 3)
**Objective**: Employers post jobs, view applications, manage referrals

**Exit Criteria**:
- [ ] POST /api/employer/jobs — Create job posting
- [ ] GET /api/employer/jobs — List employer's jobs with draft/published status
- [ ] PATCH /api/employer/jobs/[id] — Edit job (if not yet published)
- [ ] DELETE /api/employer/jobs/[id] — Archive/delete job
- [ ] GET /api/employer/applications — List applications for all employer's jobs
- [ ] PATCH /api/employer/applications/[id] — Update application status (shortlist, reject, offer)
- [ ] GET /api/employer/applications/[id] — Application detail view
- [ ] POST /api/employer/applications/[id]/message — Send feedback to applicant
- [ ] Referral system: POST /api/referrals — Create referral link, track referral conversions
- [ ] Employer can edit profile (app/api/employer/profile/route.ts)
- [ ] Analytics: GET /api/employer/summary — Jobs posted, applications count, hire rate
- [ ] Rate limiting: 50 applications/day per employer
- [ ] Unit tests for job creation, application updates, referrals

**Files/Artifacts**:
- `app/api/employer/jobs/route.ts`
- `app/api/employer/jobs/[id]/route.ts`
- `app/api/employer/applications/route.ts`
- `app/api/employer/applications/[id]/route.ts`
- `app/api/referrals/route.ts`
- `app/api/employer/profile/route.ts`
- `app/api/employer/summary/route.ts`
- `app/employer/jobs/page.tsx`
- `app/employer/jobs/[id]/applications/page.tsx`
- `app/employer/profile/page.tsx`
- `app/employer/layout.tsx`
- `tests/employer-api.test.ts`

**Uncommitted Working Tree**: Partial implementation exists, ready to complete and commit

---

### Phase 5: Messaging & Notifications (Status: NOT STARTED)
**Objective**: Users can message each other, receive push notifications

**Exit Criteria**:
- [ ] POST /api/messages — Send message (authenticated users)
- [ ] GET /api/messages?user_id=X — User's message threads
- [ ] WebSocket or SSE for real-time message delivery
- [ ] POST /api/notifications — Create notification
- [ ] GET /api/notifications — User's notifications with read status
- [ ] PATCH /api/notifications/[id] — Mark as read
- [ ] Push notification subscribe/send (Service Worker)
- [ ] Notifications for: new application, application status change, message received, job match
- [ ] Rate limiting: 100 messages/day per user
- [ ] Unit tests for message send, notification creation

**Files/Artifacts**:
- `app/api/messages/route.ts`
- `app/api/notifications/route.ts`
- `app/api/contacts/route.ts` (Contacts list for messaging)
- `app/lib/notifications.ts` — Notification dispatch logic
- `app/components/messages-panel.tsx`
- `app/components/notifications-panel.tsx`
- `app/jobseeker/messages/page.tsx`
- `app/jobseeker/notifications/page.tsx`
- `app/employer/messages/page.tsx`
- `app/employer/notifications/page.tsx`
- `tests/messaging-api.test.ts`

**Uncommitted Working Tree**: Partial implementation exists (components drafted)

---

### Phase 6: Admin Analytics & Reporting (Status: NOT STARTED)
**Objective**: Admins monitor system health, user growth, hiring metrics

**Exit Criteria**:
- [ ] GET /api/admin/analytics — System-wide metrics (user count, jobs posted, applications, hire rate)
- [ ] GET /api/admin/analytics/timeline — Time-series data for charts
- [ ] GET /api/admin/employers — List all employers with compliance status
- [ ] GET /api/admin/jobs — All jobs with filters and search
- [ ] Admin dashboard with charts: user growth, applications over time, hire rate, referral performance
- [ ] CSV export for analytics data
- [ ] Audit logs: track admin actions and data deletions
- [ ] Unit tests for analytics aggregation

**Files/Artifacts**:
- `app/api/admin/analytics/route.ts`
- `app/api/admin/summary/route.ts`
- `app/api/admin/employers/route.ts`
- `app/api/admin/jobs/route.ts`
- `app/admin/analytics/page.tsx`
- `app/components/employment-status-chart.tsx` (or similar)
- `tests/admin-analytics.test.ts`

**Uncommitted Working Tree**: Partial API routes drafted

---

### Phase 7: E2E Testing & Quality Assurance (Status: NOT STARTED)
**Objective**: End-to-end test suite verifying all user workflows

**Exit Criteria**:
- [ ] E2E test: Jobseeker signup → complete profile → browse jobs → apply → receive notification
- [ ] E2E test: Employer signup → post job → receive application → send offer
- [ ] E2E test: Admin deletes spam user → audit log recorded
- [ ] E2E tests use Playwright or Cypress
- [ ] CI/CD integration (GitHub Actions): run E2E on PR
- [ ] All tests pass before merge (no manual QA bypass)
- [ ] Code coverage >80% (unit + E2E combined)

**Files/Artifacts**:
- `e2e/jobseeker-workflow.spec.ts`
- `e2e/employer-workflow.spec.ts`
- `e2e/admin-workflow.spec.ts`
- `playwright.config.ts` or `cypress.config.ts`
- `.github/workflows/e2e-tests.yml` (CI/CD)
- `tests/e2e-setup.ts` (E2E helper utilities)

**Current State**: e2e/ directory exists with sample.spec.ts

---

### Phase 8: Security Hardening & Compliance (Status: NOT STARTED)
**Objective**: Penetration testing, OWASP compliance, data privacy (GDPR/local), rate limit tweaks

**Exit Criteria**:
- [ ] SQL injection tests (ORM prevents most, but validate parameterized queries)
- [ ] XSS tests (validate all user input sanitized before render)
- [ ] CSRF protection (NextAuth provides, verify tokens on state-changing requests)
- [ ] Brute force testing (rate limits tested: 5 login attempts/min, 3 signup/min)
- [ ] Data export/deletion (GDPR: user can export all data, request deletion)
- [ ] PII encryption (passwords hashed via bcrypt, SSNs encrypted if stored)
- [ ] Session timeout (30 min idle, require re-auth for sensitive operations)
- [ ] API rate limits adjusted based on Phase 1-6 load testing
- [ ] Security headers added (HSTS, X-Frame-Options, CSP)
- [ ] Secrets never logged or cached
- [ ] Penetration test report (3rd party or manual)

**Files/Artifacts**:
- `middleware.ts` — Security headers
- `app/lib/auth.ts` — Session timeout, re-auth checks
- `tests/security.test.ts` — Security unit tests
- `SECURITY.md` — Security hardening document
- Penetration test report (if external)

---

### Phase 9: Release & Operations (Status: NOT STARTED)
**Objective**: Prepare production release, monitoring, runbooks

**Exit Criteria**:
- [ ] Deploy to production (Vercel, AWS, or Docker)
- [ ] Database backups automated (daily, retain 30 days)
- [ ] Monitoring/alerting setup (Sentry for errors, DataDog/Prometheus for metrics)
- [ ] Runbook for incident response (database down, auth service down, data corruption)
- [ ] Rollback procedure documented
- [ ] SLA defined (99% uptime target, incident response time <1 hour)
- [ ] Documentation complete (API docs, deployment guide, troubleshooting)
- [ ] Load testing (>1000 concurrent users, identify bottlenecks)
- [ ] Post-launch monitoring (track top errors, slow endpoints, user retention)

**Files/Artifacts**:
- `.github/workflows/deploy.yml` — CD pipeline
- `docs/deployment.md` — Deployment guide
- `docs/runbook.md` — Incident response runbook
- `docs/api.md` — API documentation
- Sentry/monitoring dashboard links in README

---

## III. END-TO-END EXECUTION DISCIPLINE

### Rule 1: Complete All Layers Per Feature
When implementing a feature, ALL of these must be completed together (not piecemeal):
1. **Database**: Schema change in `app/db/schema.ts` + migration created
2. **API**: Endpoint(s) in `app/api/` that validate input, query database, return JSON
3. **Auth/Guards**: Role checks via middleware or API guardrails
4. **Client**: React component/page that calls API and displays result
5. **Tests**: Unit test for API, integration test for full flow
6. **Documentation**: Commit message, JSDoc comments, Phase exit criterion update

**Example INCOMPLETE (WRONG):**
```
Agent creates app/api/jobs/route.ts but forgets:
❌ No database migration
❌ No client component to call the API
❌ No tests
❌ Not documented which Phase this is
Result: Feature appears done but can't actually be used or tested
```

**Example COMPLETE (RIGHT):**
```
Agent implements job jobs browse (Phase 3):
✅ Updates app/db/schema.ts to confirm jobTable structure
✅ Creates app/api/jobs/route.ts with GET/search/pagination
✅ Creates app/api/jobs/[id]/route.ts for detail
✅ Creates app/jobseeker/jobs/page.tsx to browse and search
✅ Creates tests/jobs-api.test.ts (5 test cases)
✅ Writes commit: "feat(jobs): add public job browse and detail endpoints (Phase 3)"
✅ Verifies: npm test passes, npm run type-check, npm run lint
✅ Updates IMPLEMENTATION_STATUS.md Phase 3 exit criteria
```

### Rule 2: Mandatory Coupling Rules
- **Schema change** → Must update API to use new field
- **API contract change** → Must update client fetcher
- **Auth change** → Must update middleware + API guardrails + tests
- **New endpoint** → Must add test + JSDoc + documentation
- **Breaking change** → MUST include migration guide or deprecation period

**Anti-pattern (FORBIDDEN):**
```typescript
// ❌ WRONG: Add field to schema but forget API endpoint
app/db/schema.ts: Add jobID to applications table
app/api/employer/applications/route.ts: Forget to include jobID in response
Result: Frontend can't fetch job details, feature broken
```

**Pattern (CORRECT):**
```typescript
// ✅ RIGHT: Schema change propagates through all layers
app/db/schema.ts: Add jobID foreign key to applications
app/api/employer/applications/route.ts: fetch job data, include in response
app/lib/hooks/useApplications.ts: Update fetch to include jobID
app/employer/applications/page.tsx: Display job title next to application
tests/employer-api.test.ts: Add test verifying jobID in response
```

### Rule 3: Single Responsibility Per Commit
Each commit should address ONE feature or ONE fix. Not multiple unrelated things.

**Example GOOD:**
```
feat(jobs): add job detail page (Phase 3)
- Implement GET /api/jobs/[id]
- Create app/jobseeker/jobs/[id]/page.tsx
- Add rate limiting for detail endpoint
- Tests: 3 test cases for job fetching
Fixes #42
```

**Example BAD:**
```
update stuff
- Added job detail page
- Fixed password reset bug
- Added sidebar styling improvements
- Updated database migrations
(Multiple concerns, no scope, no tests mentioned, no issue reference)
```

---

## IV. VERIFICATION GATES (Must Pass Before Commit)

Every commit MUST pass these gates. If ANY gate fails, fix before pushing:

```bash
# Gate 1: TypeScript compilation
npm run type-check

# Gate 2: ESLint rules
npm run lint
# Note: ESLint warnings are OK, but errors block commit

# Gate 3: Unit tests
npm test

# Gate 4: Auth smoke test (Phase 1+)
npm run auth:smoke

# Gate 5: Build succeeds
npm run build
```

**Gate Failure Recovery**:
```bash
# If TypeScript errors, fix types:
npm run type-check 2>&1 | head -20    # Show first 20 errors

# If lint errors, auto-fix non-semantic issues:
npm run lint --fix

# If tests fail, check what broke:
npm test -- --verbose

# If build fails, check Next.js output:
npm run build 2>&1 | tail -50         # Show last 50 lines

# If only import/export issues, regenerate schema:
npm run db:generate
```

**Post-Gate Actions**:
1. All gates pass → Proceed to commit
2. Any gate fails → Fix errors, re-run failed gate only
3. Persist multiple times → Ask user for help or escalate

---

## V. GIT SAFETY RULES

### Commit & Push Rules
- **MUST**: Use conventional commits (feat, fix, docs, test, refactor, ops, chore)
- **MUST**: Include scope (e.g., jobs, auth, admin, upload)
- **MUST**: Include issue reference if applicable (#123)
- **MUST**: Verify no .env.local or secrets in diff before push
- **NEVER**: Force push to origin/main (git push --force-with-lease is OK in emergency only)
- **NEVER**: Rebase origin/main without explicit user consent
- **NEVER**: Delete files without reason in commit

**Good Commit Message**:
```
feat(jobs): implement job detail page with rate limiting (Phase 3)

- Add GET /api/jobs/[id] endpoint with 60 req/min rate limit
- Create app/jobseeker/jobs/[id]/page.tsx with Suspense lazy loading
- Include job requirements and employer contact info (if authenticated)
- Add 3 unit tests for detail fetching and rate limit behavior
- Verified: npm test, npm run type-check, npm run lint all pass

Fixes #42
```

**Bad Commit Message (FORBIDDEN)**:
```
update
fixed stuff
added new files
```

### Branch & Rebase Rules
- **Default**: Commit on `main` (no separate feature branches required for this project)
- **POST-COMMIT CHECK**: Always run `git log -10 --oneline` to verify commits are in correct order
- **IF REBASE NEEDED**: Use `git rebase -i origin/main` only if explicitly asked by user
- **CONFLICT RESOLUTION**: When rebasing, prefer "accept remote" for .env.local and package-lock.json

---

## VI. KNOWN SCRIPTS & WORKFLOWS

### Development Workflow
```bash
# Start development server on http://localhost:3000
npm run dev

# While dev is running, in another terminal:
npm test                  # Run unit tests (watch mode recommended)
npm run type-check        # Check TypeScript (run after each major edit)
npm run lint              # Check ESLint
npm run db:studio         # Open Drizzle Studio to inspect database

# When ready to commit:
npm run type-check && npm run lint && npm test && npm run build
```

### Database Workflow
```bash
# After schema change in app/db/schema.ts:
npm run db:generate       # Generate migration file

# After generating migration:
npm run db:push           # Apply to Supabase (requires .env.local)

# To inspect current schema:
npm run db:pull           # Update schema.ts from database

# To open database UI:
npm run db:studio
```

### Common Issues & Fixes
```bash
# Jest cannot find module errors:
npm run db:generate       # Regenerate Zod schemas from database

# "Port 3000 already in use":
PORT=3001 npm run dev     # Use different port

# ".next cache issues":
rm -r .next               # Clear Next.js cache
npm run build             # Rebuild

# "node_modules bloat":
rm -rf node_modules package-lock.json
npm install               # Clean reinstall
```

---

## VII. MANDATORY PATTERNS & CONVENTIONS

### API Endpoint Pattern
Every endpoint must follow this structure:

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { applyGuardrails } from '@/lib/api-guardrails';
import { db } from '@/db';

export async function GET(req: NextRequest) {
  // Step 1: Auth check (if required)
  const session = await auth();
  if (req.nextUrl.pathname.includes('/admin') && session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 2: Apply guardrails (rate limiting, request ID)
  const guardrails = applyGuardrails(req);
  if (!guardrails.ok) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Step 3: Parse & validate input
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  // Step 4: Query database
  const data = await db.select().from(someTable).limit(limit).offset(offset);

  // Step 5: Return JSON
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guardrails = applyGuardrails(req);
  if (!guardrails.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  // Validate body schema here
  // Insert/update database
  return NextResponse.json({ success: true });
}
```

### Client Hook Pattern
```typescript
// app/lib/hooks/useXxx.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useXxx() {
  return useQuery({
    queryKey: ['xxx'],
    queryFn: async () => {
      const res = await fetch('/api/xxx');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
}

export function useCreateXxx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/xxx', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['xxx'] }),
  });
}
```

### Component Pattern
```typescript
// app/components/XxxComponent.tsx
'use client';

import { Suspense } from 'react';
import { useXxx } from '@/lib/hooks/useXxx';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function XxxContent() {
  const { data, isLoading, error } = useXxx();

  if (error) return <div className="error">Error: {error.message}</div>;
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {data?.map((item) => (
        <div key={item.id} className="p-4 border rounded">
          {item.name}
        </div>
      ))}
    </div>
  );
}

export function XxxComponent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <XxxContent />
    </Suspense>
  );
}
```

### Test Pattern
```typescript
// tests/xxx-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { setup, cleanup } from './test-setup';

describe('GET /api/xxx', () => {
  let testData: any;

  beforeAll(async () => {
    testData = await setup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it('should return xxx with pagination', async () => {
    const res = await fetch(`http://localhost:3000/api/xxx?limit=10&offset=0`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(10);
  });

  it('should return 400 for invalid limit', async () => {
    const res = await fetch(`http://localhost:3000/api/xxx?limit=abc`);
    expect(res.status).toBe(400);
  });
});
```

---

## VIII. COMMON ANTI-PATTERNS (FORBIDDEN)

1. **Fabricating file paths**: Say "I'll add app/api/admin/users.ts" without verifying the directory structure or existing patterns ❌
2. **Skipping tests**: "Tests can wait, let's ship first" ❌
3. **Partial implementations**: "I'll add the API but skip the client component" ❌
4. **Committing secrets**: Never include `.env.local`, API keys, or database passwords ❌
5. **Ignoring type errors**: "It works at runtime, TypeScript is just complaining" ❌
6. **One giant commit**: Mixing unrelated features (auth + jobs + notifications) in one commit ❌
7. **Skipping verification gates**: "All gates passed locally, push directly" without re-checking after rebase ❌
8. **Rebase conflicts ignored**: "I'll just merge instead" when simple conflict resolution is needed ❌

---

## IX. HIGH-LEVEL PHASE 0-9 DECISION TREE

```
START: User requests a feature or fix

Q1: Is this a Phase 0-9 item?
  NO → Check if it's a bug fix (goto Q2) or out-of-scope (decline politely)
  YES → Proceed to Q3

Q2: If bug fix, does it affect Phase 1-9 scope?
  NO → Skip
  YES → Create fix commit (fix(scope): msg)

Q3: Which Phase?
  Phase 0: DB/Auth setup (almost complete, needs manual .env setup)
  Phase 1: Auth flows (COMPLETE ✅)
  Phase 2: Dashboards (IN PROGRESS, 96 uncommitted files staged)
  Phase 3: Job browsing (NOT STARTED, BLOCKING Phase 4)
  Phase 4: Employer workflows (NOT STARTED, depends on Phase 3)
  Phase 5: Messaging (NOT STARTED)
  Phase 6: Admin analytics (NOT STARTED)
  Phase 7: E2E tests (NOT STARTED)
  Phase 8: Security hardening (NOT STARTED)
  Phase 9: Production release (NOT STARTED)

Q4: For selected Phase, do exit criteria exist?
  NO → Define them first (update IMPLEMENTATION_STATUS.md)
  YES → Proceed to Q5

Q5: Is this the right time for this Phase?
  Dependencies missing → NO, go earlier Phase first
  Ready to implement → YES, proceed to Q6

Q6: Feature is complex (>5 files)?
  YES → Break into 2-3 commits (logical grouping by concern)
  NO → Single commit is OK

Q7: Verify all layers before commit:
  ✅ Schema updated (if needed)
  ✅ API endpoints created
  ✅ Auth/guards applied
  ✅ Client component created
  ✅ Tests written (unit + integration)
  ✅ Documentation updated
  ✅ npm test PASSES
  ✅ npm run type-check PASSES
  ✅ npm run lint PASSES
  ✅ npm run build PASSES

Q8: Ready to commit?
  NO → Fix issues, goto Q7
  YES → Create commit with conventional message

Q9: Ready to push?
  NO → Rebase/resolve conflicts if needed
  YES → git push origin main

Q10: Post-push validation:
  ✅ npm test still passes
  ✅ npm run auth:smoke passes (Phase 1+)
  ✅ No new type errors
  ✅ Commit appears on origin/main

DONE: Feature complete, Phase exit criterion met.
```

---

## X. ESCALATION & CLARIFICATION PROTOCOL

**When uncertain, ALWAYS ask for clarification before proceeding:**

```
User: "Add a notifications feature"

GOOD RESPONSE:
"Before I implement notifications, I need clarification:
1. Should notifications be real-time (WebSocket) or polling-based?
2. Which events trigger notifications? (new application, status change, message, all of above?)
3. Should notifications persist to database or be ephemeral?
4. Is Phase 5 the right time, or should this wait for later phases?
5. Do you want push notifications via Service Worker, or just in-app badges?"

BAD RESPONSE:
"I'll implement real-time WebSocket notifications for all events with persistence"
(Assumes answers to all questions)
```

---

## XI. ANTI-HALLUCINATION CHECKLIST

Before EVERY code generation, verify:

- [ ] I have read the actual file(s) I'm modifying (not guessed their content)
- [ ] I have confirmed the file path exists in the project structure
- [ ] I have verified the database schema for any fields I'm using
- [ ] I have checked existing patterns (compare to 2+ similar files)
- [ ] I understand the authentication model (role checks, session handling)
- [ ] I have identified the API rate limit policy (if any)
- [ ] I have confirmed which Phase this work belongs to
- [ ] I have listed ALL layers affected (schema, API, auth, client, tests, docs)
- [ ] I have a test strategy (unit, integration, E2E)
- [ ] I have a rollback plan (if change is breaking)

**If ANY of these is not true, HALT and ask clarifying questions.**

---

## XII. FINAL COMMITMENT

This instruction file is a binding agreement between the AI and the user:

✅ **I commit to**:
- Never fabricate code, file paths, or assumptions
- Always verify before changing code
- Complete all layers per feature (not piecemeal)
- Follow verification gates before committing
- Use conventional commits with scope and Phase reference
- Ask for clarification when uncertain
- Respect the Phase 0-9 roadmap unless explicitly told to deviate

❌ **I will NOT**:
- Guess at file structure or function signatures
- Skip tests or documentation
- Commit breaking changes without migration guides
- Fabricate npm scripts or environment variables
- Ignore TypeScript errors
- Force push or rebase without consent
- Mix unrelated changes in one commit

**User**: Approved [Date: March 29, 2026]  
**AI Agent**: Acknowledged and enforced from this point forward.

---

*Last Updated: March 29, 2026*  
*For updates or clarifications, edit this file and commit with scope: `docs(copilot): ...`*
