import { NextRequest } from "next/server";
import { createGetHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { listEmployerJobApplications } from "@/lib/db-helpers";

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

      const result = await listEmployerJobApplications(ctx.user.id, id);

      if (!result.success) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch job applications"),
          ctx.requestId
        );
      }

      if (!result.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      return successResponse(result.data, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 50,
    }
  );

  return handler(request);
}
