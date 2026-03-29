import { requestVerifyEmailSchema } from "@/lib/validation-schemas";
import { createPostHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { safeDatabaseOperation, successResponse } from "@/lib/api-errors";
import { findAccountByEmail } from "@/lib/auth-utils";
import { issueLifecycleToken } from "@/lib/auth-account-tokens";
import { sendAuthLifecycleEmail } from "@/lib/auth-email";
import { z } from "zod";

type RequestVerifyEmailBody = z.infer<typeof requestVerifyEmailSchema>;

export const POST = createPostHandler<RequestVerifyEmailBody>(
  async (ctx: ApiHandlerContext, body?: RequestVerifyEmailBody) => {
    const email = (body?.email || "").toLowerCase().trim();
    const role = body?.role;

    // Find account (security through obscurity - always return success)
    const account = await safeDatabaseOperation(
      () => findAccountByEmail(email, role),
      "verifyEmailRequest"
    );

    if (account.success && account.data) {
      // Issue lifecycle token and send email
      const tokenResult = await issueLifecycleToken({
        kind: "email_verify",
        role: account.data.role,
        userId: account.data.id,
        email: account.data.email,
        ttlMs: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Send email asynchronously (don't wait for it)
      sendAuthLifecycleEmail({
        kind: "email_verify",
        to: account.data.email,
        token: tokenResult.token,
        requestId: ctx.requestId,
      }).catch((err) => {
        console.error("Failed to send verification email:", err);
      });
    }

    // Always return success (security through obscurity)
    return successResponse(
      {
        message: "If an account exists, a verification link has been sent to the email address.",
      },
      ctx.requestId
    );
  },
  {
    bodySchema: requestVerifyEmailSchema,
    rateLimitMaxRequests: 20,
  }
);
