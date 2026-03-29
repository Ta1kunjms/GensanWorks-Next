# Security Policy

## Supported Versions

The `main` branch and the latest release tag are supported for security updates.
Older branches are best-effort only.

## Reporting a Vulnerability

If you discover a vulnerability, do not open a public issue.

Send a report with these details:
- Summary of the issue
- Affected endpoint or component
- Reproduction steps
- Potential impact
- Suggested mitigation (if available)

Use one of these channels:
- Private repository security advisory (preferred)
- Direct maintainer contact listed in repository ownership metadata

## Response Targets

- Initial acknowledgement: within 2 business days
- Triage decision: within 5 business days
- Mitigation patch target: within 14 business days for high/critical issues

These are targets, not guarantees.

## Disclosure Process

- We confirm receipt and begin triage.
- We reproduce and assess impact.
- We prepare and validate a fix.
- We release a patch and publish advisory notes.
- We credit the reporter unless they request anonymity.

## Security Controls In This Repository

Current controls include:
- Request-level guards and role checks on protected APIs
- Rate limiting in API guardrails
- Authenticated admin-only account deletion processor
- Security response headers configured in `next.config.ts`
- Phase 8 security smoke tests in `tests/phase-8-security.test.ts`
- CI validation for security smoke checks

## Secrets and Sensitive Data Handling

- Never commit `.env` files or credentials.
- Use GitHub Actions secrets for CI variables.
- Avoid logging secrets, tokens, and passwords.
- Prefer short-lived tokens and rotate secrets after incidents.

## Out of Scope

The following are generally out of scope unless they create a direct exploit path:
- Self-XSS requiring local user console execution
- Denial of service from unrealistic synthetic traffic
- Vulnerabilities in unsupported branches

## Hardening Roadmap (Phase 8)

Planned or ongoing:
- CSP rollout with route-safe compatibility checks
- Expanded CSRF and brute-force verification coverage
- Structured dynamic scan pass (OWASP ZAP/Burp)
- Compliance checklist sign-off
