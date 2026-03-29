# Deployment Guide

## Preconditions

- Node.js 20+
- Populated production secrets in your deployment platform
- Database migrations validated in staging
- CI `verify` and `security-scan` workflows green

## Environment Variables (Minimum)

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET` (same value as `NEXTAUTH_SECRET`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel Deployment (Automated)

1. Configure these repository secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Trigger `.github/workflows/deploy.yml` manually or push to `main`.
3. Verify deployment URL and run post-deploy smoke checks.

## Manual Build/Run

```bash
npm ci
npm run validate:env
npm run build
npm start
```

## Post-Deploy Checklist

- Landing page returns HTTP 200
- Auth login and role redirect works
- `GET /api/jobs` returns expected envelope
- Security headers present on `/`
- Error logs and metrics are healthy for first 15 minutes
