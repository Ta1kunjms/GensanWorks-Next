import { NextResponse } from "next/server";
import { createGetHandler, ApiHandlerContext } from "@/lib/api-handler";
import {
  errorResponse,
  createApiError,
  ErrorCode,
  safeDatabaseOperation,
} from "@/lib/api-errors";
import { getUserProfile } from "@/lib/auth-utils";

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 * Protected endpoint (requires authentication)
 */
export const GET = createGetHandler(
  async (ctx: ApiHandlerContext) => {
    // Authentication is automatic (requireAuth: true)
    if (!ctx.user) {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Authentication required"),
        ctx.requestId
      );
    }

    // Fetch full profile based on role
    const result = await safeDatabaseOperation(
      async () => {
        const profile = await getUserProfile(ctx.user!.id, ctx.user!.role);

        if (!profile) {
          throw new Error("profile_not_found");
        }

        return profile;
      },
      "getMyProfile"
    );

    if (!result.success) {
      if (result.error.message === "profile_not_found") {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "User profile not found"),
          ctx.requestId
        );
      }
      return errorResponse(result.error, ctx.requestId);
    }

    // Return user profile with core info
    const response = NextResponse.json(
      {
        success: true,
        data: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          role: ctx.user.role,
          image: ctx.user.image,
          profile: result.data,
        },
        requestId: ctx.requestId,
      },
      { status: 200 }
    );

    response.headers.set("X-Request-ID", ctx.requestId);
    return response;
  },
  {
    requireAuth: true,
    // Accessible to all authenticated roles
    rateLimitMaxRequests: 100, // High rate limit for read-only
  }
);
