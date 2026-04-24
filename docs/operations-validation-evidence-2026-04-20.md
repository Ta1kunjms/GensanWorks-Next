# Operations Validation Evidence (2026-04-20)

## Scope

This report captures repository-executable security and operations evidence generated on April 20, 2026.

## Executed Commands

```bash
npm run test:security:dynamic
npm run ops:backup:drill
npm run test:load:smoke
npm run test:unit:coverage:check
npm run verify:seeded:local
npm run type-check
npm run test:phase4:smoke
npm run test:phase8:smoke
SEED_BASE_URL=http://localhost:3002 RUN_PHASE7=0 RUN_PHASE8=0 npm run verify:seeded:local
SECURITY_SCAN_BASE_URL=http://localhost:3002 npm run test:security:dynamic
```

## Dynamic Security Scan Evidence

- Command: `npm run test:security:dynamic`
- Report file: `reports/security/dynamic-security-scan-report.json`
- Summary:
  - Total checks: 7
  - Passed: 6
  - Failed: 0
  - Skipped: 1
- Key passed checks:
  - Security headers baseline
  - SQLi-like payload handling on jobs search
  - XSS-like payload handling on jobs search
  - Forged-origin mutation denial
  - Admin-request brute-force/rate-limit guard
- Skipped check:
  - Cron deletion processor rate-limit check (missing `ACCOUNT_DELETION_CRON_SECRET` in local dynamic scan context)

## Backup/Restore Drill Evidence

- Command: `npm run ops:backup:drill`
- Snapshot files:
  - `exports/backup-drills/backup-drill-latest.json`
  - Timestamped snapshot under `exports/backup-drills/`
- Snapshot metadata:
  - Host: `aws-1-ap-northeast-2.pooler.supabase.com`
  - Port: `6543`
  - Database: `postgres`
- Tables captured: 7 (`admins`, `users`, `employers`, `jobs`, `applications`, `messages`, `notifications`)
- Restore simulation:
  - Snapshot reloaded and validated
  - Transaction-scoped temporary-table restore simulation completed successfully

## Coverage and Seeded Validation Evidence

- Coverage gate command passed:
  - `npm run test:unit:coverage:check`
  - Thresholds met:
    - Statements: >= 80
    - Lines: >= 80
    - Functions: >= 80
    - Branches: >= 70
- Seeded validation command passed:
  - `npm run verify:seeded:local`
  - Included successful runs of Phase 5 smoke, Phase 6 smoke, and Phase 7 core/responsive/mutation suites

## Phase 4, 6, and 8 Validation Evidence

- Type-check command passed:
  - `npm run type-check`
- Seeded validation rerun passed:
  - `SEED_BASE_URL=http://localhost:3002 RUN_PHASE7=0 RUN_PHASE8=0 npm run verify:seeded:local`
  - Phase 4 result: 8 total, 8 passed, 0 failed, 0 skipped
  - Phase 5 result: 18 total, 18 passed, 0 failed, 0 skipped
  - Phase 6 result: 11 total, 11 passed, 0 failed, 0 skipped
- Dynamic security scan rerun passed with explicit base URL:
  - `SECURITY_SCAN_BASE_URL=http://localhost:3002 npm run test:security:dynamic`
  - Result: 7 total checks, 6 passed, 0 failed, 1 skipped
  - Skip reason: `ACCOUNT_DELETION_CRON_SECRET` was not configured for the dynamic scan context
- Fixture-gated smoke baselines remain valid for direct single-suite runs:
  - `npm run test:phase4:smoke` can skip authenticated checks without seeded cookies
  - `npm run test:phase8:smoke` can skip authenticated export assertions without `PHASE8_JOBSEEKER_COOKIE`
- API additions validated by smoke/type checks:
  - `GET /api/employer/applications`
  - `GET /api/employer/applications/[id]`
  - `PATCH /api/employer/applications/[id]`
  - `POST /api/employer/applications/[id]/message`
  - `GET /api/auth/account-data/export`

## Load Evidence

- Load smoke command passed:
  - `npm run test:load:smoke`
  - Result: `Load smoke complete: 90 requests, avg=478ms, max=1117ms`
  - Report file: `reports/load/load-smoke-report.json`
  - Degradation record: 30 responses from `/api/jobs` returned 5xx and were captured as tolerated degradation (no hard-fail)
  - Scope: smoke/performance baseline only (not a full 1000+ concurrency production load test)

## Public Status Integration Evidence

- Public status route now available: `/status`
  - Verified locally with HTTP 200
- Health endpoint now includes component payload for status surfacing:
  - `status`, `overallStatus`, `checkedAt`, `statusPageUrl`, `components`
  - Verified locally with HTTP 200 and 6 component entries
- Provider URL integration enabled via environment:
  - `NEXT_PUBLIC_STATUS_PAGE_URL`
  - `STATUS_PAGE_URL` (server fallback)

## Remaining External Sign-off Items

These cannot be completed from repository-only execution without external platform access or organizational approval:

- Production deployment execution and validation
- Monitoring/alert routing enablement in production tooling
- Dynamic scanner run against deployed target using OWASP ZAP/Burp with formal sign-off
- CI artifact confirmation from remote GitHub Actions runs
- Release owner final approval
