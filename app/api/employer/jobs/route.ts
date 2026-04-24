import { createJobPostingSchema, employerJobsListQuerySchema } from "@/lib/validation-schemas";
import { createGetHandler, createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { listEmployerJobs } from "@/lib/db-helpers";
import { supabaseAdmin } from "@/lib/supabase";
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

    const jobs = await listEmployerJobs(ctx.user.id, {
      status: filters.status,
      search: filters.search,
      limit: limit + 1,
      offset,
    });

    if (!jobs) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch jobs"),
        ctx.requestId
      );
    }

    const jobsList = jobs.length > limit ? jobs.slice(0, limit) : jobs;

    return successResponse(
      {
        jobs: jobsList,
        pagination: { limit, offset, hasMore: jobs.length > limit },
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

    const result = await safeDatabaseOperation(
      async () => {
        const inserted = await supabaseAdmin
          .from("jobs")
          .insert({
            employer_id: ctx.user!.id,
            position_title: payload.positionTitle.trim(),
            description: payload.description.trim(),
            minimum_education_required: payload.minimumEducationRequired,
            main_skill_desired: payload.mainSkillDesired,
            years_of_experience_required: payload.yearsOfExperienceRequired,
            age_preference_min: payload.agePreferenceMin,
            age_preference_max: payload.agePreferenceMax,
            starting_salary: payload.startingSalary,
            vacancies: payload.vacancies,
            
            location: payload.location?.trim() || null,
            employment_type: payload.employmentType || null,
            status: "pending",
            is_published: false,
            archived: false,
          })
          .select("id, position_title, status, created_at")
          .single();

        if (inserted.error || !inserted.data) {
          throw inserted.error ?? new Error("insert_failed");
        }
        return inserted.data;
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
      { message: "Job created and submitted for review (SRS Form 2A)", job: result.data },
      ctx.requestId
    );
  },
  {
    bodySchema: createJobPostingSchema,
    requireAuth: true,
    rateLimitMaxRequests: 20,
  }
);