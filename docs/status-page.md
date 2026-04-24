# Status Page Integration

Public status surfacing is now available through two paths:

- `/status` public status route for human-readable system state
- `/api/health` machine-readable status payload for monitors

## Provider Integration

Configure the hosted status provider URL in environment variables:

- `NEXT_PUBLIC_STATUS_PAGE_URL`
- `STATUS_PAGE_URL` (server-side fallback)

When set, `/status` displays a direct link to the hosted provider (for incident history and subscriber updates).

## Current Component Coverage

Status output includes these components:

- Web app
- API service
- Auth service
- Database
- File uploads
- Notifications

## API Contract

`GET /api/health` keeps legacy compatibility (`status: "ok"`) and now also returns:

- `overallStatus`: `operational` or `degraded`
- `checkedAt`: ISO timestamp
- `statusPageUrl`: hosted provider URL (if configured)
- `components`: per-component status and detail

## Incident Workflow

1. Confirm incident impact using logs, `/api/health`, and `/status`.
2. Publish/refresh incident details in the hosted provider.
3. Post progress updates every 15 to 30 minutes.
4. Close incident with root cause and follow-up action items.
