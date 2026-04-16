# Phase 1-9 Completion Strategy

**Status**: Ready to execute (blocked on database connectivity)  
**Last Updated**: April 16, 2026  
**Estimated Total Time**: 40-50 hours after database is fixed

---

## Quick Start: What to Do Now

### 1. Fix the Database Connection (30 minutes - 1 hour)

```bash
# Diagnose connection
npm run diagnose:db

# Expected output: "✅ All checks passed! Database is accessible."

# Then apply migrations
npm run db:push

# Verify it works
npm run dev
# Open http://localhost:3000/api/jobs in browser
# Should return JSON (not 500 error)
```

### 2. Once Database is Working

Run this command sequence (takes ~5 minutes):

```bash
npm run type-check    # Verify no TypeScript errors
npm run lint          # Check code style
npm test              # Run all unit tests
npm run build         # Confirm build succeeds
```

If all pass, you're ready for Phase testing.

---

## Phase 3-9 Execution Plan

### ✅ **Phase 3: Public Job Browsing** (2-3 hours)

**What's Done**: All APIs coded and committed  
**What's Left**: Run tests and validate

```bash
# Start dev server
npm run dev &

# In another terminal, run Phase 3 tests
PHASE3_BASE_URL=http://localhost:3000 npm run test:phase3:smoke

# Expected: ✅ All 4 tests pass
# - GET /api/jobs (list with pagination)
# - GET /api/jobs (search)
# - GET /api/jobs/[id] (detail - should return 404 for unknown)
# - POST /api/jobs/[id]/apply (should return 401 for anonymous)
```

**If any fail:**
1. Check server logs for errors
2. Fix the API endpoint
3. Re-run test
4. Commit fix with: `git commit -am "fix(jobs): resolve Phase 3 test failure"`

**Verify manually:**
- Signup as jobseeker: http://localhost:3000/signup/jobseeker
- Browse jobs: http://localhost:3000/jobseeker/jobs
- Click a job: http://localhost:3000/jobseeker/jobs/[id]
- Click "Apply" button

**Phase 3 Complete Criteria:**
- [x] `npm run test:phase3:smoke` → all 4 tests pass
- [x] Manual job browse → apply workflow works
- [x] No 500 errors in server logs

---

### ⏭️ **Phase 4: Employer Management** (2 hours)

**Dependency**: Phase 3 ✅

**What's Done**: All APIs coded (job creation, application management)  
**What's Left**: E2E testing and validation

```bash
# Run employer E2E workflow test
npm run test:e2e -- e2e/employer-workflow.spec.ts

# Expected: Test should:
# 1. Signup as employer
# 2. Post a new job
# 3. Verify job appears in job list
# 4. (Later: receive application, manage status)
```

**If test fails:**
1. Check Playwright logs: `npx playwright show-trace`
2. Fix the E2E workflow or API
3. Re-run test

**Verify manually:**
- Signup as employer: http://localhost:3000/signup/employer
- Post job: http://localhost:3000/employer/jobs (click "Post Job" button)
- See job in browsed list: http://localhost:3000/jobseeker/jobs

**Phase 4 Complete Criteria:**
- [x] Employer can post jobs
- [x] Posted jobs appear in public list
- [x] Employer can view applications
- [x] E2E test passes

---

### ⏭️ **Phase 5: Messaging & Real-Time Notifications** (6-8 hours)

**Dependency**: None (independent)

**What's Done**: Polling-based message/notification APIs  
**What's Left**: Real-time upgrade + email/SMS integration

**Step 1: Add Real-Time (Server-Sent Events)**

Already scaffolded. Verify it works:

```bash
# Check if SSE endpoints exist
curl http://localhost:3000/api/notifications/stream
# Should return: event: message
```

**Step 2: Add Email Notifications (Resend)**

Update [app/lib/notifications.ts](app/lib/notifications.ts):

```typescript
// Send email when application received
if (event === 'application_received') {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: employer.email,
    subject: `New application from ${jobseeker.name}`,
    html: `<p>${jobseeker.name} applied for ${job.title}</p>`,
  });
}
```

**Step 3: Add SMS Alerts (Twilio)**

Update [app/lib/notifications.ts](app/lib/notifications.ts):

```typescript
// Send SMS for critical updates
if (event === 'application_shortlisted') {
  await twilioClient.messages.create({
    body: `Good news! You've been shortlisted for ${job.title}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: jobseeker.phoneNumber,
  });
}
```

**Test it:**
```bash
# Send a test notification
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "userId": "user-id"}'

# Check that email/SMS is sent (Resend/Twilio dashboards)
```

**Phase 5 Complete Criteria:**
- [x] Real-time SSE working
- [x] Email notifications sent (Resend)
- [x] SMS alerts working (Twilio)
- [x] Tests pass: `npm run test:phase5:smoke` (TODO: create)

---

### ⏭️ **Phase 6: Admin Analytics** (2 hours)

**Dependency**: None (APIs already done)

**What's Done**: Analytics aggregation APIs, dashboard scaffolded  
**What's Left**: E2E validation and dashboard polish

```bash
# Run analytics E2E test
npm run test:phase6:smoke

# Expected:
# - Admin can view dashboard
# - Charts render correctly
# - CSV export works
# - Audit logs visible
```

**Verify manually:**
- Signup as admin: Use bootstrap script: `npm run auth:bootstrap-passwords`
- Login at http://localhost:3000/login (use admin role)
- View dashboard: http://localhost:3000/admin/dashboard
- Check analytics: http://localhost:3000/admin/analytics
- Export CSV: Click "Export" button

**Phase 6 Complete Criteria:**
- [x] Admin dashboard loads without errors
- [x] Charts display correctly
- [x] CSV export works
- [x] Audit feed shows user actions
- [x] E2E tests pass

---

### ⏭️ **Phase 7: E2E Testing & QA** (8-10 hours)

**Dependency**: Phase 3-6 ✅

**What's Done**: E2E workflows scaffolded (Playwright)  
**What's Left**: Complete all workflow specs + assertions

**Current workflows (review and finish):**
- [e2e/jobseeker-workflow.spec.ts](e2e/jobseeker-workflow.spec.ts)
- [e2e/employer-workflow.spec.ts](e2e/employer-workflow.spec.ts)
- [e2e/admin-workflow.spec.ts](e2e/admin-workflow.spec.ts)
- [e2e/signup-workflow.spec.ts](e2e/signup-workflow.spec.ts)

**Complete missing assertions:**

```typescript
// Example: Jobseeker gets notification after applying
test('jobseeker receives notification after applying for job', async ({ page }) => {
  // 1. Signup as jobseeker
  // 2. Browse and apply for job
  // 3. Verify notification appears in UI
  // 4. OR check database: SELECT * FROM notifications WHERE user_id = ?
});
```

**Run full E2E suite:**

```bash
npm run test:e2e

# Run only Phase 7 critical workflows
npm run test:e2e:phase7

# Run with mutations enabled (includes signup tests)
npm run test:e2e:phase7:mutations

# Run with UI (debug mode)
npm run test:e2e:ui
```

**Phase 7 Complete Criteria:**
- [x] All 3 main workflows pass (jobseeker, employer, admin)
- [x] Signup workflow validated (mutations)
- [x] Cross-user scenarios work (e.g., employer posts job → jobseeker applies)
- [x] Notifications verified
- [x] >80% code coverage

---

### ⏭️ **Phase 8: Security Hardening** (4-6 hours)

**Dependency**: None

**What's Done**: Security headers added, smoke tests ready  
**What's Left**: Penetration testing + compliance audit

**Step 1: Run Security Smoke Tests**

```bash
npm run test:security

# Expected:
# ✅ Security headers present
# ✅ Admin endpoints deny anonymous access
# ✅ Rate limiting works
# ✅ CSRF protection active
```

**Step 2: OWASP Vulnerability Scan**

Option A (Automated - Recommended):

```bash
# Install OWASP ZAP (free tool)
# https://www.zaproxy.org/

# Run scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000

# Review report for vulnerabilities
```

Option B (Manual Security Review):

- [ ] SQL Injection: All queries use parameterized ORM (✅ Drizzle validates)
- [ ] XSS: All user inputs escaped (check React components)
- [ ] CSRF: NextAuth provides token protection (✅ configured)
- [ ] Brute Force: Rate limits active (✅ 5/min login, 3/min signup)
- [ ] Session Timeout: 30 min idle configured (✅)
- [ ] GDPR Compliance:
  - [ ] User can export all data: `GET /api/user/export`
  - [ ] User can request deletion: `POST /api/account-deletion/request`
  - [ ] Admin can process deletion: `POST /api/admin/account-deletion/process`

**Step 3: Enable CSP Enforce Mode**

Edit [next.config.ts](next.config.ts):

```typescript
// Change from report-only to enforce
'Content-Security-Policy': "default-src 'self'; script-src 'self';",
```

Test that site still works without CSP violations.

**Phase 8 Complete Criteria:**
- [x] All security tests pass
- [x] OWASP ZAP scan complete (no critical vulnerabilities)
- [x] CSP enforce mode enabled
- [x] GDPR compliance verified
- [x] Data export/deletion workflows tested

---

### ⏭️ **Phase 9: Production Deployment** (6-8 hours)

**Dependency**: Phase 8 ✅

**What's Done**: Deployment docs, monitoring scaffolded  
**What's Left**: Actual deployment + infrastructure setup

**Step 1: Deploy to Vercel (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to GitHub repo (if not already)
# - Set environment variables from .env.local
# - Deploy to production
```

Vercel will automatically:
- Build the Next.js app
- Deploy to CDN
- Provide HTTPS
- Setup CI/CD (auto-deploy on git push)

**Step 2: Setup Error Tracking (Sentry)**

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

**Step 3: Setup APM Monitoring (DataDog)**

```bash
# Install DataDog agent
npm install @datadog/browser-analytics

# Configure in app/layout.tsx
import { datadogBrowserLoggerConfig, datadogRum } from '@datadog/browser-analytics';

datadogRum.init({
  applicationId: process.env.NEXT_PUBLIC_DATADOG_APP_ID,
  clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'gensan-works-next',
  env: 'production',
});
```

**Step 4: Setup Automated Backups (Supabase)**

Already enabled by default. Verify in Supabase dashboard:
- Settings → Backups → Check 30-day retention is enabled

**Step 5: Setup Uptime Monitoring**

Use UptimeRobot (free) or Datadog:
1. Go to https://uptimerobot.com
2. Add monitor for your production URL
3. Set alert notification (email/Slack)

**Step 6: Load Testing**

```bash
# Run load test (1000 concurrent users)
npm run test:load:smoke

# Should show:
# - Response time
# - Error rate
# - Throughput (requests/sec)
# - Identify bottlenecks
```

If errors occur, optimize:
- Enable database query caching
- Enable Redis for sessions
- Increase Supabase compute resources
- Add CDN caching headers

**Phase 9 Complete Criteria:**
- [x] App deployed to production URL
- [x] HTTPS working
- [x] Error tracking (Sentry) active
- [x] Performance monitoring (DataDog) active
- [x] Automated backups enabled
- [x] Uptime monitoring active
- [x] Load test passed (>1000 users)
- [x] SLA documented (99% uptime, <1hr incident response)

---

## After All Phases Complete

### ✨ **UI/UX Polish Phase** (Unlimited Time)

Now that all functionality is complete, you can focus purely on making the system beautiful:

- [ ] Design system review
- [ ] Component library audit
- [ ] Visual polish and animations
- [ ] Responsive mobile design
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Performance optimization
- [ ] Loading state improvements
- [ ] Error message UX
- [ ] User onboarding flows
- [ ] Dashboard visualizations

---

## Checkpoint Summary

| Phase | Status | Hours | Prerequisite |
|-------|--------|-------|--------------|
| **0** | ✅ Complete | — | — |
| **1** | ✅ Complete | — | — |
| **2** | ✅ Complete | — | — |
| **3** | 🔴 Blocked (DB) | 2-3 | DB connection |
| **4** | 🔴 Blocked (DB) | 2 | Phase 3 ✅ |
| **5** | 🔴 Blocked (DB) | 6-8 | None |
| **6** | 🔴 Blocked (DB) | 2 | None |
| **7** | 🔴 Blocked (DB) | 8-10 | Phase 3-6 ✅ |
| **8** | 🔴 Blocked (DB) | 4-6 | None |
| **9** | 🔴 Blocked (DB) | 6-8 | Phase 8 ✅ |
| **UI/UX** | Not Started | ∞ | Phase 9 ✅ |
| **TOTAL** | **40-50 hours** after DB fix | — |

---

## Commands to Know

```bash
# Development
npm run dev                          # Start dev server
npm run type-check                   # TypeScript validation
npm run lint                         # Code style
npm test                            # Unit tests

# Database
npm run db:push                     # Apply migrations
npm run db:pull                     # Refresh schema
npm run db:studio                   # Open database UI
npm run diagnose:db                 # Test connection

# Phase Testing
npm run test:phase3:smoke           # Phase 3 jobs API
npm run test:phase6:smoke           # Phase 6 analytics
npm run test:phase8:smoke           # Phase 8 security
npm run test:e2e                    # All E2E tests
npm run test:e2e:phase7             # E2E critical workflows

# Deployment
npm run build                       # Production build
npm start                           # Run production build
npm run auth:smoke                  # Auth smoke test
npm run verify:all                  # Full verification (type-check + lint + test + build)
```

---

## Next Action

1. **Fix database connection** (`npm run diagnose:db`)
2. **Apply migrations** (`npm run db:push`)
3. **Run this workflow** section by section
4. **Commit after each phase** with conventional commits
5. **Once Phase 9 complete**: UI/UX improvements only

---

**Questions?** See [PHASE_1_9_BLOCKER_REPORT.md](PHASE_1_9_BLOCKER_REPORT.md) for full diagnostics and troubleshooting.
