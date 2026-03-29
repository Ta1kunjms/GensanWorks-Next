# API Operations Notes

## High-Value Endpoints

- `GET /api/jobs`
- `GET /api/jobs/[id]`
- `POST /api/jobs/[id]/apply`
- `GET /api/admin/analytics`
- `GET /api/admin/analytics/timeline`
- `GET /api/admin/analytics/export`
- `GET /api/admin/analytics/referrals`
- `GET /api/admin/analytics/audit-feed`

## Smoke Scripts

- `npm run test:phase2:smoke`
- `npm run test:phase3:smoke`
- `npm run test:phase6:smoke`
- `npm run test:phase8:smoke`

## Security and Reliability Checks

- `npm run validate:env`
- `npm run security:secrets:scan`
- `npm run test:security`
- `npm run test:load:smoke`

## Response Conventions

- JSON responses for API endpoints
- Guarded admin routes require authenticated admin role
- Unauthorized calls return `401`
- Validation issues return `400`
