# Post-Launch Monitoring Dashboard Plan

Date: 2026-04-20

## Objective

Define the minimum dashboard views needed for production operations and SLA tracking.

## Dashboard Sections

1. Availability
- Uptime percentage (target: 99%)
- Active incidents
- Error budget burn rate

2. API Health
- P95 latency for `/api/jobs`, `/api/messages`, `/api/admin/analytics`
- Error rates by endpoint (4xx/5xx)
- Rate-limit response volume (429)

3. Auth and Security
- Login failure spikes
- Password change and account deletion request volumes
- Forbidden/unauthorized response trends

4. Database
- Connection error count
- Query timeout trends
- Slow query distribution

5. User Flows
- Job browse → detail → apply conversion
- Employer post → review → status update conversion
- Messaging/notification throughput

## Alert Threshold Baseline

- API 5xx > 2% for 5 minutes
- P95 latency > 2s for 10 minutes
- Auth failures > 3x baseline for 10 minutes
- Database connection errors > 10 in 5 minutes

## Data Sources

- Application logs
- Platform metrics (Vercel/Supabase)
- Error tracking (Sentry, when enabled)
- Product analytics (PostHog)

## Runbook Links

- `docs/runbook.md`
- `docs/incident-response-template.md`
- `docs/status-page.md`
