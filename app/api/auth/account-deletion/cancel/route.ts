import { and, eq } from "drizzle-orm";
import { cancelAccountDeletionSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { db } from "@/lib/db";
import { accountDeletionRequestsTable } from "@/db/schema";

export const POST = createPostHandler(
  async (ctx: ApiHandlerContext) => {
    // Cancel pending deletion request
    const result = await safeDatabaseOperation(
      async () => {
        const [updated] = await db
          .update(accountDeletionRequestsTable)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(accountDeletionRequestsTable.role, ctx.user!.role),
              eq(accountDeletionRequestsTable.userId, ctx.user!.id),
              eq(accountDeletionRequestsTable.status, "pending")
            )
          )
          .returning({ id: accountDeletionRequestsTable.id });
        return updated || null;
      },
      "accountDeletionCancel"
    );

    if (!result.success || !result.data) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "No pending account deletion request found"),
        ctx.requestId
      );
    }

    return successResponse(
      { message: "Account deletion request cancelled" },
      ctx.requestId
    );
  },
  {
    bodySchema: cancelAccountDeletionSchema,
    requireAuth: true,
    rateLimitMaxRequests: 10,
  }
);
