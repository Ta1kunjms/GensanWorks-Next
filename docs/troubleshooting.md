# Troubleshooting

## `npm run validate:env` fails

- Ensure required secrets are set.
- Ensure `AUTH_SECRET` and `NEXTAUTH_SECRET` have identical values.
- Remove placeholder values from `.env.local`.

## Playwright cannot launch Chromium

Run:

```bash
npx playwright install chromium
```

## Security smoke test says server unreachable

Run app first:

```bash
npm run dev
```

Then run:

```bash
PHASE8_BASE_URL=http://127.0.0.1:3000 npm run test:phase8:smoke
```

## CI smoke jobs skipped

Most smoke/load jobs are gated by required secrets in GitHub Actions.
Populate repository secrets and rerun workflows.

## Build succeeds but auth routes fail at runtime

Check:

- `NEXTAUTH_URL` points to the current host
- `NEXTAUTH_SECRET` and `AUTH_SECRET` are set and matching
- Database connectivity and auth tables are available
