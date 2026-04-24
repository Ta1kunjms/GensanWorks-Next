import { updateJobPostingSchema } from "@/lib/validation-schemas";
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

type UpdateJobPostingBody = z.infer<typeof updateJobPostingSchema>;

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
      if (payload.location !== undefined) updates.location = payload.location.trim();
      if (payload.municipality !== undefined) updates.municipality = payload.municipality;
      if (payload.province !== undefined) updates.province = payload.province;
      if (payload.employmentType !== undefined) updates.employment_type = payload.employmentType;
      if (payload.salaryMin !== undefined) updates.salary_min = payload.salaryMin ? String(payload.salaryMin) : null;
      if (payload.salaryMax !== undefined) updates.salary_max = payload.salaryMax ? String(payload.salaryMax) : null;
      if (payload.salaryPeriod !== undefined) updates.salary_period = payload.salaryPeriod || null;
      if (payload.minimumEducationRequired !== undefined) updates.minimum_education_required = payload.minimumEducationRequired;
      if (payload.mainSkillOrSpecialization !== undefined) updates.main_skill_or_specialization = payload.mainSkillOrSpecialization;
      if (payload.yearsOfExperienceRequired !== undefined) updates.years_of_experience_required = payload.yearsOfExperienceRequired;
      if (payload.vacantPositions !== undefined) updates.vacant_positions = payload.vacantPositions;
      if (payload.paidEmployees !== undefined) updates.paid_employees = payload.paidEmployees;
      if (payload.industryCodes !== undefined) updates.industry_codes = payload.industryCodes;
      if (payload.jobStatus !== undefined) updates.job_status = payload.jobStatus;
      if (payload.preparedByName !== undefined) updates.prepared_by_name = payload.preparedByName;
      if (payload.preparedByDesignation !== undefined) updates.prepared_by_designation = payload.preparedByDesignation;
      if (payload.preparedByContact !== undefined) updates.prepared_by_contact = payload.preparedByContact;

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