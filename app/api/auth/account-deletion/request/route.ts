import { z } from "zod";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { verifyPassword } from "@/lib/utils";
import { db } from "@/lib/db";

const requestAccountDeletionSchema = z.object({
  currentPassword: z.string().min(1, "Password required"),
  reason: z.string().optional(),
});

type AccountDeletionRequestBody = z.infer<typeof requestAccountDeletionSchema>;

export const POST = createPostHandler<AccountDeletionRequestBody>(
  async (ctx: ApiHandlerContext, body?: AccountDeletionRequestBody) => {
    const currentPassword = body?.currentPassword || "";
    const reason = body?.reason;

    try {
      // Get password hash based on role
      const tableMap: Record<string, string> = {
        admin: "admins",
        employer: "employers", 
        jobseeker: "users",
      };
      const table = tableMap[ctx.user!.role] || "users";
      
      const { data: userData, error: userError } = await db
        .from(table)
        .select("password_hash")
        .eq("id", ctx.user!.id)
        .single();

      if (userError || !userData) {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Unable to verify password"),
          ctx.requestId
        );
      }

      const isValidPassword = await verifyPassword(currentPassword, userData.password_hash || "");
      if (!isValidPassword) {
        return errorResponse(
          createApiError(ErrorCode.BAD_REQUEST, "Current password is incorrect"),
          ctx.requestId
        );
      }

      // Check for existing pending deletion request
      const { data: existing } = await db
        .from("account_deletion_requests")
        .select("id, delete_after")
        .eq("role", ctx.user!.role)
        .eq("user_id", ctx.user!.id)
        .eq("status", "pending")
        .single();

      if (existing) {
        return errorResponse(
          createApiError(
            ErrorCode.CONFLICT,
            "Account deletion is already scheduled",
            "You have already requested to delete this account.",
            { deleteAfter: existing.delete_after }
          ),
          ctx.requestId
        );
      }

      // Create deletion request (7-day grace period)
      const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const { data: created, error: insertError } = await db
        .from("account_deletion_requests")
        .insert({
          role: ctx.user!.role,
          user_id: ctx.user!.id,
          email: ctx.user!.email!,
          status: "pending",
          reason: reason?.trim() || null,
          requested_at: new Date().toISOString(),
          delete_after: deleteAfter.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !created) {
        return errorResponse(
          createApiError(ErrorCode.INTERNAL_ERROR, "Failed to schedule deletion"),
          ctx.requestId
        );
      }

      return successResponse(
        {
          message: "Account deletion scheduled. You can cancel before the deadline.",
          deletionRequest: { id: created.id, deleteAfter: created.delete_after },
        },
        ctx.requestId
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(
          createApiError(ErrorCode.BAD_REQUEST, error.errors[0]?.message || "Invalid request"),
          ctx.requestId
        );
      }
      return errorResponse(
        createApiError(ErrorCode.INTERNAL_ERROR, "Failed to schedule account deletion"),
        ctx.requestId
      );
    }
  },
  {
    bodySchema: requestAccountDeletionSchema,
    requireAuth: true,
    requireRecentAuthMinutes: 30,
    rateLimitMaxRequests: 6,
  }
);