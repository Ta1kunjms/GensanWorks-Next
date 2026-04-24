import { createGetHandler, createPutHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { employerAccountProfileUpdateSchema } from "@/lib/validation-schemas";
import { getEmployerProfileById, updateEmployerProfileById } from "@/lib/db-helpers";
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

    const updatedProfile = await updateEmployerProfileById(ctx.user.id, body || {});

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
