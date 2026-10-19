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

    // Fetch full profile based on role (getUserProfile returns the full Supabase
    // response; the profile row is its .data, and query failures arrive in .error)
    const profileResult = await getUserProfile(ctx.user!.id, ctx.user!.role);

    if (profileResult.error || !profileResult.data || typeof profileResult.data !== "object") {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "User profile not found"),
        ctx.requestId
      );
    }

    // Task 13O: Ensure password_hash is never exposed in browser API responses
    const profileRow: Record<string, unknown> = profileResult.data;
    const { password_hash: _omitted, ...safeData } = profileRow;
    const sanitizedProfile = {
      ...profileResult,
      data: safeData,
    };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          role: ctx.user.role,
          image: ctx.user.image,
          profile: sanitizedProfile,
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
