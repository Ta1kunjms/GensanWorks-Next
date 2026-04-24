import { NextRequest } from "next/server";
import { createPatchHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerJobStatusUpdateSchema } from "@/lib/validation-schemas";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

type EmployerJobStatusUpdateBody = z.infer<typeof employerJobStatusUpdateSchema>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createPatchHandler<EmployerJobStatusUpdateBody>(
    async (ctx: ApiHandlerContext, body?: EmployerJobStatusUpdateBody) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const employerId = ctx.user.id;

      const { data: existing } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("id", id)
        .eq("employer_id", employerId)
        .single();

      if (!existing) {
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

      const now = new Date().toISOString();
      const updateData = {
        status: payload.status,
        archived: payload.status === "archived",
        is_published: payload.status === "active",
        published_at: payload.status === "active" ? now : null,
        updated_at: now,
      };

      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from("jobs")
        .update(updateData)
        .eq("id", id)
        .eq("employer_id", employerId)
        .select("id, status, is_published, archived")
        .single();

      if (updateError || !updateResult) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update job status"),
          ctx.requestId
        );
      }

      return successResponse(
        {
          message: "Job status updated",
          job: updateResult,
        },
        ctx.requestId
      );
    },
    {
      bodySchema: employerJobStatusUpdateSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 40,
    }
  );

  return handler(request);
}