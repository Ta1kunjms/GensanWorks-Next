import { changePasswordSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, errorResponse, successResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { getPasswordHash, updatePassword } from "@/lib/auth-utils";
import { verifyPassword, hashPassword } from "@/lib/utils";
import { z } from "zod";

type ChangePasswordBody = z.infer<typeof changePasswordSchema>;

export const POST = createPostHandler<ChangePasswordBody>(
  async (ctx: ApiHandlerContext, body?: ChangePasswordBody) => {
    const currentPassword = body?.currentPassword || "";
    const newPassword = body?.newPassword || "";

    // Get current password hash
    const currentHash = await safeDatabaseOperation(
      () => getPasswordHash(ctx.user!.id, ctx.user!.role as "admin" | "employer" | "jobseeker"),
      "changePassword"
    );

    if (!currentHash.success || !currentHash.data) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "User account not found"),
        ctx.requestId
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, currentHash.data);
    if (!isValid) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Current password is incorrect"),
        ctx.requestId
      );
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password
    const result = await safeDatabaseOperation(
      () => updatePassword(ctx.user!.id, ctx.user!.role as "admin" | "employer" | "jobseeker", newHash),
      "changePassword"
    );

    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.INTERNAL_ERROR, "Failed to update password"),
        ctx.requestId
      );
    }

    return successResponse(
      { message: "Password changed successfully" },
      ctx.requestId
    );
  },
  {
    bodySchema: changePasswordSchema,
    requireAuth: true,
    requireRecentAuthMinutes: 30,
    rateLimitMaxRequests: 8,
  }
);
