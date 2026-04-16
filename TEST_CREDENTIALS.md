# Test Credentials for GensanWorks-Next Demo

Use these credentials to test the system:

## Account Credentials

### Jobseeker Account
- **Email**: jobseeker@example.com
- **Password**: password123
- **Role**: Jobseeker
- **Description**: Standard job applicant account

### Employer Account
- **Email**: employer@example.com
- **Password**: password123
- **Role**: Employer
- **Description**: Company/hiring manager account

### Admin Account
- **Email**: admin@example.com
- **Password**: password123
- **Role**: Admin
- **Description**: System administrator account

---

## How to Use These Credentials

### Method 1: Browser Login (Easiest)
1. Start dev server: `npm run dev`
2. Visit http://localhost:3000
3. Click "Login" button
4. Enter email and password from above
5. You'll be redirected to your role-specific dashboard

### Method 2: API Authentication (Curl)

**Login and get session cookie:**
```bash
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"jobseeker@example.com","password":"password123"}' \
  -c cookies.txt
```

**Use cookie in subsequent requests:**
```bash
curl -X GET "http://localhost:3000/api/jobseeker/profile" \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

### Method 3: Environment Variables (E2E Testing)

**Set credentials for E2E tests:**
```bash
# On Linux/Mac:
export E2E_JOBSEEKER_EMAIL=jobseeker@example.com
export E2E_JOBSEEKER_PASSWORD=password123
export E2E_EMPLOYER_EMAIL=employer@example.com
export E2E_EMPLOYER_PASSWORD=password123
export E2E_ADMIN_EMAIL=admin@example.com
export E2E_ADMIN_PASSWORD=password123

# On Windows PowerShell:
$env:E2E_JOBSEEKER_EMAIL="jobseeker@example.com"
$env:E2E_JOBSEEKER_PASSWORD="password123"
$env:E2E_EMPLOYER_EMAIL="employer@example.com"
$env:E2E_EMPLOYER_PASSWORD="password123"
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="password123"

# Run E2E tests:
npm run e2e
```

---

## What You Can Test With Each Role

### Jobseeker Account
Features available after login:
- ✓ View and edit profile (name, skills, experience)
- ✓ Browse all public jobs
- ✓ Search jobs by keyword, location, salary range
- ✓ View detailed job postings
- ✓ Apply for jobs with cover letter
- ✓ View all submitted applications
- ✓ Track application status (applied, shortlisted, rejected, offered)
- ✓ View saved jobs
- ✓ Manage notifications
- ✓ View messages from employers
- ✓ Change password
- ✓ Request account deletion

### Employer Account
Features available after login:
- ✓ View and edit company profile
- ✓ Post new job openings (set title, description, requirements, salary)
- ✓ View all jobs posted by your company
- ✓ Edit published jobs
- ✓ Archive/delete jobs
- ✓ View all applications received
- ✓ Filter applications by job and status
- ✓ Update application status (shortlist, reject, offer)
- ✓ Send messages/feedback to applicants
- ✓ View applicant profiles
- ✓ Track hiring metrics (applications, hire rate)
- ✓ View referral stats
- ✓ Change password

### Admin Account
Features available after login:
- ✓ View system dashboard (user count, jobs posted, applications)
- ✓ View all access requests from users wanting admin role
- ✓ Approve or reject admin access requests
- ✓ View all employers in the system
- ✓ View all posted jobs
- ✓ Delete user accounts
- ✓ View system analytics (user growth, hiring trends)
- ✓ Export data (users, jobs, applications) as CSV
- ✓ View audit logs

---

## Test Workflows

### Workflow 1: Complete Jobseeker Flow
1. **Sign up** (optional, or use existing credential above)
   - Go to http://localhost:3000/signup/jobseeker
   - Fill form and submit

2. **Complete profile**
   - Log in with jobseeker@example.com / password123
   - Go to /jobseeker/profile
   - Add name, skills, experience

3. **Browse jobs**
   - Go to /jobseeker/jobs
   - Search for "Engineer" or "Developer"
   - Click job title to view details

4. **Apply for job**
   - Click "Apply" button on job detail
   - Enter cover letter
   - Submit application

5. **Track application**
   - Go to /jobseeker/applications
   - View application status
   - Check for messages from employer

### Workflow 2: Complete Employer Flow
1. **Sign up** (optional, or use existing credential above)
   - Go to http://localhost:3000/signup/employer
   - Fill form with company details

2. **Post a job**
   - Log in with employer@example.com / password123
   - Go to /employer/jobs
   - Click "New Job Posting"
   - Fill requirements, salary, location
   - Publish job

3. **Receive applications**
   - Go to /employer/applications
   - View applicants for your jobs
   - Read applicant profiles

4. **Manage applications**
   - Click on applicant
   - Update status (shortlist/reject/offer)
   - Send feedback message

5. **View analytics**
   - Go to /employer/dashboard
   - View hiring metrics
   - Check referral performance

### Workflow 3: Admin Oversight
1. **Review system health**
   - Log in with admin@example.com / password123
   - Go to /admin/dashboard
   - View user and job counts

2. **Process access requests**
   - Go to /admin/access-requests
   - Review pending requests
   - Approve or reject

3. **Manage users**
   - Go to /admin/employers
   - View all employers
   - Delete problematic accounts if needed

4. **View analytics**
   - Go to /admin/analytics
   - View hiring trends
   - Export data as CSV

---

## Common Test Actions

### Test Job Browsing (No Auth Required)
```bash
# Get list of all public jobs
curl "http://localhost:3000/api/jobs/mock?limit=10&offset=0"

# Get single job detail
curl "http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440001/mock"

# Search for jobs
curl "http://localhost:3000/api/jobs/mock?search=engineer"
```

### Test Authenticated Endpoints
```bash
# Login first
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"jobseeker@example.com","password":"password123"}' \
  -c cookies.txt

# Get jobseeker profile
curl "http://localhost:3000/api/jobseeker/profile" \
  -b cookies.txt

# Get user's applications
curl "http://localhost:3000/api/jobseeker/applications" \
  -b cookies.txt

# Apply for a job
curl -X POST "http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440001/apply/mock" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"coverLetter":"I am interested in this position"}'
```

### Test Employer Endpoints
```bash
# Login as employer
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"employer@example.com","password":"password123"}' \
  -c employer_cookies.txt

# Get employer's jobs
curl "http://localhost:3000/api/employer/jobs" \
  -b employer_cookies.txt

# Get applications for employer's jobs
curl "http://localhost:3000/api/employer/applications" \
  -b employer_cookies.txt
```

### Test Admin Endpoints
```bash
# Login as admin
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  -c admin_cookies.txt

# Get system analytics
curl "http://localhost:3000/api/admin/analytics" \
  -b admin_cookies.txt

# Export data as CSV
curl "http://localhost:3000/api/admin/analytics?export=csv" \
  -b admin_cookies.txt \
  -o analytics.csv
```

---

## Notes

- **Mock Database**: Currently using mock in-memory database for testing
- **Real Database**: When Supabase is restored, remove `/mock` from URLs
- **Session Duration**: Sessions last 30 minutes of inactivity
- **Password Requirements**: Minimum 8 characters
- **Email Format**: Must be valid email format
- **Rate Limiting**: 
  - Login: 5 attempts per minute per IP
  - API endpoints: 60 requests per minute per IP
  - Job applications: 10 per day per jobseeker

---

## Troubleshooting

**Q: Login doesn't work?**
A: Check that dev server is running with `npm run dev`

**Q: Getting "Unauthorized" on API call?**
A: Make sure to include authentication cookie with `curl ... -b cookies.txt`

**Q: Database connection error?**
A: You're seeing the database blocker. This is expected. Follow PHASE_EXECUTION_GUIDE.md to restore Supabase.

**Q: Want to test with real database?**
A: See "To Use Real Database" section in DEMO_QUICK_START.md

---

## Next Steps

1. Start demo: `npm run dev`
2. Try a workflow above
3. When ready for production: Follow PHASE_EXECUTION_GUIDE.md
4. Restore database at https://app.supabase.com (Project: tsvioxrlmcsqdricdgkd)
5. Run `npm run diagnose:db` to verify
6. Continue with Phase 3-9 execution

---

**Ready to test?** Run: `npm run dev` and visit http://localhost:3000
