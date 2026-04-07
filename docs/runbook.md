# Operations Runbook

## Incident Severity

- Sev 1: Full outage or data integrity risk
- Sev 2: Major workflow degraded for many users
- Sev 3: Partial degradation or non-critical feature issue

## First Response (First 15 Minutes)

1. Confirm impact scope and error rates.
2. Check latest deployment and workflow statuses.
3. Inspect platform logs for auth, database, and API errors.
4. If needed, trigger rollback to last known good deployment.

## Common Incidents

### Login failures

- Verify `NEXTAUTH_SECRET` and `AUTH_SECRET` consistency.
- Confirm OAuth credentials and callback URLs.
- Check auth route logs and rate-limiter behavior.

### Database connectivity issues

- Validate `DATABASE_URL`.
- Check provider status and connection limits.
- Run a lightweight health query from platform shell.

### Elevated API latency

- Run load smoke workflow to reproduce quickly.
- Inspect expensive endpoints (`/api/jobs`, analytics endpoints).
- Scale resources or reduce concurrency while triaging.

## Rollback Procedure

1. Identify previous successful deployment.
2. Redeploy prior artifact/version.
3. Confirm health checks and smoke tests pass.
4. Open post-incident action items.

## Post-Incident Template

- [Incident response template](./incident-response-template.md)

## Recovery References

- [Backups and restore plan](./backups.md)
- [Status page plan](./status-page.md)
