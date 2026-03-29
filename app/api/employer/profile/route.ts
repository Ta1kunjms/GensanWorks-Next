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

    const result = await getEmployerProfileById(ctx.user.id);
    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to fetch profile"),
        ctx.requestId
      );
    }

    if (!result.data) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found"),
        ctx.requestId
      );
    }

    return successResponse({ profile: result.data }, ctx.requestId);
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

    const result = await updateEmployerProfileById(ctx.user.id, body || {});

    if (!result.success) {
      return errorResponse(
        createApiError(ErrorCode.DATABASE_ERROR, "Failed to update profile"),
        ctx.requestId
      );
    }

    if (!result.data) {
      return errorResponse(
        createApiError(ErrorCode.NOT_FOUND, "Profile not found"),
        ctx.requestId
      );
    }

    return successResponse(
      {
        message: "Profile updated",
        profile: result.data,
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
