import { updateJobPostingSchema } from "@/lib/validation-schemas";
import {
  createGetHandler,
  createPutHandler,
  createDeleteHandler,
  type ApiHandlerContext,
} from "@/lib/api-handler";
import {
  safeDatabaseOperation,
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { getEmployerJobById, deleteEmployerJob } from "@/lib/db-helpers";
import { db } from "@/lib/db";
import { jobsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

type UpdateJobPostingBody = z.infer<typeof updateJobPostingSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createGetHandler(
    async (ctx: ApiHandlerContext) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const result = await getEmployerJobById(ctx.user.id, id);
      if (!result.success || !result.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      return successResponse({ job: result.data }, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 50,
    }
  );

  return handler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createPutHandler<UpdateJobPostingBody>(
    async (ctx: ApiHandlerContext, body?: UpdateJobPostingBody) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const employerId = ctx.user.id;

      const jobResult = await getEmployerJobById(employerId, id);
      if (!jobResult.success || !jobResult.data) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      const payload = body;
      if (!payload) {
        return errorResponse(
          createApiError(ErrorCode.BAD_REQUEST, "Invalid request body"),
          ctx.requestId
        );
      }

      const updateResult = await safeDatabaseOperation(
        async () => {
          const [updated] = await db
            .update(jobsTable)
            .set({
              positionTitle: payload.positionTitle?.trim(),
              description: payload.description?.trim(),
              location: payload.location?.trim(),
              employmentType: payload.employmentType,
              salaryMin: payload.salaryMin ? String(payload.salaryMin) : null,
              salaryMax: payload.salaryMax ? String(payload.salaryMax) : null,
              salaryPeriod: payload.salaryPeriod || null,
              updatedAt: new Date(),
            })
            .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
            .returning();

          return updated || null;
        },
        "updateEmployerJob"
      );

      if (!updateResult.success || !updateResult.data) {
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, "Failed to update job"),
          ctx.requestId
        );
      }

      return successResponse(
        {
          message: "Job updated successfully",
          job: updateResult.data,
        },
        ctx.requestId
      );
    },
    {
      bodySchema: updateJobPostingSchema,
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 20,
    }
  );

  return handler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = createDeleteHandler(
    async (ctx: ApiHandlerContext) => {
      if (!ctx.user || ctx.user.role !== "employer") {
        return errorResponse(
          createApiError(ErrorCode.UNAUTHORIZED, "Employer role required"),
          ctx.requestId
        );
      }

      const jobResult = await deleteEmployerJob(ctx.user.id, id);
      if (!jobResult.success) {
        const message = jobResult.error?.message || "Failed to delete job";
        return errorResponse(
          createApiError(ErrorCode.DATABASE_ERROR, message),
          ctx.requestId
        );
      }

      return successResponse({ message: "Job deleted successfully" }, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 20,
    }
  );

  return handler(request);
}
