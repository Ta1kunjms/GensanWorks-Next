# Security Compliance Checklist

Date: 2026-04-20

## Scope

This checklist tracks Phase 8 compliance evidence from repository-controlled checks and artifacts.

## Auth and Session

- [x] Role-based auth enforced on protected routes (`middleware.ts`)
- [x] Sensitive operations require authenticated user (`createPostHandler` with `requireAuth`)
- [x] Sensitive auth operations require recent authentication (30-minute recency) (`app/lib/api-handler.ts` + auth routes)

## Input Validation and Injection Resistance

- [x] Request body/query schema validation enforced via Zod in API handlers
- [x] SQL injection-like search payload smoke tested (`tests/phase-8-security.test.ts`)
- [x] XSS-like payload handling smoke tested (`tests/phase-8-security.test.ts`)

## CSRF and Request Integrity

- [x] Forged-origin anonymous state-changing request denied (`tests/phase-8-security.test.ts`)
- [x] NextAuth-managed credentials callback flow used in E2E auth helper (`tests/e2e-setup.ts`)

## Rate Limiting and Brute Force

- [x] Shared request guardrails implemented (`app/lib/api-guardrails.ts`)
- [x] Signup brute-force/rate-limit smoke coverage added (`tests/phase-8-security.test.ts`)
- [x] Admin deletion processor rate-limit path tested (`tests/phase-8-security.test.ts`, secret-gated)

## Security Headers

- [x] Enforced CSP header configured (`next.config.ts`)
- [x] Report-only CSP header configured (`next.config.ts`)
- [x] Core hardening headers configured and tested (`tests/security.test.ts`, `tests/phase-8-security.test.ts`)

## Secrets and Operational Hygiene

- [x] Environment validation script present (`scripts/validate-env.js`)
- [x] Secret leak scan script present (`scripts/security-secrets-scan.js`)
- [x] Security policy documented (`SECURITY.md`)

## Data Protection and Recovery

- [x] Password hashing enforced using bcrypt helpers (`app/lib/utils.ts`, auth routes)
- [x] Backups and restore process documented (`docs/backups.md`)
- [ ] Backup/restore drill executed in production environment (external ops)

## External/Manual Sign-off Items

- [x] Local dynamic security scan report generated (`reports/security/dynamic-security-scan-report.json`)
- [ ] Dynamic OWASP ZAP/Burp scan against deployed environment
- [ ] Formal compliance sign-off by security owner
- [ ] Production monitoring and incident response drill confirmation

## Evidence Commands

```bash
npm run validate:env
npm run security:secrets:scan
PHASE8_BASE_URL=http://127.0.0.1:3000 npm run test:phase8:smoke
npm run test:security:dynamic
npm run test:unit
```
