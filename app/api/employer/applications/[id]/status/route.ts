import { NextRequest } from "next/server";
import { createPatchHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerApplicationStatusUpdateSchema } from "@/lib/validation-schemas";
import {
  getEmployerApplicationById,
  updateEmployerApplicationStatus,
} from "@/lib/db-helpers";
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

      const existingResult = await getEmployerApplicationById(employerId, id);
      if (!existingResult.success) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch application"),
          ctx.requestId
        );
      }

      if (!existingResult.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Application not found"),
          ctx.requestId
        );
      }

      const updateResult = await updateEmployerApplicationStatus(employerId, id, payload);

      if (!updateResult.success) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update application"),
          ctx.requestId
        );
      }

      if (!updateResult.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Application not found"),
          ctx.requestId
        );
      }

      await tryCreateNotification({
        userId: existingResult.data.applicantId,
        role: "jobseeker",
        type: "application",
        title: "Application Status Updated",
        message: `Your application status is now ${updateResult.data.status}.`,
        relatedId: updateResult.data.id,
        relatedType: "application",
      });

      return successResponse(
        {
          message: "Application updated",
          application: updateResult.data,
        },
        ctx.requestId
      );
    },
    {
      bodySchema: employerApplicationStatusUpdateSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 30,
    }
  );

  return handler(request);
}
