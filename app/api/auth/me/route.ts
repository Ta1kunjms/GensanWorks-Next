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

    // Task 13O: Ensure password_hash is never exposed in browser API responses
    let sanitizedProfile: unknown = profile;
    if (profile && typeof profile === "object") {
      if ("data" in profile && profile.data && typeof profile.data === "object") {
        const { password_hash: _omitted, ...safeData } = profile.data as Record<string, unknown>;
        sanitizedProfile = {
          ...profile,
          data: safeData,
        };
      } else {
        const { password_hash: _omitted, ...safeProfile } = profile as unknown as Record<string, unknown>;
        sanitizedProfile = safeProfile;
      }
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
