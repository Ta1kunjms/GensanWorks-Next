# GensanWorks Next.js API Migration Plan

**Status:** Planning Phase  
**Last Updated:** 2024  
**Total Endpoints to Migrate:** 127+  
**Estimated Effort:** 4-6 weeks (depending on team size & complexity)

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Migration Strategy](#migration-strategy)
5. [Priority Breakdown](#priority-breakdown)
6. [Implementation Checklist](#implementation-checklist)
7. [Testing Strategy](#testing-strategy)

---

## Overview

The migration involves converting 127+ API endpoints from an Express.js server to Next.js 13+ App Router API routes. This document outlines the systematic approach to ensure code quality, maintainability, and feature parity.

### Key Statistics
- **Total Endpoints:** 127+
- **Authentication-Required:** ~50% (64 endpoints)
- **Admin-Only:** ~35 endpoints
- **Public (No Auth):** ~15 endpoints
- **Employer-Scoped:** ~15 endpoints
- **Jobseeker-Scoped:** ~8 endpoints

### Main Challenges
1. ✅ **Database Layer:** Completed - Drizzle ORM with comprehensive schema
2. ✅ **TypeScript Support:** Completed - Full type safety across codebase
3. ✅ **Authentication:** Partially done - NextAuth pattern established
4. ⏳ **API Route Migration:** In progress - systematic endpoint conversion
5. ⏳ **Middleware & Guards:** Needs implementation - auth, role-based access
6. ⏳ **File Uploads:** Needs implementation - multipart form data handling
7. ⏳ **Real-time Features:** Needs implementation - WebSocket/SSE for notifications

---

## Architecture

### High-Level Design Pattern

Each API route follows this structure:

```typescript
// app/api/[resource]/[action]/route.ts
import { validateAuth } from "@/lib/middleware";
import { validateSchema } from "@/lib/validation";
import { db } from "@/db";

export async function POST(req: Request) {
  try {
    // 1. Authenticate if required
    const user = await validateAuth(req, { required: true, roles: ["admin"] });

    // 2. Parse and validate request body
    const body = await req.json();
    const validated = requestSchema.parse(body);

    // 3. Execute business logic
    const result = await db.query.table.findFirst({...});

    // 4. Return response
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleError(error);
  }
}
```

### Key Principles
1. **Single Responsibility:** Each route handler does one thing
2. **Validation First:** All inputs validated with Zod schemas
3. **Middleware-Driven:** Consistent authentication & authorization
4. **Error Handling:** Standardized error responses
5. **Database Consistency:** Use transactions for multi-step operations
6. **Type Safety:** Full TypeScript inference from schema to response

---

## Directory Structure

### Proposed API Routes Organization

```
app/api/
├── auth/
│   ├── signup/
│   │   ├── jobseeker/route.ts          # POST - register jobseeker
│   │   ├── employer/route.ts           # POST - register employer
│   │   └── admin/route.ts              # POST - create admin
│   ├── login/route.ts                  # POST - universal login
│   ├── logout/route.ts                 # POST - invalidate session
│   ├── me/route.ts                     # GET - current user info
│   ├── google/
│   │   ├── route.ts                    # GET - initiate OAuth
│   │   └── callback/route.ts           # GET - OAuth callback
│   ├── password/
│   │   ├── change/route.ts             # POST - change password
│   │   ├── reset/route.ts              # POST - initiate reset
│   │   └── verify/route.ts             # POST - verify reset token
│   └── email/
│       └── verify/route.ts             # POST - verify email
│
├── jobs/
│   ├── route.ts                        # GET - list jobs, POST - create (admin)
│   ├── [jobId]/
│   │   ├── route.ts                    # GET - details, PUT/DELETE (admin)
│   │   ├── apply/route.ts              # POST - apply (jobseeker)
│   │   ├── archive/route.ts            # PATCH - archive/unarchive
│   │   ├── match/route.ts              # GET - AI matching
│   │   ├── shortlist/route.ts          # POST - shortlist applicants
│   │   └── applicant/
│   │       └── [applicantId]/
│   │           └── ai-insights/route.ts # GET - AI insights
│   └── archived/route.ts               # GET - archived jobs
│
├── job-vacancies/route.ts              # GET - vacancies with filters
│
├── applications/
│   ├── route.ts                        # GET - list (admin)
│   ├── [id]/
│   │   ├── route.ts                    # PUT/DELETE (admin/employer)
│   │   └── status/route.ts             # PATCH - update + feedback
│   └── bulk-delete/route.ts            # POST - delete multiple
│
├── employer/
│   ├── profile/
│   │   ├── route.ts                    # GET/PUT - profile management
│   │   └── image/route.ts              # POST - upload profile image
│   ├── jobs/
│   │   ├── route.ts                    # GET/POST - manage jobs
│   │   └── [jobId]/
│   │       ├── route.ts                # PUT/DELETE
│   │       └── archive/route.ts        # PATCH - archive toggle
│   ├── applications/
│   │   ├── route.ts                    # GET - list applications
│   │   └── [id]/route.ts               # PUT/DELETE - manage application
│   └── dashboard/route.ts              # GET - dashboard stats
│
├── employers/
│   ├── route.ts                        # GET - list, POST/DELETE (admin)
│   ├── [id]/
│   │   ├── route.ts                    # GET/PUT/DELETE (admin)
│   │   ├── approve/route.ts            # PATCH - approve employer
│   │   ├── reject/route.ts             # PATCH - reject
│   │   ├── archive/route.ts            # PATCH - archive/unarchive
│   │   └── requirements/
│   │       └── submit-all/route.ts     # PATCH - mark requirements
│   ├── archived/route.ts               # GET - archived employers
│   ├── check-duplicate/route.ts        # POST - check duplicate
│   ├── public/
│   │   └── [id]/route.ts               # GET - public employer profile
│   └── bulk-delete/route.ts            # POST - delete multiple
│
├── applicants/
│   ├── route.ts                        # GET - list, POST/DELETE (admin)
│   ├── [id]/
│   │   ├── route.ts                    # GET/PUT/DELETE
│   │   └── suspend/route.ts            # PUT - suspend user
│   └── bulk-delete/route.ts            # POST - delete multiple
│
├── jobseeker/
│   ├── dashboard/route.ts              # GET - dashboard stats
│   ├── applications/route.ts           # GET - my applications
│   ├── profile-image/route.ts          # POST - upload image
│   └── change-password/route.ts        # POST - change password
│
├── admin/
│   ├── stats/route.ts                  # GET - quick stats
│   ├── dashboard/route.ts              # GET - full dashboard
│   ├── users/
│   │   ├── route.ts                    # GET - list users, PUT - update
│   │   ├── [id]/
│   │   │   ├── route.ts                # DELETE - delete user
│   │   │   └── suspend/route.ts        # PUT - suspend user
│   │   └── bulk-actions/route.ts       # POST - bulk operations
│   ├── activities/
│   │   ├── route.ts                    # GET - audit logs
│   │   ├── resource/
│   │   │   └── [resourceType]/[resourceId]/route.ts
│   │   └── user/
│   │       └── [userId]/route.ts
│   ├── jobs/
│   │   ├── route.ts                    # GET/POST - jobs management
│   │   └── [id]/
│   │       ├── route.ts                # GET/PUT/DELETE
│   │       └── status/route.ts         # PATCH - job status
│   ├── applications/route.ts           # GET - all applications
│   ├── systems-alerts/route.ts         # GET - validation alerts
│   ├── export/
│   │   ├── applicants/route.ts         # GET - CSV/JSON export
│   │   ├── employers/route.ts
│   │   ├── jobs/route.ts
│   │   ├── applications/route.ts
│   │   └── referrals/route.ts
│   ├── stakeholders/route.ts           # GET - all users paginated
│   ├── access-requests/
│   │   ├── route.ts                    # GET/POST - list & submit
│   │   └── [id]/
│   │       ├── approve/route.ts        # POST - approve request
│   │       └── reject/route.ts         # POST - reject request
│   ├── create-admin-user/route.ts      # POST - create/update admin
│   └── employers/route.ts              # GET - paginated employers
│
├── referrals/
│   ├── route.ts                        # GET/POST - list & create
│   └── [id]/
│       ├── status/route.ts             # PATCH - update status
│       └── delete/route.ts             # DELETE - delete referral
│
├── messages/
│   ├── route.ts                        # GET/POST - messages
│   ├── [id]/
│   │   └── read/route.ts               # PATCH - mark read
│   ├── conversation/
│   │   └── [userId]/route.ts           # GET/DELETE - conversation
│   └── unread/
│       └── count/route.ts              # GET - unread count
│
├── notifications/
│   ├── route.ts                        # GET/POST - notifications
│   ├── [id]/
│   │   ├── read/route.ts               # PATCH - mark read
│   │   └── delete/route.ts             # DELETE
│   └── stream/route.ts                 # GET - SSE stream
│
├── skills/
│   └── suggestions/
│       └── route.ts                    # GET/POST - skill suggestions
│
├── settings/
│   ├── general/
│   │   ├── route.ts                    # GET/PUT - general settings
│   │   └── public/route.ts             # GET - public settings
│   └── auth/
│       ├── route.ts                    # GET/PUT - auth settings
│       └── public/route.ts             # GET - public auth settings
│
├── upload/
│   ├── employer-docs/route.ts          # POST - upload employer docs
│   └── profile-image/route.ts          # POST - upload profile image
│
├── account/
│   ├── delete/route.ts                 # DELETE - account deletion
│   └── delete-requests/
│       ├── route.ts                    # GET - deletion requests (admin)
│       └── [id]/
│           ├── approve/route.ts        # POST - approve deletion
│           └── cancel/route.ts         # POST - cancel deletion
│
├── charts/
│   ├── bar/route.ts                    # GET - bar chart data
│   ├── doughnut/route.ts               # GET - doughnut chart data
│   ├── line/route.ts                   # GET - line chart data
│   └── employment-status/route.ts      # GET - employment status
│
├── reports/
│   └── skills/route.ts                 # GET - skills report
│
├── dashboard/
│   ├── summary/route.ts                # GET - summary stats
│   └── activities/route.ts             # GET - recent activities
│
├── diagram/
│   └── png/route.ts                    # POST - SVG to PNG conversion
│
├── public/
│   └── impact/route.ts                 # GET - public impact metrics
│
└── health/route.ts                     # GET - health check
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
**Focus:** Set up infrastructure for API routes

1. **Create middleware layer** (`lib/middleware/`)
   - ✅ Auth validation function
   - ✅ Role-based guards (admin, employer, jobseeker)
   - Error handling wrapper
   - Request/response logging

2. **Create validation schemas** (`lib/validation/`)
   - Request body schemas (Zod)
   - Query parameter schemas
   - Auth schemas

3. **Create database layer** (`lib/db/`)
   - ✅ Basic query functions (read)
   - Create, Update, Delete operations
   - Batch operations
   - Transaction support

4. **Create utilities** (`lib/api/`)
   - Response formatter
   - Error handler
   - Pagination helper
   - Export formatter (CSV/JSON)

### Phase 2: Authentication (Week 1-2)
**Focus:** Complete auth flow

Priority endpoints:
1. `POST /api/auth/signup/jobseeker` - Register jobseeker
2. `POST /api/auth/signup/employer` - Register employer
3. `POST /api/auth/login` - Universal login
4. `POST /api/auth/logout` - Logout
5. `GET /api/auth/me` - Current user
6. `GET /auth/google` - OAuth initiate
7. `GET /auth/google/callback` - OAuth callback
8. `POST /api/auth/password/change` - Change password
9. `POST /api/auth/password/reset` - Reset password flow
10. `POST /api/auth/email/verify` - Email verification

### Phase 3: Core Resources (Week 2-3)
**Focus:** Jobs, applications, and main entities

Priority endpoints:
1. **Jobs** (6 endpoints)
   - `GET/POST /api/jobs` - List & create
   - `GET /api/jobs/:jobId` - Details
   - `PUT/DELETE /api/jobs/:jobId` - Update & delete
   - `PATCH /api/jobs/:jobId/archive` - Archive toggle
   - `GET /api/jobs/archived` - Archived list

2. **Applications** (4 endpoints)
   - `GET /api/jobs/:jobId/apply` - Apply (POST)
   - `GET /api/applications` - List
   - `PUT/DELETE /api/applications/:id` - Manage

3. **Employers** (8 endpoints)
   - `GET/POST/DELETE /api/employers` - CRUD
   - `GET /api/employers/:id` - Details
   - `PATCH /api/employers/:id/approve` - Approve
   - `PATCH /api/employers/:id/reject` - Reject
   - `PATCH /api/employers/:id/archive` - Archive

4. **Applicants** (6 endpoints)
   - `GET /api/applicants` - List
   - `GET/PUT/DELETE /api/applicants/:id` - CRUD

### Phase 4: Secondary Features (Week 3-4)
**Focus:** Messaging, notifications, referrals

1. **Messaging** (6 endpoints)
   - `GET/POST /api/messages` - List & send
   - `GET /api/messages/conversation/:userId` - Conversation
   - `PATCH /api/messages/:id/read` - Mark read

2. **Notifications** (5 endpoints)
   - `GET/POST /api/notifications` - CRUD
   - `GET /api/notifications/stream` - SSE stream
   - `PATCH /api/notifications/:id/read` - Mark read

3. **Referrals** (4 endpoints)
   - `GET/POST /api/referrals` - List & create
   - `PATCH /api/referrals/:id/status` - Update status
   - `DELETE /api/referrals/:id` - Delete

### Phase 5: Admin & Utilities (Week 4-5)
**Focus:** Admin dashboard, analytics, exports

1. **Admin Dashboard** (8 endpoints)
   - `GET /api/admin/stats` - Quick stats
   - `GET /api/admin/dashboard` - Full dashboard
   - `GET /api/admin/activities` - Activity logs
   - `GET /api/admin/systems-alerts` - Alerts

2. **Admin Management** (10 endpoints)
   - `GET /api/admin/users` - List users
   - `PUT/DELETE /api/admin/users/:id` - Manage users
   - `GET /api/admin/stakeholders` - Paginated users
   - `POST /api/admin/create-admin-user` - Create admin

3. **Data Export** (5 endpoints)
   - `GET /api/admin/export/applicants` - CSV/JSON
   - `GET /api/admin/export/employers` - CSV/JSON
   - `GET /api/admin/export/jobs` - CSV/JSON
   - `GET /api/admin/export/applications` - CSV/JSON
   - `GET /api/admin/export/referrals` - CSV/JSON

4. **Reports & Analytics** (5 endpoints)
   - `GET /api/charts/bar` - Bar chart
   - `GET /api/charts/doughnut` - Doughnut chart
   - `GET /api/charts/line` - Line chart
   - `GET /api/charts/employment-status` - Employment status
   - `GET /api/reports/skills` - Skills report

### Phase 6: Polish & Testing (Week 5-6)
**Focus:** Edge cases, testing, documentation

1. Complete remaining endpoints
2. Error handling & edge cases
3. API documentation (OpenAPI/Swagger)
4. E2E testing
5. Performance optimization
6. Security audit

---

## Priority Breakdown

### Tier 1: Critical (Must Have) - 25 endpoints
These are essential for basic app functionality:
- Authentication flows (10 endpoints)
- Job management (6 endpoints)
- Applications (4 endpoints)
- Employer profile (3 endpoints)
- Jobseeker profile (2 endpoints)

### Tier 2: Important (Should Have) - 50 endpoints
These add significant functionality:
- Employer management (8 endpoints)
- Applicant management (6 endpoints)
- Messaging (6 endpoints)
- Notifications (4 endpoints)
- Referrals (4 endpoints)
- Admin dashboard (8 endpoints)
- Settings (4 endpoints)
- Job-related features (9 endpoints)

### Tier 3: Nice-to-Have (Could Have) - 52 endpoints
These enhance user experience:
- Analytics & charts (5 endpoints)
- Data export (5 endpoints)
- Advanced admin features (15 endpoints)
- Access requests (4 endpoints)
- Account deletion (2 endpoints)
- Skills suggestions (2 endpoints)
- Utility endpoints (5 endpoints)
- File upload handlers (3 endpoints)
- Diagram conversion (1 endpoint)
- Public endpoints (10 endpoints)

---

## Implementation Checklist

Detailed checklist per endpoint category:

### Authentication
- [ ] POST /api/auth/signup/jobseeker
- [ ] POST /api/auth/signup/employer
- [ ] POST /api/auth/signup/admin
- [ ] POST /api/auth/login
- [ ] GET /api/auth/me
- [ ] POST /api/auth/logout
- [ ] GET /auth/google
- [ ] GET /auth/google/callback
- [ ] POST /api/auth/password/change
- [ ] POST /api/auth/password/reset
- [ ] POST /api/auth/email/verify

### Jobs
- [ ] GET /api/jobs
- [ ] POST /api/jobs (admin)
- [ ] GET /api/jobs/:jobId
- [ ] PUT /api/jobs/:jobId (admin)
- [ ] DELETE /api/jobs/:jobId (admin)
- [ ] PATCH /api/jobs/:jobId/archive
- [ ] GET /api/jobs/archived
- [ ] POST /api/jobs/:jobId/apply
- [ ] GET /api/jobs/:jobId/match
- [ ] POST /api/jobs/:jobId/shortlist
- [ ] GET /api/job-vacancies

### Applications
- [ ] GET /api/applications
- [ ] PUT /api/applications/:id
- [ ] DELETE /api/applications/:id
- [ ] GET /api/employer/applications

### Employers
- [ ] GET /api/employers
- [ ] POST /api/employers (admin)
- [ ] GET /api/employers/:id (admin)
- [ ] PUT /api/employers/:id (admin)
- [ ] DELETE /api/employers/:id (admin)
- [ ] PATCH /api/employers/:id/approve
- [ ] PATCH /api/employers/:id/reject
- [ ] PATCH /api/employers/:id/archive
- [ ] GET /api/employers/archived
- [ ] POST /api/employers/bulk-delete
- [ ] GET /api/employer/profile
- [ ] PUT /api/employer/profile
- [ ] POST /api/employer/jobs
- [ ] GET /api/employer/jobs

### Applicants
- [ ] GET /api/applicants
- [ ] POST /api/applicants (admin)
- [ ] GET /api/applicants/:id
- [ ] PUT /api/applicants/:id
- [ ] DELETE /api/applicants/:id
- [ ] POST /api/applicants/bulk-delete
- [ ] GET /api/admin/applicants

### Messaging
- [ ] GET /api/messages
- [ ] POST /api/messages
- [ ] GET /api/messages/conversation/:userId
- [ ] DELETE /api/messages/conversation/:userId
- [ ] PATCH /api/messages/:id/read
- [ ] GET /api/messages/unread/count

### Notifications
- [ ] GET /api/notifications
- [ ] POST /api/notifications (admin)
- [ ] PATCH /api/notifications/:id/read
- [ ] DELETE /api/notifications/:id
- [ ] GET /api/notifications/stream (SSE)

### Referrals
- [ ] GET /api/referrals
- [ ] POST /api/referrals
- [ ] PATCH /api/referrals/:id/status
- [ ] DELETE /api/referrals/:id

### Admin
- [ ] GET /api/admin/stats
- [ ] GET /api/admin/dashboard
- [ ] GET /api/admin/users
- [ ] PUT /api/admin/users/:id
- [ ] DELETE /api/admin/users/:id
- [ ] GET /api/admin/activities
- [ ] GET /api/admin/systems-alerts
- [ ] GET /api/admin/jobs
- [ ] GET /api/admin/applications
- [ ] GET /api/admin/stakeholders
- [ ] POST /api/admin/create-admin-user
- [ ] POST /api/admin/access-requests
- [ ] POST /api/admin/access-requests/:id/approve
- [ ] POST /api/admin/access-requests/:id/reject

### Data Export
- [ ] GET /api/admin/export/applicants
- [ ] GET /api/admin/export/employers
- [ ] GET /api/admin/export/jobs
- [ ] GET /api/admin/export/applications
- [ ] GET /api/admin/export/referrals

### Reports
- [ ] GET /api/charts/bar
- [ ] GET /api/charts/doughnut
- [ ] GET /api/charts/line
- [ ] GET /api/charts/employment-status
- [ ] GET /api/reports/skills

### Settings
- [ ] GET /api/settings/general/public
- [ ] GET /api/settings/general (admin)
- [ ] PUT /api/settings/general (admin)
- [ ] GET /api/settings/auth/public
- [ ] GET /api/settings/auth (admin)
- [ ] PUT /api/settings/auth (admin)

### Utilities
- [ ] POST /api/diagram/png
- [ ] GET /api/skills/suggestions
- [ ] POST /api/skills/suggestions
- [ ] GET /api/health
- [ ] GET /api/public/impact
- [ ] POST /api/upload/employer-docs
- [ ] POST /api/account/delete
- [ ] GET /api/summary
- [ ] GET /api/recent-activities

---

## Testing Strategy

### Unit Tests
- **Purpose:** Test individual API route handlers in isolation
- **Tools:** Jest, Testing Library
- **Coverage:** 
  - Input validation
  - Authentication/authorization logic
  - Database query mocking
  - Error scenarios

### Integration Tests  
- **Purpose:** Test full request-response cycle with real database
- **Tools:** Jest + supertest, test database
- **Coverage:**
  - End-to-end endpoint flows
  - Database transactions
  - Multi-step workflows (e.g., signup → login → apply)

### E2E Tests
- **Purpose:** Test complete user journeys
- **Tools:** Playwright or Cypress
- **Coverage:**
  - User workflows (jobseeker applies, employer reviews)
  - Admin workflows (approve jobs, generate reports)
  - Cross-resource interactions

### Performance Tests
- **Purpose:** Ensure API performance under load
- **Tools:** k6, Artillery
- **Coverage:**
  - Pagination with large datasets
  - Concurrent requests
  - Database query optimization

---

## Notes & Considerations

### Database Transactions
Ensure multi-step operations use transactions:
```typescript
await db.transaction(async (tx) => {
  // Multiple db operations within transaction
});
```

### Pagination
Implement consistent pagination:
- Query params: `?page=1&limit=20`
- Response format: `{ data: [], total: 100, page: 1, pages: 5 }`

### File Uploads
Use NextStorage or similar for:
- Profile images
- Employer documents
- Resume uploads
- File cleanup on deletion

### Real-time Updates
Plan for WebSocket/SSE:
- Notifications
- Messaging
- Activity updates
- Live job counts

### API Documentation
Maintain using:
- OpenAPI/Swagger spec
- Postman collection
- TypeScript types as source of truth

### Security
- Rate limiting on auth endpoints
- CSRF protection
- SQL injection prevention (via Drizzle ORM)
- XSS protection
- File upload validation
- Session management

---

## Success Criteria

✅ **All Metrics**
- [ ] 100% endpoint coverage (127+ endpoints)
- [ ] Authentication fully functional
- [ ] Database operations optimized
- [ ] Error handling comprehensive
- [ ] API documentation complete
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Team trained on new structure

---

**Next Step:** Begin Phase 1 - Foundation setup (middleware, validation, utilities)
