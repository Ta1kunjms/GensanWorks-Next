# API Rate-Limit Review (Phase 8)

Date: 2026-04-20

## Scope

Reviewed currently configured API guardrails and endpoint-specific limits used by auth, jobs, messaging, and admin routes.

## Core Guardrail Implementation

- Shared limiter: `app/lib/api-guardrails.ts`
- Handler integration: `app/lib/api-handler.ts`

## Reviewed Endpoint Limits

- Auth signup (jobseeker): 10 requests/minute (`app/api/auth/signup/jobseeker/route.ts`)
- Auth signup (employer): 8 requests/minute (`app/api/auth/signup/employer/route.ts`)
- Admin-request signup: IP 6/minute, Email 2/day (`app/api/auth/signup/admin-request/route.ts`)
- Change password: 8 requests/minute (`app/api/auth/change-password/route.ts`)
- Account deletion request: 6 requests/minute (`app/api/auth/account-deletion/request/route.ts`)
- Public jobs list: 60 requests/minute per IP (`app/api/jobs/route.ts`)
- Public apply endpoint: 10/day per user via endpoint logic (`app/api/jobs/[id]/apply/route.ts`)
- Messaging/notifications/admin analytics: endpoint-specific guardrails in API routes and wrappers

## Validation Evidence

- Security and brute-force smoke checks: `tests/phase-8-security.test.ts`
- Messaging/admin smoke suites: `tests/phase-5-messaging.test.ts`, `tests/phase-6-admin-analytics.test.ts`
- Load smoke baseline: `scripts/load-smoke.js` (`npm run test:load:smoke`)

## Outcome

- Current limits are present and enforced for high-risk auth and mutation paths.
- No immediate code changes required from this review pass.
- Follow-up for production: tune thresholds using live traffic metrics and alerting data.
