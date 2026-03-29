import { createJobPostingSchema, employerJobsListQuerySchema } from "@/lib/validation-schemas";
import { createGetHandler, createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { listEmployerJobs } from "@/lib/db-helpers";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";
import { z } from "zod";

type EmployerJobsListQuery = z.infer<typeof employerJobsListQuerySchema>;
type CreateJobPostingBody = z.infer<typeof createJobPostingSchema>;

export const GET = createGetHandler<EmployerJobsListQuery>(
  async (ctx: ApiHandlerContext, query?: EmployerJobsListQuery) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    const filters: Partial<EmployerJobsListQuery> = query ?? {};
    const limit = filters.limit ?? 10;
    const offset = filters.offset ?? 0;

    // Get jobs for employer
    const result = await listEmployerJobs(ctx.user.id, {
      status: filters.status,
      search: filters.search,
      limit: limit + 1,
      offset,
    });

    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch jobs"),
        ctx.requestId
      );
    }

    const jobs = result.data || [];
    const hasMore = jobs.length > limit;
    const jobsList = hasMore ? jobs.slice(0, limit) : jobs;

    return successResponse(
      {
        jobs: jobsList,
        pagination: {
          limit,
          offset,
          hasMore,
        },
      },
      ctx.requestId
    );
  },
  {
    requireAuth: true,
    querySchema: employerJobsListQuerySchema,
    rateLimitMaxRequests: 50,
  }
);

export const POST = createPostHandler<CreateJobPostingBody>(
  async (ctx: ApiHandlerContext, body?: CreateJobPostingBody) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    const payload = body;
    if (!payload) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Invalid request body"),
        ctx.requestId
      );
    }

    // Create job posting
    const result = await safeDatabaseOperation(
      async () => {
        const [created] = await db
          .insert(jobsTable)
          .values({
            employerId: ctx.user!.id,
            positionTitle: payload.positionTitle.trim(),
            description: payload.description.trim(),
            location: payload.location.trim(),
            employmentType: payload.employmentType,
            salaryMin: payload.salaryMin ? String(payload.salaryMin) : null,
            salaryMax: payload.salaryMax ? String(payload.salaryMax) : null,
            salaryPeriod: payload.salaryPeriod || null,
            status: "pending",
            isPublished: false,
            archived: false,
          })
          .returning({
            id: jobsTable.id,
            positionTitle: jobsTable.positionTitle,
            status: jobsTable.status,
            createdAt: jobsTable.createdAt,
          });
        return created;
      },
      "createEmployerJob"
    );

    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to create job"),
        ctx.requestId
      );
    }

    return successResponse(
      {
        message: "Job created and submitted for review",
        job: result.data,
      },
      ctx.requestId
    );
  },
  {
    bodySchema: createJobPostingSchema,
    requireAuth: true,
    rateLimitMaxRequests: 20,
  }
);
