export const dynamic = "force-dynamic";
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

    const summary = await getEmployerSummary(ctx.user.id);

    return successResponse(summary, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 40,
  }
);
