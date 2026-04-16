# Manual Phase 3-9 Testing Guide

**Status**: Ready for execution  
**Blocker**: Database connection needed  
**Time to Resume Work**: <1 hour (user resumes database)

---

## Prerequisites

Before starting any phase testing:

```bash
# 1. Verify database is working
npm run diagnose:db
# Expected: "✅ All checks passed! Database is accessible."

# 2. Apply migrations
npm run db:push

# 3. Verify build is clean
npm run type-check
npm run lint
npm test
npm run build

# 4. Start development server
npm run dev
# Should start without errors
```

---

## Phase 3: Public Job Browsing (2-3 hours)

### Test 1: GET /api/jobs (List with Pagination)

**Objective**: Verify jobs API returns paginated results

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test job list endpoint
curl "http://localhost:3000/api/jobs?limit=10&offset=0"

# Expected Response:
# {
#   "data": [
#     { "id": "...", "title": "...", "description": "..." },
#     ...
#   ],
#   "pagination": { "limit": 10, "offset": 0, "total": 3 }
# }
```

**Success Criteria**:
- ✅ Response status: 200
- ✅ `data` array has jobs
- ✅ `pagination` object present
- ✅ Response time < 1 second

### Test 2: GET /api/jobs (Search)

**Objective**: Verify search filters work

```bash
curl "http://localhost:3000/api/jobs?search=engineer&limit=10"

# Expected: Returns jobs matching "engineer"
```

**Success Criteria**:
- ✅ Returns only jobs containing "engineer"
- ✅ Response time < 1 second

### Test 3: GET /api/jobs/[id] (Detail View)

**Objective**: Verify job detail endpoint

```bash
# Get a job ID from the list first
JOBID="550e8400-e29b-41d4-a716-446655440001"

curl "http://localhost:3000/api/jobs/$JOBID"

# Expected:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440001",
#   "title": "Senior Software Engineer",
#   "description": "Build scalable systems...",
#   "employer": { "id": "...", "name": "Tech Corp", ... },
#   ...
# }
```

**Success Criteria**:
- ✅ Response status: 200
- ✅ Includes employer details
- ✅ Includes job requirements

### Test 4: POST /api/jobs/[id]/apply (Apply for Job)

**Objective**: Verify application submission

```bash
# First, login as jobseeker
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jobseeker@example.com",
    "password": "password123",
    "role": "jobseeker"
  }'

# Get token from response
TOKEN="eyJhbGc..." # from login response

# Apply for job
curl -X POST "http://localhost:3000/api/jobs/$JOBID/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coverLetter": "I am interested in this role..."}'

# Expected: 200 with application ID
```

**Success Criteria**:
- ✅ Response status: 200
- ✅ Application ID returned
- ✅ Application appears in jobseeker's application list

### Test 5: GET /api/jobseeker/applications (View Applications)

**Objective**: Verify jobseeker can view their applications

```bash
curl "http://localhost:3000/api/jobseeker/applications" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of applications with status, job details, etc.
```

**Success Criteria**:
- ✅ Returns array of applications
- ✅ Each includes job details and status

### Browser-Based Testing

```
1. Go to http://localhost:3000
2. Sign up as jobseeker (if not already)
3. Navigate to http://localhost:3000/jobseeker/jobs
4. Verify jobs list loads
5. Click on a job to view details
6. Click "Apply" button
7. Fill out and submit application
8. Navigate to http://localhost:3000/jobseeker/applications
9. Verify application appears in list
```

---

## Phase 4: Employer Management (2 hours)

### Test 1: Employer Profile

```bash
# Get employer profile
curl "http://localhost:3000/api/employer/profile" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN"

# Expected: Employer details with company info
```

### Test 2: Create Job

```bash
curl -X POST "http://localhost:3000/api/employer/jobs" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Junior Developer",
    "description": "Entry-level developer position",
    "requirements": ["JavaScript", "React"],
    "salaryMin": 40000,
    "salaryMax": 60000
  }'

# Expected: 201 with job ID
```

### Test 3: View Applications

```bash
curl "http://localhost:3000/api/employer/applications" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN"

# Expected: All applications to employer's jobs
```

### Test 4: Update Application Status

```bash
APPID="550e8400-e29b-41d4-a716-446655440201"

curl -X PATCH "http://localhost:3000/api/employer/applications/$APPID" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "shortlisted"}'

# Expected: 200 with updated application
```

### Browser-Based Testing

```
1. Go to http://localhost:3000
2. Sign up as employer
3. Navigate to http://localhost:3000/employer/jobs
4. Click "Post Job" and fill form
5. Verify job appears in list
6. Wait for applications (or signup as jobseeker and apply)
7. Go to http://localhost:3000/employer/applications
8. View applications and update status
```

---

## Phase 5: Messaging & Notifications (1 hour)

### Test 1: Send Message

```bash
curl -X POST "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "user-id",
    "message": "Hello, interested in your application..."
  }'

# Expected: 201 with message ID
```

### Test 2: Get Messages

```bash
curl "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of message threads
```

### Test 3: Notifications

```bash
# Get notifications
curl "http://localhost:3000/api/notifications" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of notifications (new applications, messages, etc.)

# Mark as read
curl -X PATCH "http://localhost:3000/api/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200
```

---

## Phase 6: Admin Analytics (1 hour)

### Test 1: Admin Dashboard

```bash
# Login as admin
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'

# Get admin summary
curl "http://localhost:3000/api/admin/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: System metrics (user count, jobs posted, applications, etc.)
```

### Test 2: Analytics

```bash
curl "http://localhost:3000/api/admin/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: Detailed analytics (trends, funnel, etc.)
```

### Test 3: CSV Export

```bash
curl "http://localhost:3000/api/admin/analytics/export" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > analytics.csv

# Expected: CSV file with data
```

### Browser-Based Testing

```
1. Login as admin (http://localhost:3000/login)
2. Go to http://localhost:3000/admin/dashboard
3. Verify metrics display
4. Go to http://localhost:3000/admin/analytics
5. Verify charts render
6. Click "Export" to download CSV
```

---

## Phase 7: E2E Testing (Run Full Suite)

```bash
# Run all E2E tests
npm run test:e2e

# Run specific workflows
npm run test:e2e -- e2e/jobseeker-workflow.spec.ts
npm run test:e2e -- e2e/employer-workflow.spec.ts
npm run test:e2e -- e2e/admin-workflow.spec.ts

# Run with UI (debug mode)
npm run test:e2e:ui
```

---

## Phase 8: Security Testing

```bash
# Run security smoke tests
npm run test:security

# Expected: All security headers present, rate limiting works, CSRF protected
```

---

## Phase 9: Load Testing

```bash
# Run load test (simulates 1000+ concurrent users)
npm run test:load:smoke

# Expected: 
# - No errors
# - Response times acceptable
# - Identify any bottlenecks
```

---

## Troubleshooting

### 500 Error When Testing API

**Problem**: `GET /api/jobs` returns 500  
**Likely Cause**: Database connection failure  
**Solution**:
```bash
npm run diagnose:db
# Should show connection issue and next steps
```

### Authentication Failing

**Problem**: Login returns 401  
**Likely Causes**:
- User doesn't exist
- Password incorrect
- NextAuth not configured

**Solution**:
```bash
# Bootstrap test accounts
npm run auth:bootstrap-passwords

# Then login with:
# Email: admin@local.test
# Password: [password from terminal output]
```

### Playwright Tests Timing Out

**Problem**: E2E tests timeout after 30 seconds  
**Likely Cause**: Server not responding  
**Solution**:
```bash
# Verify server is running
npm run dev

# Run E2E with increased timeout
PLAYWRIGHT_TEST_TIMEOUT=60000 npm run test:e2e
```

---

## Success Checklist

### Phase 3 ✅
- [ ] `GET /api/jobs` returns list with pagination
- [ ] `GET /api/jobs?search=...` filters correctly
- [ ] `GET /api/jobs/[id]` returns job details
- [ ] `POST /api/jobs/[id]/apply` creates application
- [ ] Jobseeker can browse and apply via UI
- [ ] No 500 errors

### Phase 4 ✅
- [ ] Employer can post jobs
- [ ] Posted jobs appear in public list
- [ ] Employer can view applications
- [ ] Employer can update application status
- [ ] E2E workflow passes

### Phase 5 ✅
- [ ] Messages can be sent and retrieved
- [ ] Notifications are created
- [ ] Real-time updates work (SSE)
- [ ] Email notifications sent (check Resend)
- [ ] SMS alerts sent (check Twilio)

### Phase 6 ✅
- [ ] Admin dashboard loads
- [ ] Metrics display correctly
- [ ] Analytics render without errors
- [ ] CSV export works
- [ ] No 500 errors

### Phase 7 ✅
- [ ] All E2E tests pass
- [ ] No timeouts
- [ ] >80% code coverage

### Phase 8 ✅
- [ ] Security tests pass
- [ ] No OWASP vulnerabilities
- [ ] CSP headers enforced
- [ ] GDPR compliant

### Phase 9 ✅
- [ ] Deployed to production
- [ ] Error tracking active
- [ ] Performance monitoring active
- [ ] Load test passed

---

**Next Step**: Once database is resumed, follow this guide section-by-section to validate all phases.
