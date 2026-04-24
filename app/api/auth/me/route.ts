import { NextResponse } from "next/server";
import { createGetHandler, ApiHandlerContext } from "@/lib/api-handler";
import {
  errorResponse,
  createApiError,
  ErrorCode,
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
    const profile = await getUserProfile(ctx.user!.id, ctx.user!.role);

    if (!profile) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "User profile not found"),
        ctx.requestId
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          role: ctx.user.role,
          image: ctx.user.image,
          profile,
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
