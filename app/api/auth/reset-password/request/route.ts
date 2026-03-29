import { NextResponse } from "next/server";
import { createPostHandler, ApiHandlerContext } from "@/lib/api-handler";
import { passwordResetRequestSchema } from "@/lib/validation-schemas";
import {
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { findAccountByEmail } from "@/lib/auth-utils";
import { issueLifecycleToken } from "@/lib/auth-account-tokens";
import { sendAuthLifecycleEmail } from "@/lib/auth-email";
import { z } from "zod";

type PasswordResetRequestBody = z.infer<typeof passwordResetRequestSchema>;

/**
 * POST /api/auth/reset-password/request
 * Request a password reset email
 * Public endpoint (no auth required)
 * Uses security through obscurity: returns success even if email not found
 */
export const POST = createPostHandler<PasswordResetRequestBody>(
  async (ctx: ApiHandlerContext, body?: PasswordResetRequestBody) => {
    const email = (body?.email || "").toLowerCase().trim();

    // Execute password reset flow
    await safeDatabaseOperation(
      async () => {
        // Quietly try to find account (don't reveal if exists)
        const account = await findAccountByEmail(email);

        if (account) {
          // Generate reset token
          const tokenPayload = await issueLifecycleToken({
            kind: "password_reset",
            role: account.role,
            userId: account.id,
            email: account.email,
            ttlMs: 15 * 60_000, // 15 minutes
          });

          // Send reset email (non-blocking)
          try {
            await sendAuthLifecycleEmail({
              kind: "password_reset",
              to: account.email,
              token: tokenPayload.token,
              requestId: ctx.requestId,
            });
          } catch (emailError) {
            console.error("Password reset email error:", {
              requestId: ctx.requestId,
              email: account.email,
              role: account.role,
              error: emailError,
            });
            // Don't fail the request if email send fails
          }
        }

        // Always return success (security through obscurity)
        return { sent: true };
      },
      "passwordResetRequest"
    );

    // Return generic success message
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message:
            "If an account exists with that email, password reset instructions have been sent.",
        },
        requestId: ctx.requestId,
      },
      { status: 200 }
    );

    response.headers.set("X-Request-ID", ctx.requestId);
    return response;
  },
  {
    bodySchema: passwordResetRequestSchema,
    rateLimitMaxRequests: 5, // Stricter rate limit for auth
  }
);
