export const dynamic = "force-dynamic";
import { createGetHandler, createPutHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerAccountProfileUpdateSchema } from "@/lib/validation-schemas";
import { getEmployerProfileById, updateEmployerProfileById } from "@/lib/db-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

type EmployerProfileUpdateBody = z.infer<typeof employerAccountProfileUpdateSchema>;

export const GET = createGetHandler(
  async (ctx: ApiHandlerContext) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    const profile = await getEmployerProfileById(ctx.user.id);
    if (!profile) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found"),
        ctx.requestId
      );
    }

    return successResponse({ profile }, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 40,
  }
);

export const PUT = createPutHandler<EmployerProfileUpdateBody>(
  async (ctx: ApiHandlerContext, body?: EmployerProfileUpdateBody) => {
    if (!ctx.user || ctx.user.role !== "employer") {
      return errorResponse(
        createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
        ctx.requestId
      );
    }

    if (!body) {
      return errorResponse(
        createApiError(ErrorCode.BAD_REQUEST, "Body is required"),
        ctx.requestId
      );
    }

    const dbPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbPayload[snakeKey] = value;
      }
    }

    const updatedProfile = await updateEmployerProfileById(ctx.user.id, dbPayload);
    
    // Sync profile image to auth metadata for sidebar/session use
    if (dbPayload.profile_image) {
      await supabaseAdmin.auth.admin.updateUserById(ctx.user.id, {
        user_metadata: { avatar_url: dbPayload.profile_image }
      });
    }

    if (!updatedProfile) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found"),
        ctx.requestId
      );
    }

    return successResponse(
      {
        message: "Profile updated",
        profile: updatedProfile,
      },
      ctx.requestId
    );
  },
  {
    bodySchema: employerAccountProfileUpdateSchema,
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 20,
  }
);
