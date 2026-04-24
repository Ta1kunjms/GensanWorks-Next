import { cancelAccountDeletionSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { db } from "@/lib/db";

export const POST = createPostHandler(
  async (ctx: ApiHandlerContext) => {
    try {
      const { data, error } = await db
        .from("account_deletion_requests")
        .update({
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("role", ctx.user!.role)
        .eq("user_id", ctx.user!.id)
        .eq("status", "pending")
        .select("id")
        .single();

      if (error || !data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "No pending account deletion request found"),
          ctx.requestId
        );
      }

      return successResponse(
        { message: "Account deletion request cancelled" },
        ctx.requestId
      );
    } catch (error) {
      return errorResponse(
        createApiError(ErrorCode.INTERNAL_ERROR, "Failed to cancel account deletion request"),
        ctx.requestId
      );
    }
  },
  {
    bodySchema: cancelAccountDeletionSchema,
    requireAuth: true,
    rateLimitMaxRequests: 10,
  }
);