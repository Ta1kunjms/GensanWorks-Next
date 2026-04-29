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
import { tryCreateNotification } from "@/lib/notifications";
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
      if (payload.location !== undefined) updates.location = payload.location.trim();
      if (payload.minimumEducationRequired !== undefined) updates.minimum_education_required = payload.minimumEducationRequired;
      if (payload.mainSkillDesired !== undefined) updates.main_skill_desired = payload.mainSkillDesired;
      if (payload.yearsOfExperienceRequired !== undefined) updates.years_of_experience_required = payload.yearsOfExperienceRequired;
      if (payload.vacancies !== undefined) updates.vacancies = payload.vacancies;
      if (payload.workType !== undefined) updates.work_type = payload.workType;
      
      if (payload.salaryMin !== undefined) updates.salary_min = payload.salaryMin;
      if (payload.salaryMax !== undefined) updates.salary_max = payload.salaryMax;
      if (payload.salaryPeriod !== undefined) updates.salary_period = payload.salaryPeriod;
      
      if (payload.salaryMin !== undefined || payload.salaryMax !== undefined) {
        updates.starting_salary = payload.salaryMin && payload.salaryMax 
          ? `PHP ${payload.salaryMin.toLocaleString()} - ${payload.salaryMax.toLocaleString()}` 
          : payload.salaryMin 
            ? `PHP ${payload.salaryMin.toLocaleString()}` 
            : null;
      }

      if (payload.industryCode !== undefined) updates.industry_code = payload.industryCode;
      if (payload.employmentContractType !== undefined) updates.employment_contract_type = payload.employmentContractType;
      
      // Every edit moves it back to pending for review
      updates.job_status = "pending";

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

      // Notify Admins
      try {
        const { data: admins } = await supabaseAdmin.from("admins").select("id");
        if (admins) {
          const { data: employer } = await supabaseAdmin.from("employers").select("establishment_name").eq("id", employerId).single();
          const employerName = employer?.establishment_name || "An employer";
          
          await Promise.all(
            admins.map((admin) =>
              tryCreateNotification({
                userId: admin.id,
                role: "admin",
                type: "job",
                title: "Job Posting Updated",
                message: `${employerName} has updated the job: "${updated.data.position_title}". Please re-review it.`,
                relatedId: id,
                relatedType: "job",
              })
            )
          );
        }
      } catch (e) {
        console.warn("Failed to notify admins:", e);
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