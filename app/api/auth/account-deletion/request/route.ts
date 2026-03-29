import { and, eq } from "drizzle-orm";
import { requestAccountDeletionSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { getPasswordHash } from "@/lib/auth-utils";
import { verifyPassword } from "@/lib/utils";
import { db } from "@/lib/db";
import { accountDeletionRequestsTable } from "@/db/schema";
import { z } from "zod";

type AccountDeletionRequestBody = z.infer<typeof requestAccountDeletionSchema>;

export const POST = createPostHandler<AccountDeletionRequestBody>(
  async (ctx: ApiHandlerContext, body?: AccountDeletionRequestBody) => {
    const currentPassword = body?.currentPassword || "";
    const reason = body?.reason;

    // Verify current password
    const passwordHashResult = await safeDatabaseOperation(
      () => getPasswordHash(ctx.user!.id, ctx.user!.role as "admin" | "employer" | "jobseeker"),
      "accountDeletionRequest"
    );

    if (!passwordHashResult.success || !passwordHashResult.data) {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Unable to verify password"),
        ctx.requestId
      );
    }

    const isValidPassword = await verifyPassword(currentPassword, passwordHashResult.data);
    if (!isValidPassword) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Current password is incorrect"),
        ctx.requestId
      );
    }

    // Check for existing pending deletion request
    const existingRequestResult = await safeDatabaseOperation(
      async () => {
        const [existing] = await db
          .select({
            id: accountDeletionRequestsTable.id,
            deleteAfter: accountDeletionRequestsTable.deleteAfter,
          })
          .from(accountDeletionRequestsTable)
          .where(
            and(
              eq(accountDeletionRequestsTable.role, ctx.user!.role),
              eq(accountDeletionRequestsTable.userId, ctx.user!.id),
              eq(accountDeletionRequestsTable.status, "pending")
            )
          )
          .limit(1);
        return existing || null;
      },
      "accountDeletionRequest"
    );

    if (existingRequestResult.success && existingRequestResult.data) {
      return errorResponse(
        createApiError(
          ErrorCode.CONFLICT,
          "Account deletion is already scheduled",
          { deleteAfter: existingRequestResult.data.deleteAfter }
        ),
        ctx.requestId
      );
    }

    // Create deletion request (7-day grace period)
    const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const creationResult = await safeDatabaseOperation(
      async () => {
        const [created] = await db
          .insert(accountDeletionRequestsTable)
          .values({
            role: ctx.user!.role,
            userId: ctx.user!.id,
            email: ctx.user!.email,
            status: "pending",
            reason: reason?.trim() || null,
            requestedAt: new Date(),
            deleteAfter,
          })
          .returning({
            id: accountDeletionRequestsTable.id,
            deleteAfter: accountDeletionRequestsTable.deleteAfter,
          });
        return created;
      },
      "accountDeletionRequest"
    );

    if (!creationResult.success) {
      return errorResponse(
        createApiError(ErrorCode.INTERNAL_ERROR, "Failed to schedule deletion"),
        ctx.requestId
      );
    }

    return successResponse(
      {
        message: "Account deletion scheduled. You can cancel before the deadline.",
        deletionRequest: creationResult.data,
      },
      ctx.requestId
    );
  },
  {
    bodySchema: requestAccountDeletionSchema,
    requireAuth: true,
    rateLimitMaxRequests: 6,
  }
);
