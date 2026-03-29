import { confirmVerifyEmailSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import {
  consumeLifecycleToken,
  markEmailVerified,
} from "@/lib/auth-account-tokens";
import { z } from "zod";

type ConfirmVerifyEmailBody = z.infer<typeof confirmVerifyEmailSchema>;

export const POST = createPostHandler<ConfirmVerifyEmailBody>(
  async (ctx: ApiHandlerContext, body?: ConfirmVerifyEmailBody) => {
    const token = body?.token || "";

    // Consume and validate token
    const tokenPayload = await safeDatabaseOperation(
      () => consumeLifecycleToken(token, "email_verify"),
      "verifyEmailConfirm"
    );

    if (!tokenPayload.success || !tokenPayload.data) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Invalid or expired token"),
        ctx.requestId
      );
    }

    // Mark email as verified
    const result = await safeDatabaseOperation(
      () =>
        markEmailVerified(
          tokenPayload.data!.role,
          tokenPayload.data!.userId,
          tokenPayload.data!.email
        ),
      "verifyEmailConfirm"
    );

    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.INTERNAL_ERROR, "Failed to verify email"),
        ctx.requestId
      );
    }

    return successResponse(
      {
        message: "Email verified successfully",
        verifiedEmail: tokenPayload.data.email,
      },
      ctx.requestId
    );
  },
  {
    bodySchema: confirmVerifyEmailSchema,
    rateLimitMaxRequests: 20,
  }
);
