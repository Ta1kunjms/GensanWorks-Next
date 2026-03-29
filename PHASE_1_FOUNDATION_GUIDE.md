/**
 * Phase 1 Foundation - Implementation Guide
 *
 * This guide explains how to use the new Phase 1 foundation infrastructure
 * to implement consistent, scalable API endpoints.
 */

// ============================================================================
// QUICK START: Creating a New API Endpoint
// ============================================================================

/**
 * Example 1: Simple GET endpoint with query validation
 *
 * File: app/api/jobs/route.ts
 */

import { createGetHandler, ApiHandlerContext } from "@/lib/api-handler";
import { jobsQuerySchema } from "@/lib/validation-schemas";
import { listPublishedJobs } from "@/lib/db-helpers";
import { paginatedResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { NextResponse } from "next/server";

/**
 * SIMPLE PATTERN:
 * - Get published jobs with search and filters
 * - Public endpoint (no auth required)
 * - Uses querySchema for automatic validation
 * - Returns paginated response
 */
export const GET = createGetHandler(
  async (ctx, query) => {
    const result = await listPublishedJobs({
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      location: query.location,
      city: query.city,
      employmentType: query.employmentType,
      salaryMin: query.salaryMin,
      salaryMax: query.salaryMax,
      sortBy: query.sortBy,
    });

    if (!result.success) {
      return errorResponse(result.error, ctx.requestId);
    }

    return paginatedResponse(
      result.data.jobs,
      result.data.total,
      result.data.limit,
      result.data.offset,
      ctx.requestId
    );
  },
  {
    querySchema: jobsQuerySchema,
    // Public endpoint - no auth required
  }
);

// ============================================================================
// Example 2: Protected POST endpoint with body validation
// ============================================================================

/**
 * ADMIN PATTERN:
 * - Create new job posting
 * - Requires authentication
 * - Only employers allowed
 * - Validates request body
 * - Returns created resource
 */

import { createPostHandler } from "@/lib/api-handler";
import { createJobPostingSchema, type CreateJobPosting } from "@/lib/validation-schemas";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";
import { successResponse } from "@/lib/api-errors";

export const POST = createPostHandler(
  async (ctx, body: CreateJobPosting) => {
    // At this point, authentication is verified (if requireAuth: true)
    // and body is already validated against createJobPostingSchema

    const result = await safeDatabaseOperation(
      async () => {
        const [newJob] = await db
          .insert(jobsTable)
          .values({
            ...body,
            employerId: ctx.user!.id, // Use authenticated user's ID
            isPublished: false, // Default to draft
            createdAt: new Date(),
          })
          .returning();
        return newJob;
      },
      "createJobPosting"
    );

    if (!result.success) {
      return errorResponse(result.error, ctx.requestId);
    }

    return successResponse(result.data, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["employer"],
    bodySchema: createJobPostingSchema,
    rateLimitMaxRequests: 30, // Lower rate limit for write operations
  }
);

// ============================================================================
// INFRASTRUCTURE FILE REFERENCE
// ============================================================================

/**
 * 1. VALIDATION SCHEMAS (app/lib/validation-schemas.ts)
 *
 * Use these to validate request query params and bodies:
 *
 * - paginationQuerySchema: Standard pagination (limit, offset)
 * - loginRequestSchema: Email/password login
 * - signupJobseekerRequestSchema: New user registration
 * - jobsQuerySchema: Job search/filter params
 * - createJobPostingSchema: Job posting creation
 * - jobApplicationSchema: Job application submission
 * - And 15+ more...
 *
 * Usage:
 * - Import the schema
 * - Pass to createGetHandler(), createPostHandler(), etc. via options.querySchema or bodySchema
 * - Validated data automatically available in handler via query/body parameter
 */

// ============================================================================
/**
 * 2. ERROR HANDLING (app/lib/api-errors.ts)
 *
 * Provides standardized error responses and error codes:
 *
 * Error Codes:
 * - BAD_REQUEST (400): Invalid request format
 * - UNAUTHORIZED (401): Missing/invalid auth
 * - FORBIDDEN (403): Auth ok, but not allowed
 * - NOT_FOUND (404): Resource doesn't exist
 * - CONFLICT (409): Duplicate/constraint violation
 * - VALIDATION_ERROR (400): Zod validation failed
 * - RATE_LIMITED (429): Too many requests
 * - DATABASE_ERROR (500): DB operation failed
 * - INTERNAL_ERROR (500): Unexpected server error
 *
 * Response Functions:
 * - successResponse(data) → { success: true, data, requestId }
 * - paginatedResponse(data, total, limit, offset) → { success: true, data, pagination }
 * - errorResponse(error) → { error: message, code, statusCode }
 * - validationErrorResponse(zodError) → Validation errors with field details
 *
 * Usage:
 * import { successResponse, errorResponse, ErrorCode, createApiError } from "@/lib/api-errors";
 *
 * if (!result.success) {
 *   return errorResponse(result.error, ctx.requestId);
 * }
 *
 * return successResponse(data, ctx.requestId);
 */

// ============================================================================
/**
 * 3. REQUEST HANDLER WRAPPER (app/lib/api-handler.ts)
 *
 * Provides createGetHandler(), createPostHandler(), etc. that handle:
 *
 * Authentication:
 * - requireAuth: boolean - Require logged-in user
 * - allowedRoles: UserRole[] - Restrict to specific roles (admin, employer, jobseeker)
 *
 * Automatic Features:
 * - Rate limiting with configurable limits
 * - Request ID generation and tracking
 * - Query parameter validation
 * - JSON body validation
 * - Error handling (400, 429, 500)
 * - Request/response logging
 *
 * Context Object (ctx: ApiHandlerContext):
 * - ctx.user: AuthenticatedUser | null - Current user info
 * - ctx.requestId: string - Unique request ID
 * - ctx.clientIp: string - Client IP address
 * - ctx.request: NextRequest - Raw request object
 *
 * Usage:
 * export const GET = createGetHandler(
 *   async (ctx, query) => {
 *     // Handler code here
 *   },
 *   { requireAuth: true, allowedRoles: ["employer"] }
 * );
 */

// ============================================================================
/**
 * 4. DATABASE HELPERS (app/lib/db-helpers.ts)
 *
 * Pre-built common database queries:
 *
 * User Queries:
 * - findUserById(userId)
 * - findUserByEmail(email)
 * - emailExists(email)
 * - findEmployerById(employerId)
 *
 * Job Queries:
 * - findPublishedJobById(jobId)
 * - listPublishedJobs(filters)
 * - findJobById(jobId)
 *
 * Application Queries:
 * - findApplicationById(applicationId)
 * - findUserApplications(userId, filters)
 * - findJobApplications(jobId, filters)
 * - hasUserApplied(userId, jobId)
 *
 * Statistics:
 * - getJobStatistics()
 * - getEmployerStatistics(employerId)
 *
 * Each function returns: { success: true, data } or { success: false, error }
 *
 * Usage:
 * const result = await findJobById(jobId);
 * if (!result.success) {
 *   return errorResponse(result.error, ctx.requestId);
 * }
 * const job = result.data;
 */

// ============================================================================
// ENDPOINT IMPLEMENTATION PATTERNS
// ============================================================================

/**
 * PATTERN 1: Public Read Endpoint
 * - No authentication required
 * - Uses pagination
 * - Includes search/filters
 *
 * Examples: GET /api/jobs, GET /api/jobs/[id]
 */

export const STEP_1_PUBLIC_READ = {
  code: `export const GET = createGetHandler(
    async (ctx, query) => {
      const result = await listPublishedJobs(query);
      if (!result.success) return errorResponse(result.error, ctx.requestId);
      return paginatedResponse(result.data.jobs, result.data.total, query.limit, query.offset, ctx.requestId);
    },
    { querySchema: jobsQuerySchema }
  );`,
};

/**
 * PATTERN 2: Protected Write Endpoint
 * - Requires authentication
 * - Specific role required
 * - Validates request body
 * - Lower rate limits for write operations
 *
 * Examples: POST /api/jobs, POST /api/applications
 */

export const STEP_2_PROTECTED_WRITE = {
  code: `export const POST = createPostHandler(
    async (ctx, body) => {
      const result = await safeDatabaseOperation(
        async () => {
          const [resource] = await db.insert(table).values(body).returning();
          return resource;
        },
        "createResource"
      );
      if (!result.success) return errorResponse(result.error, ctx.requestId);
      return successResponse(result.data, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["role"],
      bodySchema: schemaName,
      rateLimitMaxRequests: 30,
    }
  );`,
};

/**
 * PATTERN 3: Admin-Only Endpoint
 * - Requires authentication
 * - Only admin role
 * - May update/delete resources
 *
 * Examples: PATCH /api/admin/users, DELETE /api/admin/jobs
 */

export const STEP_3_ADMIN_ONLY = {
  code: `export const PATCH = createPatchHandler(
    async (ctx, body) => {
      // Admin-only logic
      // Update database
      // Return updated resource
    },
    {
      requireAuth: true,
      allowedRoles: ["admin"],
      bodySchema: updateSchema,
    }
  );`,
};

// ============================================================================
// IMPLEMENTING A COMPLETE ENDPOINT
// ============================================================================

/**
 * Complete Example: Job Application Endpoint
 *
 * File: app/api/jobs/[id]/apply/route.ts
 */

export const COMPLETE_EXAMPLE = `
import { createPostHandler } from "@/lib/api-handler";
import { jobApplicationSchema, type JobApplication } from "@/lib/validation-schemas";
import { successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { findJobById, hasUserApplied, safeDatabaseOperation } from "@/lib/db-helpers";
import { db } from "@/lib/db";
import { applicationsTable } from "@/db/schema";

export const POST = createPostHandler(
  async (ctx, body: JobApplication) => {
    // 1. Check authentication
    if (!ctx.user) {
      return errorResponse(createApiError(ErrorCode.UNAUTHORIZED, "Must be logged in to apply"), ctx.requestId);
    }

    // 2. Verify job exists
    const jobResult = await findJobById(ctx.params.id);
    if (!jobResult.success) {
      return errorResponse(jobResult.error, ctx.requestId);
    }
    if (!jobResult.data) {
      return errorResponse(createApiError(ErrorCode.NOT_FOUND, "Job not found"), ctx.requestId);
    }

    // 3. Check if already applied
    const alreadyApplied = await hasUserApplied(ctx.user.id, ctx.params.id);
    if (alreadyApplied) {
      return errorResponse(createApiError(ErrorCode.CONFLICT, "You already applied for this job"), ctx.requestId);
    }

    // 4. Create application
    const result = await safeDatabaseOperation(
      async () => {
        const [application] = await db.insert(applicationsTable).values({
          jobId: ctx.params.id,
          applicantId: ctx.user!.id,
          coverLetter: body.coverLetter,
          resume: body.resume,
          portfolio: body.portfolio,
          status: "applied",
          createdAt: new Date(),
        }).returning();
        return application;
      },
      \`applyForJob(\${ctx.params.id})\`
    );

    if (!result.success) {
      return errorResponse(result.error, ctx.requestId);
    }

    return successResponse({ application: result.data }, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["jobseeker"],
    bodySchema: jobApplicationSchema,
    rateLimitMaxRequests: 20, // Limited applications per user
  }
);
`;

// ============================================================================
// CHECKLIST: Implementing a New Endpoint
// ============================================================================

export const IMPLEMENTATION_CHECKLIST = `
✓ Step 1: Create Zod schema in app/lib/validation-schemas.ts (if new schema needed)
✓ Step 2: Add database helper in app/lib/db-helpers.ts (if new query needed)
✓ Step 3: Create route file: app/api/[path]/route.ts
✓ Step 4: Import createGetHandler/createPostHandler/etc.
✓ Step 5: Import validation schema
✓ Step 6: Implement handler function with:
  - Input validation (automatic if using schema)
  - Authentication check (automatic if requireAuth: true)
  - Database operation
  - Error handling (check result.success)
  - Response formatting (successResponse or errorResponse)
✓ Step 7: Configure handler options with requireAuth, allowedRoles, schemas
✓ Step 8: Run npm run type-check to verify
✓ Step 9: Test endpoint with curl or API client
✓ Step 10: Add response type definitions if complex
`;

// ============================================================================
// BUILT-IN FEATURES SUMMARY
// ============================================================================

export const BUILT_IN_FEATURES = `
AUTOMATICALLY HANDLED:
✓ Authentication (JWT token validation)
✓ Role-based access control
✓ Rate limiting (60 req/min default)
✓ Request ID generation and tracking
✓ Query parameter validation (Zod)
✓ JSON body validation (Zod)
✓ Standardized error responses
✓ HTTP status codes
✓ Request/response logging
✓ Pagination helpers
✓ Database error handling

YOU NEED TO IMPLEMENT:
- Route logic and business rules
- Database queries (helpers available)
- Custom validation if needed
- Error messages and details
- Response data formatting
`;

// Export for documentation purposes
export const FOUNDATION_DOCS = {
  STEP_1_PUBLIC_READ,
  STEP_2_PROTECTED_WRITE,
  STEP_3_ADMIN_ONLY,
  COMPLETE_EXAMPLE,
  IMPLEMENTATION_CHECKLIST,
  BUILT_IN_FEATURES,
};
