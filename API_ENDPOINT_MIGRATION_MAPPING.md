# API Endpoint Migration Mapping Reference

This document maps every API endpoint from the original Express.js server to its corresponding Next.js API route handler. Use this during implementation as a quick reference.

---

## Quick Navigation

- [Authentication](#authentication-11-endpoints)
- [Jobs](#jobs-14-endpoints)  
- [Applications](#applications-4-endpoints)
- [Employers](#employers-19-endpoints)
- [Applicants](#applicants-7-endpoints)
- [Jobseeker Routes](#jobseeker-routes-3-endpoints)
- [Messaging](#messaging-6-endpoints)
- [Notifications](#notifications-5-endpoints)
- [Referrals](#referrals-4-endpoints)
- [Admin](#admin-25-endpoints)
- [Analytics & Reports](#analytics--reports-9-endpoints)
- [Settings](#settings-6-endpoints)
- [Utilities](#utilities-8-endpoints)

---

## Authentication (11 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/auth/signup/jobseeker` | POST | `app/api/auth/signup/jobseeker/route.ts` | **TIER 1** | Register jobseeker, send verification email |
| `/api/auth/signup/employer` | POST | `app/api/auth/signup/employer/route.ts` | **TIER 1** | Register employer with company info |
| `/api/auth/signup/admin` | POST | `app/api/auth/signup/admin/route.ts` | **TIER 1** | Admin creation - setup only |
| `/api/auth/login` | POST | `app/api/auth/login/route.ts` | **TIER 1** | Universal login (role-scoped) |
| `/api/auth/me` | GET | `app/api/auth/me/route.ts` | **TIER 1** | Get current user info |
| `/api/auth/logout` | POST | `app/api/auth/logout/route.ts` | **TIER 1** | Invalidate session/JWT |
| `/auth/google` | GET | `app/api/auth/google/route.ts` | **TIER 2** | OAuth initiate |
| `/auth/google/callback` | GET | `app/api/auth/google/callback/route.ts` | **TIER 2** | OAuth callback - NextAuth handles |
| `/api/jobseeker/change-password` | POST | `app/api/auth/password/change/route.ts` | **TIER 2** | Password change |
| `/api/auth/password/reset` | POST | `app/api/auth/password/reset/route.ts` | **TIER 2** | Password reset request |
| `/api/auth/email/verify` | POST | `app/api/auth/email/verify/route.ts` | **TIER 2** | Verify email token |

---

## Jobs (14 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/jobs` | GET | `app/api/jobs/route.ts` | **TIER 1** | List public jobs, supports filters/pagination |
| `/api/jobs` | POST | `app/api/jobs/route.ts` | **TIER 1** | Create job (admin) |
| `/api/jobs/:jobId` | GET | `app/api/jobs/[jobId]/route.ts` | **TIER 1** | Get job details with relations |
| `/api/jobs/:jobId` | PUT | `app/api/jobs/[jobId]/route.ts` | **TIER 1** | Update job (admin) |
| `/api/jobs/:jobId` | DELETE | `app/api/jobs/[jobId]/route.ts` | **TIER 1** | Delete job (admin) |
| `/api/jobs/:jobId/archive` | PATCH | `app/api/jobs/[jobId]/archive/route.ts` | **TIER 1** | Archive/unarchive toggle |
| `/api/jobs/archived` | GET | `app/api/jobs/archived/route.ts` | **TIER 2** | List archived jobs |
| `/api/jobs/:jobId/apply` | POST | `app/api/jobs/[jobId]/apply/route.ts` | **TIER 1** | Apply for job (jobseeker) |
| `/api/jobs/:jobId/match` | GET | `app/api/jobs/[jobId]/match/route.ts` | **TIER 2** | AI matching algorithm |
| `/api/jobs/:jobId/applicant/:applicantId/ai-insights` | GET | `app/api/jobs/[jobId]/applicant/[applicantId]/ai-insights/route.ts` | **TIER 3** | AI insights for applicant |
| `/api/jobs/:jobId/shortlist` | POST | `app/api/jobs/[jobId]/shortlist/route.ts` | **TIER 2** | Shortlist applicants |
| `/api/job-vacancies` | GET | `app/api/job-vacancies/route.ts` | **TIER 2** | List vacancies with advanced filters |
| `/api/admin/jobs/:id/status` | PATCH | `app/api/admin/jobs/[id]/status/route.ts` | **TIER 2** | Update job approval status |
| `/api/employers/:id/jobs` | GET/POST | `app/api/employers/[id]/jobs/route.ts` | **TIER 2** | Employer's jobs (nested resource) |

---

## Applications (4 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/applications` | GET | `app/api/applications/route.ts` | **TIER 1** | List applications (admin) |
| `/api/applications/:id` | PUT | `app/api/applications/[id]/route.ts` | **TIER 1** | Update application status/notes |
| `/api/applications/:id` | DELETE | `app/api/applications/[id]/route.ts` | **TIER 1** | Delete application |
| `/api/applications/:id/status` | PATCH | `app/api/applications/[id]/status/route.ts` | **TIER 1** | Update status + feedback |

---

## Employers (19 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/employers` | GET | `app/api/employers/route.ts` | **TIER 2** | List active employers (lightweight) |
| `/api/employers` | POST | `app/api/employers/route.ts` | **TIER 2** | Create employer (admin) |
| `/api/employers/:id` | GET | `app/api/employers/[id]/route.ts` | **TIER 2** | Get employer details (admin) |
| `/api/employers/:id` | PUT | `app/api/employers/[id]/route.ts` | **TIER 2** | Update employer (admin) |
| `/api/employers/:id` | DELETE | `app/api/employers/[id]/route.ts` | **TIER 2** | Delete employer |
| `/api/employers/:id/approve` | PATCH | `app/api/employers/[id]/approve/route.ts` | **TIER 2** | Approve employer account |
| `/api/employers/:id/reject` | PATCH | `app/api/employers/[id]/reject/route.ts` | **TIER 2** | Reject employer account |
| `/api/employers/:id/archive` | PATCH | `app/api/employers/[id]/archive/route.ts` | **TIER 2** | Archive/unarchive |
| `/api/employers/archived` | GET | `app/api/employers/archived/route.ts` | **TIER 2** | List archived employers |
| `/api/employers/public/:id` | GET | `app/api/employers/public/[id]/route.ts` | **TIER 3** | Public employer profile |
| `/api/employers/bulk-delete` | POST | `app/api/employers/bulk-delete/route.ts` | **TIER 3** | Delete multiple |
| `/api/employers/check-duplicate` | POST | `app/api/employers/check-duplicate/route.ts` | **TIER 3** | Check duplicate email |
| `/api/employers/:id/requirements/submit-all` | PATCH | `app/api/employers/[id]/requirements/submit-all/route.ts` | **TIER 3** | Mark all requirements submitted |
| `/api/employer/profile` | GET | `app/api/employer/profile/route.ts` | **TIER 1** | Current employer profile |
| `/api/employer/profile` | PUT | `app/api/employer/profile/route.ts` | **TIER 1** | Update own profile |
| `/api/employer/profile-image` | POST | `app/api/employer/profile-image/route.ts` | **TIER 2** | Upload profile image |
| `/api/employer/jobs` | GET | `app/api/employer/jobs/route.ts` | **TIER 1** | My jobs (paginated) |
| `/api/employer/jobs` | POST | `app/api/employer/jobs/route.ts` | **TIER 1** | Submit new job |
| `/api/admin/employers` | GET | `app/api/admin/employers/route.ts` | **TIER 2** | Paginated employers list |

---

## Applicants (7 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/applicants` | GET | `app/api/applicants/route.ts` | **TIER 1** | List applicants with filters |
| `/api/applicants` | POST | `app/api/applicants/route.ts` | **TIER 1** | Create applicant (admin) |
| `/api/applicants/:id` | GET | `app/api/applicants/[id]/route.ts` | **TIER 1** | Get applicant details |
| `/api/applicants/:id` | PUT | `app/api/applicants/[id]/route.ts` | **TIER 1** | Update applicant (self/admin) |
| `/api/applicants/:id` | DELETE | `app/api/applicants/[id]/route.ts` | **TIER 1** | Delete applicant |
| `/api/applicants/bulk-delete` | POST | `app/api/applicants/bulk-delete/route.ts` | **TIER 2** | Delete multiple |
| `/api/admin/applicants` | GET | `app/api/admin/applicants/route.ts` | **TIER 2** | List all with sorting |

---

## Jobseeker Routes (3 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/jobseeker/dashboard` | GET | `app/api/jobseeker/dashboard/route.ts` | **TIER 1** | Dashboard stats |
| `/api/jobseeker/applications` | GET | `app/api/jobseeker/applications/route.ts` | **TIER 1** | My applications |
| `/api/jobseeker/profile-image` | POST | `app/api/jobseeker/profile-image/route.ts` | **TIER 2** | Upload profile image |

---

## Messaging (6 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/messages` | GET | `app/api/messages/route.ts` | **TIER 2** | Get messages (inbox/sent/all) |
| `/api/messages` | POST | `app/api/messages/route.ts` | **TIER 2** | Send new message |
| `/api/messages/:id/read` | PATCH | `app/api/messages/[id]/read/route.ts` | **TIER 2** | Mark as read |
| `/api/messages/conversation/:userId` | GET | `app/api/messages/conversation/[userId]/route.ts` | **TIER 2** | Get conversation |
| `/api/messages/conversation/:userId` | DELETE | `app/api/messages/conversation/[userId]/route.ts` | **TIER 3** | Delete conversation |
| `/api/messages/unread/count` | GET | `app/api/messages/unread/count/route.ts` | **TIER 2** | Get unread count |

---

## Notifications (5 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/notifications` | GET | `app/api/notifications/route.ts` | **TIER 2** | Get notifications |
| `/api/notifications` | POST | `app/api/notifications/route.ts` | **TIER 3** | Create notification (admin) |
| `/api/notifications/:id/read` | PATCH | `app/api/notifications/[id]/read/route.ts` | **TIER 2** | Mark as read |
| `/api/notifications/:id` | DELETE | `app/api/notifications/[id]/route.ts` | **TIER 2** | Delete notification |
| `/api/notifications/stream` | GET | `app/api/notifications/stream/route.ts` | **TIER 3** | SSE stream (real-time) |

---

## Referrals (4 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/referrals` | GET | `app/api/referrals/route.ts` | **TIER 2** | List referrals with filters |
| `/api/referrals` | POST | `app/api/referrals/route.ts` | **TIER 2** | Create/update referral slip |
| `/api/referrals/:referralId/status` | PATCH | `app/api/referrals/[referralId]/status/route.ts` | **TIER 2** | Update status & feedback |
| `/api/referrals/:referralId` | DELETE | `app/api/referrals/[referralId]/route.ts` | **TIER 2** | Delete referral |

---

## Admin (25 endpoints)

### Admin Dashboard
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/stats` | GET | `app/api/admin/stats/route.ts` | **TIER 2** | Quick stats (quick counts) |
| `/api/admin/dashboard` | GET | `app/api/admin/dashboard/route.ts` | **TIER 2** | Full dashboard data |
| `/api/admin/systems-alerts` | GET | `app/api/admin/systems-alerts/route.ts` | **TIER 3** | Validation alerts / issues |

### User Management
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/users` | GET | `app/api/admin/users/route.ts` | **TIER 2** | List all users |
| `/api/admin/users/:id` | PUT | `app/api/admin/users/[id]/route.ts` | **TIER 2** | Update user |
| `/api/admin/users/:id` | DELETE | `app/api/admin/users/[id]/route.ts` | **TIER 2** | Delete user |
| `/api/admin/users/:id/suspend` | PUT | `app/api/admin/users/[id]/suspend/route.ts` | **TIER 3** | Suspend user |
| `/api/admin/stakeholders` | GET | `app/api/admin/stakeholders/route.ts` | **TIER 2** | Users paginated/searchable |

### Activity & Audit
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/activities` | GET | `app/api/admin/activities/route.ts` | **TIER 3** | Activity audit logs |
| `/api/admin/activities/resource/:resourceType/:resourceId` | GET | `app/api/admin/activities/resource/[resourceType]/[resourceId]/route.ts` | **TIER 3** | Activities for resource |
| `/api/admin/activities/user/:userId` | GET | `app/api/admin/activities/user/[userId]/route.ts` | **TIER 3** | Activities by user |

### Job Management
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/jobs` | GET | `app/api/admin/jobs/route.ts` | **TIER 2** | List all jobs |
| `/api/admin/jobs` | POST | `app/api/admin/jobs/route.ts` | **TIER 2** | Create job (admin) |
| `/api/admin/jobs/:id` | GET | `app/api/admin/jobs/[id]/route.ts` | **TIER 2** | Get job |
| `/api/admin/jobs/:id` | PUT | `app/api/admin/jobs/[id]/route.ts` | **TIER 2** | Update job |
| `/api/admin/jobs/:id` | DELETE | `app/api/admin/jobs/[id]/route.ts` | **TIER 2** | Delete job |
| `/api/admin/jobs/:id/status` | PATCH | `app/api/admin/jobs/[id]/status/route.ts` | **TIER 2** | Approve/reject job |
| `/api/admin/applications` | GET | `app/api/admin/applications/route.ts` | **TIER 2** | List all applications |

### Access Requests
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/access-requests` | GET | `app/api/admin/access-requests/route.ts` | **TIER 3** | List access requests |
| `/api/admin/access-requests` | POST | `app/api/admin/access-requests/route.ts` | **TIER 3** | Submit access request |
| `/api/admin/access-requests/:id/approve` | POST | `app/api/admin/access-requests/[id]/approve/route.ts` | **TIER 3** | Approve & create admin |
| `/api/admin/access-requests/:id/reject` | POST | `app/api/admin/access-requests/[id]/reject/route.ts` | **TIER 3** | Reject request |
| `/api/admin/create-admin-user` | POST | `app/api/admin/create-admin-user/route.ts` | **TIER 2** | Create/update admin |

---

## Analytics & Reports (9 endpoints)

### Charts
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/charts/bar` | GET | `app/api/charts/bar/route.ts` | **TIER 3** | Bar chart data |
| `/api/charts/doughnut` | GET | `app/api/charts/doughnut/route.ts` | **TIER 3** | Doughnut chart data |
| `/api/charts/line` | GET | `app/api/charts/line/route.ts` | **TIER 3** | Line chart data |
| `/api/charts/employment-status` | GET | `app/api/charts/employment-status/route.ts` | **TIER 3** | Employment status breakdown |

### Reports & Dashboard
| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/reports/skills` | GET | `app/api/reports/skills/route.ts` | **TIER 3** | Top skills list |
| `/api/summary` | GET | `app/api/dashboard/summary/route.ts` | **TIER 1** | Dashboard summary |
| `/api/recent-activities` | GET | `app/api/dashboard/activities/route.ts` | **TIER 3** | Recent activities |
| `/api/admin/export/applicants` | GET | `app/api/admin/export/applicants/route.ts` | **TIER 3** | CSV/JSON export |
| `/api/admin/export/employers` | GET | `app/api/admin/export/employers/route.ts` | **TIER 3** | CSV/JSON export |

---

## Settings (6 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/settings/general/public` | GET | `app/api/settings/general/public/route.ts` | **TIER 3** | Public general settings |
| `/api/settings/general` | GET | `app/api/settings/general/route.ts` | **TIER 3** | General settings (admin) |
| `/api/settings/general` | PUT | `app/api/settings/general/route.ts` | **TIER 3** | Update general settings |
| `/api/settings/auth/public` | GET | `app/api/settings/auth/public/route.ts` | **TIER 3** | Public auth settings |
| `/api/settings/auth` | GET | `app/api/settings/auth/route.ts` | **TIER 3** | Auth settings (admin) |
| `/api/settings/auth` | PUT | `app/api/settings/auth/route.ts` | **TIER 3** | Update auth settings |

---

## Utilities (8 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/health` | GET | `app/api/health/route.ts` | **TIER 2** | Health check |
| `/api/public/impact` | GET | `app/api/public/impact/route.ts` | **TIER 3** | Public impact metrics |
| `/api/skills/suggestions` | GET | `app/api/skills/suggestions/route.ts` | **TIER 2** | Skill autocomplete |
| `/api/skills/suggestions` | POST | `app/api/skills/suggestions/route.ts` | **TIER 3** | Create skill suggestion |
| `/api/upload/employer-docs` | POST | `app/api/upload/employer-docs/route.ts` | **TIER 2** | Upload employer documents |
| `/api/account/delete` | DELETE | `app/api/account/delete/route.ts` | **TIER 3** | Account deletion (jobseeker) |
| `/api/diagram/png` | POST | `app/api/diagram/png/route.ts` | **TIER 3** | SVG to PNG conversion |
| `GET /uploads/*` | GET | `public/uploads/[...slug]/route.ts` | **TIER 2** | Static file serving |

---

## Data Export Endpoints (5 endpoints)

| Original Express | HTTP | Next.js App Router | Priority | Notes |
|------------------|------|-------------------|----------|-------|
| `/api/admin/export/applicants` | GET | `app/api/admin/export/applicants/route.ts` | **TIER 3** | CSV/JSON export |
| `/api/admin/export/employers` | GET | `app/api/admin/export/employers/route.ts` | **TIER 3** | CSV/JSON export |
| `/api/admin/export/jobs` | GET | `app/api/admin/export/jobs/route.ts` | **TIER 3** | CSV/JSON export |
| `/api/admin/export/applications` | GET | `app/api/admin/export/applications/route.ts` | **TIER 3** | CSV/JSON export |
| `/api/admin/export/referrals` | GET | `app/api/admin/export/referrals/route.ts` | **TIER 3** | CSV/JSON export |

---

## Summary by Priority

### Tier 1 (Critical - 25 endpoints)
Must implement first for basic app functionality:
- All authentication flows (11 endpoints)
- Core job operations (6 endpoints)
- Employer & applicant profile management (5 endpoints)
- Dashboard summary (1 endpoint)
- Jobseeker basics (2 endpoints)

**Estimated Effort:** 1.5 weeks

### Tier 2 (Important - 50 endpoints)
Secondary features that add significant value:
- Job-related features (advanced) - 5 endpoints
- Employer management (admin) - 8 endpoints
- Applicant management - 7 endpoints
- Messaging - 6 endpoints
- Admin tools - 8 endpoints
- Settings & configuration - 4 endpoints
- File upload/serve - 2 endpoints
- Referral management - 4 endpoints
- Utilities - 6 endpoints

**Estimated Effort:** 2 weeks

### Tier 3 (Nice-to-Have - 52 endpoints)
Polish and advanced features:
- Analytics & charts - 5 endpoints
- Data export - 5 endpoints
- Advanced admin tools - 15 endpoints
- Real-time (SSE) - 1 endpoint
- Account management - 2 endpoints
- Settings - 6 endpoints
- Public endpoints - 10 endpoints
- Other utilities - 8 endpoints

**Estimated Effort:** 1.5 weeks

---

## Implementation Order By Phase

### Phase 1: Foundation (Week 1)
- Authentication infrastructure (11 endpoints)
- Core auth middleware
- Request/response formatting
- Error handling

### Phase 2: Core Resources (Week 2-3)
- Jobs (6 endpoints)
- Applications (4 endpoints)
- Employer profile (2 endpoints)
- Applicants (7 endpoints)
- Dashboard basics (1 endpoint)

### Phase 3: Support Systems (Week 3-4)
- Messaging (6 endpoints)
- Notifications (5 endpoints)
- Referrals (4 endpoints)
- Jobseeker dashboard (3 endpoints)
- File uploads (2 endpoints)

### Phase 4: Admin & Admin Tools (Week 4-5)
- Admin dashboard (3 endpoints)
- User management (5 endpoints)
- Job management (admin) (7 endpoints)
- Settings (6 endpoints)
- Access requests (4 endpoints)

### Phase 5: Analytics & Export (Week 5-6)
- Charts & reports (5 endpoints)
- Data export (5 endpoints)
- Advanced analytics (3 endpoints)
- Public endpoints (10 endpoints)
- Utilities (8 endpoints)

### Phase 6: Testing & Optimization (Week 6)
- Unit tests for all routes
- Integration tests
- E2E tests
- Performance tuning
- Documentation

---

## Notes for Implementers

1. **File Structure:** Follow the directory layout exactly as specified in [NEXTJS_API_MIGRATION_PLAN.md](NEXTJS_API_MIGRATION_PLAN.md#directory-structure)

2. **Code Patterns:** Use the patterns from [NEXTJS_API_IMPLEMENTATION_GUIDE.md](NEXTJS_API_IMPLEMENTATION_GUIDE.md)

3. **Authentication:** All endpoints marked "Required" need auth middleware (see `lib/middleware/auth.ts`)

4. **Database:** All operations use Drizzle ORM (imported from `@/db`)

5. **Validation:** Use Zod schemas from `lib/validation/schemas.ts`

6. **Error Handling:** Use standardized errors from `lib/api/errors.ts`

7. **Response Format:** Use `successResponse()`, `paginatedResponse()`, `errorResponse()` from `lib/api/response.ts`

8. **Nested Routes:** Use Next.js `[id]` directory syntax for dynamic routes (e.g., `/jobs/[jobId]/`)

9. **Blob Operations:** For dynamic routes, import params via function signature: `({ params }: { params: { jobId: string } })`

10. **QueryParams:** Parse with `new URL(req.url).searchParams`

---

**Status:** Ready for Phase 1 implementation  
**Last Updated:** [Current Date]
