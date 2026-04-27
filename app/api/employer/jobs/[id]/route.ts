export const dynamic = "force-dynamic";
import { updateJobPostingSchema, type UpdateJobPosting } from "@/lib/validation-schemas";
import {
  createGetHandler,
  createPutHandler,
  createDeleteHandler,
  type ApiHandlerContext,
} from "@/lib/api-handler";
import {
  safeDatabaseOperation,
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { getEmployerJobById, deleteEmployerJob } from "@/lib/db-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";
import { z } from "zod";

type UpdateJobPostingBody = UpdateJobPosting;


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createGetHandler(
    async (ctx: ApiHandlerContext) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const job = await getEmployerJobById(ctx.user.id, id);
      if (!job) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      return successResponse({ job }, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 50,
    }
  );

  return handler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createPutHandler<UpdateJobPostingBody>(
    async (ctx: ApiHandlerContext, body?: UpdateJobPostingBody) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const employerId = ctx.user.id;

      const jobResult = await getEmployerJobById(employerId, id);
      if (!jobResult) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
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

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.positionTitle !== undefined) updates.position_title = payload.positionTitle.trim();
      if (payload.description !== undefined) updates.description = payload.description.trim();
      if (payload.employmentType !== undefined) updates.work_setup = payload.employmentType;
      if (payload.minimumEducationRequired !== undefined) updates.minimum_education_required = payload.minimumEducationRequired;
      if (payload.mainSkillDesired !== undefined) updates.main_skill_desired = payload.mainSkillDesired;
      if (payload.yearsOfExperienceRequired !== undefined) updates.years_of_experience_required = payload.yearsOfExperienceRequired;
      if (payload.vacancies !== undefined) updates.vacancies = payload.vacancies;
      if (payload.jobStatus !== undefined) updates.job_status = payload.jobStatus;

      const updated = await supabaseAdmin
        .from("jobs")
        .update(updates)
        .eq("id", id)
        .eq("employer_id", employerId)
        .select("*")
        .single();

      if (updated.error || !updated.data) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update job"),
          ctx.requestId
        );
      }

      return successResponse(
        { message: "Job updated successfully", job: updated.data },
        ctx.requestId
      );
    },
    {
      bodySchema: updateJobPostingSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 20,
    }
  );

  return handler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createDeleteHandler(
    async (ctx: ApiHandlerContext) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const jobResult = await deleteEmployerJob(ctx.user.id, id);
      if (!jobResult) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Job not found"),
          ctx.requestId
        );
      }

      return successResponse({ message: "Job deleted successfully" }, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 20,
    }
  );

  return handler(request);
}