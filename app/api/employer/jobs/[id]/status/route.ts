import { NextRequest } from "next/server";
import { createPatchHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerJobStatusUpdateSchema } from "@/lib/validation-schemas";
import { getEmployerJobById, updateEmployerJobWorkflowStatus } from "@/lib/db-helpers";
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

      const existingResult = await getEmployerJobById(employerId, id);
      if (!existingResult.success) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch job"),
          ctx.requestId
        );
      }

      if (!existingResult.data) {
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

      const updateResult = await updateEmployerJobWorkflowStatus(
        employerId,
        id,
        payload.status
      );

      if (!updateResult.success) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update job status"),
          ctx.requestId
        );
      }

      if (!updateResult.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      return successResponse(
        {
          message: "Job status updated",
          job: updateResult.data,
        },
        ctx.requestId
      );
    },
    {
      bodySchema: employerJobStatusUpdateSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 30,
    }
  );

  return handler(request);
}
