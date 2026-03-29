import { createGetHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { getEmployerSummary } from "@/lib/db-helpers";

export const GET = createGetHandler(
  async (ctx: ApiHandlerContext) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    const result = await getEmployerSummary(ctx.user.id);
    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch summary"),
        ctx.requestId
      );
    }

    return successResponse(result.data, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 40,
  }
);
