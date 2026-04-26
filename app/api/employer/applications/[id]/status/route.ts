export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { createPatchHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerApplicationStatusUpdateSchema } from "@/lib/validation-schemas";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { z } from "zod";

type EmployerApplicationStatusUpdateBody = z.infer<typeof employerApplicationStatusUpdateSchema>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createPatchHandler<EmployerApplicationStatusUpdateBody>(
    async (ctx: ApiHandlerContext, body?: EmployerApplicationStatusUpdateBody) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const employerId = ctx.user.id;
      const payload = body;

      if (!payload) {
        return errorResponse(
          createApiError(ErrorCode.BAD_REQUEST, "Invalid request body"),
          ctx.requestId
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("applications")
        .select("applicant_id, job_id")
        .eq("id", id)
        .eq("employer_id", employerId)
        .single();

      if (!existing) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Application not found"),
          ctx.requestId
        );
      }

      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from("applications")
        .update({
          status: payload.status,
          feedback: payload.feedback?.trim() || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("employer_id", employerId)
        .select("id, status, applicant_id")
        .single();

      if (updateError || !updateResult) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update application"),
          ctx.requestId
        );
      }

      await tryCreateNotification({
        userId: existing.applicant_id,
        role: "jobseeker",
        type: "application",
        title: "Application Status Updated",
        message: `Your application status has been updated to: ${payload.status}`,
        relatedId: id,
        relatedType: "application",
      });

      return successResponse(
        { status: payload.status, applicationId: id },
        ctx.requestId
      );
    },
    {
      bodySchema: employerApplicationStatusUpdateSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 40,
    }
  );

  return handler(request);
}