# Status Page Plan

This project does not currently have a public status page provider configured.

## Recommended setup

- Use Atlassian Statuspage, Better Stack, or a simple hosted status site.
- Publish component status for:
  - Web app
  - Auth service
  - API service
  - Database
  - File uploads
  - Notifications/messaging
- Track incidents with timestamps, impact, and resolution notes.

## Initial component states

- Web app: operational
- API service: operational
- Auth: operational
- Database: operational
- Uploads: operational
- Notifications: operational

## Incident workflow

1. Confirm the incident in logs and health checks.
2. Update the status page with impact and workaround.
3. Post progress every 15 to 30 minutes.
4. Close with root cause, fix, and follow-up items.
