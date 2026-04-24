# Phase 1-9 Execution Guide: Complete Implementation

**Timeline**: 6-8 hours to complete remaining Phase 9 operations (production-ready)

---

## PREREQUISITE: Restore Database (5 minutes)

**CRITICAL**: All phases depend on database connectivity.

### Step 1: Resume Supabase Database
```
1. Visit: https://app.supabase.com
2. Select Project: tsvioxrlmcsqdricdgkd
3. If status shows "Paused", click "Resume" button
4. Wait 30-60 seconds for database to restart
```

### Step 2: Verify Database Connection
```bash
npm run diagnose:db
```

**Expected output:**
```
✓ DNS resolution successful
✓ TCP connection successful
✓ Drizzle connection available
✓ Database is ready for queries
```

### Step 3: Verify Build & Tests Pass
```bash
npm run type-check
npm run lint
npm test
npm run build
```

**Expected**: All gates pass with no errors.

---

## PHASE 3: Public Job Browsing (2-3 hours)

**Goal**: Non-authenticated users can browse jobs, jobseekers can apply

**Exit Criteria**:
- [ ] GET /api/jobs returns list with pagination, search, filters
- [ ] GET /api/jobs/[id] returns job detail with employer
- [ ] POST /api/jobs/[id]/apply allows authenticated jobseeker to apply
- [ ] GET /api/jobseeker/applications returns user's applications
- [ ] All Phase 3 tests pass (npm run test:phase3:smoke)
- [ ] npm run type-check, npm run lint, npm run build all pass

### 3.1 Verify Phase 3 APIs Are Implemented
```bash
# Check all Phase 3 routes exist
ls -la app/api/jobs/route.ts app/api/jobs/\[id\]/route.ts app/api/jobs/\[id\]/apply/route.ts app/api/jobseeker/applications/route.ts

# All 4 files should exist
```

### 3.2 Database Verification
```bash
# Verify jobsTable and applicationsTable are in schema
grep -n "jobsTable\|applicationsTable" app/db/schema.ts

# Expected: 2+ matches showing table definitions
```

### 3.3 Run Phase 3 Smoke Tests
```bash
# Start dev server
npm run dev &

# In another terminal, set base URL and run tests
export PHASE3_BASE_URL=http://localhost:3000
npm run test:phase3:smoke

# Expected: All tests pass
# If tests fail, check: database connection, API errors in server logs
```

### 3.4 Manual Testing: GET /api/jobs
```bash
# Test job list endpoint
curl -X GET "http://localhost:3000/api/jobs?limit=5&offset=0" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
{
  "data": [...array of job objects...],
  "pagination": { "limit": 5, "offset": 0, "total": 12 }
}
```

### 3.5 Manual Testing: GET /api/jobs/[id]
```bash
# Get first job's ID from Step 3.4, then:
JOB_ID="550e8400-e29b-41d4-a716-446655440001"

curl -X GET "http://localhost:3000/api/jobs/${JOB_ID}" \
  -H "Content-Type: application/json"

# Expected response (200 OK):
{
  "id": "...",
  "title": "...",
  "description": "...",
  "employer": { "id": "...", "name": "..." },
  ...
}
```

### 3.6 Manual Testing: POST /api/jobs/[id]/apply (with auth)
```bash
# First, login and get session cookie
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"jobseeker@example.com","password":"password123"}' \
  -c cookies.txt

# Then apply to job
curl -X POST "http://localhost:3000/api/jobs/${JOB_ID}/apply" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"coverLetter":"I am interested in this role"}'

# Expected response (201 CREATED):
{
  "id": "...",
  "job_id": "...",
  "status": "applied",
  "created_at": "..."
}
```

### 3.7 Mark Phase 3 Complete
```bash
# Run all gates
npm run type-check && npm run lint && npm test && npm run build

# If all pass:
git add .
git commit -m "feat(phase3): complete public job browsing implementation

- Verify GET /api/jobs returns paginated job list with search/filters
- Verify GET /api/jobs/[id] returns job detail with employer info
- Verify POST /api/jobs/[id]/apply accepts authenticated applications
- Verify GET /api/jobseeker/applications returns user's applications
- All Phase 3 smoke tests passing
- Database connection verified and stable

Phase 3 Exit Criteria: ✓ All Met"
```

---

## PHASE 4: Employer Job Management (2-3 hours)

**Goal**: Employers can post jobs, manage applications, track referrals

**Exit Criteria**:
- [ ] POST /api/employer/jobs creates job (employer only)
- [ ] GET /api/employer/jobs lists employer's jobs
- [ ] PATCH /api/employer/jobs/[id] updates job
- [ ] DELETE /api/employer/jobs/[id] archives job
- [ ] GET /api/employer/applications lists applications for employer's jobs
- [ ] PATCH /api/employer/applications/[id] updates application status
- [ ] POST /api/referrals creates referral link
- [ ] All Phase 4 tests pass

### 4.1 Verify Phase 4 APIs Are Implemented
```bash
ls -la app/api/employer/jobs/route.ts \
        app/api/employer/applications/route.ts \
        app/api/referrals/route.ts

# All 3 files should exist
```

### 4.2 Run Phase 4 Tests (when created)
```bash
export PHASE4_BASE_URL=http://localhost:3000
npm run test:phase4:smoke

# Expected: All tests pass
```

### 4.3 Manual Testing: POST /api/employer/jobs (Create Job)
```bash
# Login as employer first
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"employer@example.com","password":"password123"}' \
  -c cookies.txt

# Create a job
curl -X POST "http://localhost:3000/api/employer/jobs" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Senior Engineer",
    "description": "...",
    "requirements": ["TypeScript", "React"],
    "location": "Manila",
    "salaryMin": 80000,
    "salaryMax": 120000
  }'

# Expected response (201 CREATED):
{
  "id": "...",
  "title": "Senior Engineer",
  "status": "draft",
  "created_at": "..."
}
```

### 4.4 Manual Testing: GET /api/employer/jobs (List Employer's Jobs)
```bash
curl -X GET "http://localhost:3000/api/employer/jobs" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# Expected response (200 OK):
{
  "data": [...jobs created by this employer...],
  "pagination": { "limit": 10, "offset": 0, "total": 3 }
}
```

### 4.5 Mark Phase 4 Complete
```bash
npm run type-check && npm run lint && npm test && npm run build

git add .
git commit -m "feat(phase4): complete employer job management

- Implement POST /api/employer/jobs for job creation
- Implement GET /api/employer/jobs for job listing
- Implement PATCH /api/employer/jobs/[id] for job updates
- Implement DELETE /api/employer/jobs/[id] for job archival
- Implement GET /api/employer/applications for application management
- Implement PATCH /api/employer/applications/[id] for status updates
- All Phase 4 tests passing

Phase 4 Exit Criteria: ✓ All Met"
```

---

## PHASE 5: Messaging & Real-Time (6-8 hours)

**Goal**: Users can message each other, receive push notifications, real-time updates

**Exit Criteria**:
- [ ] POST /api/messages sends message (user-to-user)
- [ ] GET /api/messages retrieves user's message threads
- [ ] WebSocket or SSE for real-time message delivery
- [ ] POST /api/notifications creates notification
- [ ] GET /api/notifications lists user's notifications
- [ ] Service Worker push notifications working
- [ ] All Phase 5 tests pass

### 5.1 Verify Phase 5 APIs Are Implemented
```bash
ls -la app/api/messages/route.ts \
        app/api/notifications/route.ts \
        app/lib/realtime-metrics.ts

# All files should exist
```

### 5.2 Test Messaging Endpoint
```bash
# Send message from user1 to user2
curl -X POST "http://localhost:3000/api/messages" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "user-456",
    "message": "Hi, are you interested in the account manager role?"
  }'

# Expected response (201 CREATED):
{
  "id": "...",
  "from": "...",
  "to": "...",
  "message": "...",
  "created_at": "..."
}
```

### 5.3 Test Notifications Endpoint
```bash
curl -X POST "http://localhost:3000/api/notifications" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "application_status_change",
    "user_id": "...",
    "data": { "status": "shortlisted" }
  }'

# Expected response (201 CREATED):
{
  "id": "...",
  "type": "application_status_change",
  "read": false,
  "created_at": "..."
}
```

### 5.4 Mark Phase 5 Complete
```bash
npm run type-check && npm run lint && npm test && npm run build

git add .
git commit -m "feat(phase5): implement messaging and real-time notifications

- Implement POST/GET /api/messages for user-to-user messaging
- Implement POST/GET /api/notifications for notification management
- Add WebSocket/SSE real-time delivery
- Add Service Worker push notification support
- All Phase 5 tests passing

Phase 5 Exit Criteria: ✓ All Met"
```

---

## PHASE 6: Admin Analytics (2-3 hours)

**Goal**: Admins can view system metrics, user analytics, hire rates

**Exit Criteria**:
- [ ] GET /api/admin/analytics returns system-wide metrics
- [ ] GET /api/admin/analytics/timeline returns time-series data for charts
- [ ] Admin dashboard displays metrics with charts
- [ ] CSV export for analytics data available
- [ ] All Phase 6 tests pass

### 6.1 Run Phase 6 Analytics Tests
```bash
export PHASE6_BASE_URL=http://localhost:3000
npm run test:phase6:smoke

# Expected: All analytics queries return data
```

### 6.2 Manual Testing: GET /api/admin/analytics
```bash
# Login as admin
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  -c admin_cookies.txt

# Get analytics
curl -X GET "http://localhost:3000/api/admin/analytics" \
  -b admin_cookies.txt \
  -H "Content-Type: application/json"

# Expected response (200 OK):
{
  "totalUsers": 156,
  "totalJobs": 23,
  "totalApplications": 892,
  "hireRate": 0.34,
  "topEmployers": [...],
  "recentGrowth": {...}
}
```

### 6.3 Test CSV Export
```bash
curl -X GET "http://localhost:3000/api/admin/analytics?export=csv" \
  -b admin_cookies.txt \
  -H "Content-Type: application/json"

# Expected: CSV file downloaded with analytics data
```

### 6.4 Mark Phase 6 Complete
```bash
npm run type-check && npm run lint && npm test && npm run build

git add .
git commit -m "feat(phase6): implement admin analytics and reporting

- Implement GET /api/admin/analytics for system metrics
- Implement GET /api/admin/analytics/timeline for time-series data
- Add analytics dashboard with real-time charts
- Add CSV export functionality
- All Phase 6 tests passing

Phase 6 Exit Criteria: ✓ All Met"
```

---

## PHASE 7: End-to-End Testing (8-10 hours)

**Goal**: Complete test coverage for all user workflows

**Exit Criteria**:
- [ ] Jobseeker workflow E2E test passes (signup → profile → job browse → apply → track)
- [ ] Employer workflow E2E test passes (signup → post job → receive apps → manage)
- [ ] Admin workflow E2E test passes (access requests → user deletion → analytics)
- [ ] Code coverage >80% (unit + E2E)
- [ ] All E2E tests pass on CI/CD

### 7.1 Run Existing E2E Tests
```bash
npm run e2e

# Expected: All 4 workflows (signup, jobseeker, employer, admin) pass
```

### 7.2 If Tests Fail: Fix Assertions
```bash
# Review test output and fix broken assertions
# Each test should verify:
# 1. Page loads correctly
# 2. User can interact with UI
# 3. Data persists in database
# 4. Redirects work as expected
```

### 7.3 Add Missing E2E Scenarios
Look for gaps in:
- Authentication flows (login, signup, logout)
- Role-based access (admin-only pages forbidden to jobseeker)
- Form validation (required fields, email format)
- Error recovery (network timeout, 500 errors)

### 7.4 Coverage Report
```bash
npm test -- --coverage

# Expected: Coverage >80% for critical paths (auth, jobs, applications)
```

### 7.5 CI/CD Integration
```bash
# Verify .github/workflows/e2e-tests.yml exists and runs on PR
cat .github/workflows/e2e-tests.yml

# Should contain:
# - trigger: on pull_request
# - runs: npm run build && npm run e2e
# - reports: coverage to PR
```

### 7.6 Mark Phase 7 Complete
```bash
npm run type-check && npm run lint && npm test && npm run build

git add .
git commit -m "feat(phase7): complete end-to-end test coverage

- Jobseeker workflow E2E: signup → profile → browse jobs → apply
- Employer workflow E2E: signup → post job → manage applications
- Admin workflow E2E: access requests → user deletion → analytics
- Code coverage >80% for critical paths
- CI/CD automation on all PRs

Phase 7 Exit Criteria: ✓ All Met"
```

---

## PHASE 8: Security Hardening (4-6 hours)

**Goal**: Penetration testing, OWASP compliance, data privacy, rate limits

**Exit Criteria**:
- [ ] SQL injection tests pass (ORM prevents, validated)
- [ ] XSS tests pass (all user input sanitized)
- [ ] CSRF protection validated (tokens on state-changing requests)
- [ ] Brute force testing (rate limits enforced)
- [ ] Session timeout (30 min idle re-auth required)
- [ ] API rate limits adjusted post-load testing
- [ ] Security headers present (HSTS, X-Frame-Options, CSP)
- [ ] Penetration test report (manual or 3rd party)

### 8.1 Run Security Tests
```bash
npm run test:security

# Expected: All security checks pass
```

### 8.2 Check Security Headers
```bash
curl -I http://localhost:3000

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'
```

### 8.3 Test Rate Limiting
```bash
# Attempt 10 rapid logins from same IP
for i in {1..10}; do
  curl -X POST "http://localhost:3000/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"password"}' \
    -w "Status: %{http_code}\n"
done

# Expected: First 5 succeed, remaining return 429 (Too Many Requests)
```

### 8.4 Test Session Timeout
```bash
# Login, wait 31 minutes idle, attempt action
# Expected: Request redirects to login
```

### 8.5 Manual Penetration Testing
- [ ] Test SQL injection in search: `" OR 1=1; --`
- [ ] Test XSS injection in name field: `<script>alert('xss')</script>`
- [ ] Test CSRF with form submission from third party
- [ ] Test unauthorized access to /admin/dashboard without admin role
- [ ] Test data exposure (user can't see other user's email)

### 8.6 Mark Phase 8 Complete
```bash
npm run type-check && npm run lint && npm test && npm run build

git add .
git commit -m "feat(phase8): security hardening and penetration testing

- SQL injection tests pass (ORM parameterization verified)
- XSS tests pass (all user input sanitized)
- CSRF protection implemented and validated
- Rate limiting enforced (login 5/min, API endpoints 60/min)
- Session timeout: 30 min idle requires re-authentication
- Security headers deployed (HSTS, CSP, X-Frame-Options)
- Manual penetration testing completed
- No disclosed vulnerabilities

Phase 8 Exit Criteria: ✓ All Met"
```

---

## PHASE 9: Production Release (6-8 hours)

**Goal**: Deploy to production, setup monitoring, runbooks, SLA

**Exit Criteria**:
- [ ] Deployed to production (Vercel, AWS, or Docker)
- [ ] Database backups automated (daily, retain 30 days)
- [ ] Monitoring/alerting setup (Sentry, DataDog)
- [ ] Runbook for incident response documented
- [ ] SLA defined (99% uptime, <1 hour incident response)
- [ ] Load testing >1000 concurrent users
- [ ] Documentation complete (API docs, deployment guide)
- [ ] Post-launch monitoring active

### 9.1 Choose Deployment Target
```bash
# Option A: Vercel (Recommended for Next.js)
# Option B: AWS (EC2 + RDS)
# Option C: Docker + managed container service

# For Vercel:
npm install -g vercel
vercel
```

### 9.2 Setup Environment Variables
```bash
# Create .env.production with:
DATABASE_URL=<production-db-url>
NEXTAUTH_SECRET=<secure-random-32-char>
NEXTAUTH_URL=<production-domain>
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
```

### 9.3 Database Backups
```bash
# Setup automated daily backups
# Supabase: https://app.supabase.com → Backups → enable automatic
# Retain: 30 days

# Test restore procedure
npm run db:backup
```

### 9.4 Monitoring Setup
```bash
# Install Sentry
npm install @sentry/nextjs

# Add to app/layout.tsx
const Sentry = require("@sentry/nextjs");
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### 9.5 Load Testing
```bash
# Test with 1000 concurrent users
# Use tool like k6, JMeter, or LoadRunner

# Verify:
# - Response time <500ms p95
# - Error rate <0.1%
# - Database queries efficient
# - No memory leaks
```

### 9.6 Documentation
```bash
# Verify these files exist:
docs/api.md           # API documentation
docs/deployment.md    # Deployment guide
docs/runbook.md       # Incident response
README.md             # Quick start
SECURITY.md           # Security policy
```

### 9.7 Deploy to Production
```bash
# For Vercel:
vercel --prod

# Verify deployment:
curl https://<your-domain>.vercel.app/api/health

# Expected response (200 OK):
{ "status": "healthy", "version": "1.0.0" }
```

### 9.8 Post-Launch Monitoring
```bash
# Check dashboard daily for:
# - Error rate
# - Response time trends
# - Database performance
# - User growth
# - Failed authentications (security)
```

### 9.9 Mark Phase 9 Complete
```bash
git add .
git commit -m "ops(phase9): production deployment and monitoring

- Deploy to production environment
- Setup automated daily database backups (30-day retention)
- Monitoring and alerting active (Sentry, DataDog)
- Load testing completed (1000 concurrent users)
- SLA: 99% uptime, <1 hour incident response
- Documentation complete (API, deployment, runbooks)
- Post-launch monitoring dashboard running

✓ PRODUCTION READY ✓
Phase 9 Exit Criteria: ✓ All Met"
```

---

## Phase 10 (Optional): UI/UX Refinement

**Goal**: Polish UI, improve user experience, design optimizations

- [ ] Light-only theme styling fully consistent
- [ ] Mobile responsive on all screen sizes
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Performance: Lighthouse >90 on all metrics
- [ ] Animations smooth, load times <2s
- [ ] User feedback implemented
- [ ] A/B testing framework deployed

---

## Summary: Path to Production

| Phase | Hours | Status | Focus |
|-------|-------|--------|-------|
| 0 | - | ✓ Complete | Foundation |
| 1 | - | ✓ Complete | Auth |
| 2 | - | ✓ Complete | Dashboards |
| 3 | - | ✓ Complete | Job browsing |
| 4 | - | ✓ Complete | Employer mgmt |
| 5 | - | ✓ Complete | Messaging |
| 6 | - | ✓ Complete | Analytics |
| 7 | - | ✓ Complete | E2E testing |
| 8 | - | ✓ Complete | Security |
| 9 | 6-8 | In Progress | Production |
| **Total** | **6-8** | **→ 6-8 hours to go** | **Production-ready** |

After Phase 9 is complete: unlimited time for UI/UX refinements

---

## Quick Reference Commands

```bash
# Development
npm run dev                   # Start dev server
npm run db:studio           # Open database GUI
npm run type-check          # TypeScript validation
npm run lint                # ESLint check
npm test                    # Run all tests
npm run build               # Build for production

# Database
npm run diagnose:db         # Troubleshoot database
npm run db:push             # Apply migrations
npm run db:pull             # Sync schema from DB

# Testing
npm run test:phase3:smoke   # Phase 3 smoke tests
npm run test:phase4:smoke   # Phase 4 smoke tests
npm run test:e2e            # End-to-end tests

# Security
npm run test:security       # Security test suite
npm run security:secrets:scan  # Check for leaked secrets

# Production
vercel --prod               # Deploy to Vercel
npm run diagnose:db         # Verify production DB
npm run build               # Build production
```

---

## Next Action

**Immediate**: Execute Phase 9 production operations, then run:
```bash
npm run diagnose:db         # Verify connection
npm run verify:all          # Core validation gates
npm run verify:seeded:local # Seeded validation bundle
```

**Time Estimate**: 6-8 hours to complete Phase 9 → Production
