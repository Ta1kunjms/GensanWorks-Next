import { NextRequest } from "next/server";
import { createGetHandler, type ApiHandlerContext } from "@/lib/api-handler";
import {
  successResponse,
  errorResponse,
  createApiError,
  ErrorCode,
} from "@/lib/api-errors";
import { db } from "@/lib/db";

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

      const { data: job } = await db
        .from("jobs")
        .select("id, position_title")
        .eq("id", id)
        .eq("employer_id", ctx.user.id)
        .single();

      if (!job) {
        return errorResponse(
          createApiError(ErrorCode.NOT_FOUND, "Job not found"),
          ctx.requestId
        );
      }

      const { data: applications } = await db
        .from("applications")
        .select("*, users(*)")
        .eq("job_id", id)
        .eq("employer_id", ctx.user.id)
        .order("created_at", { ascending: false });

      return successResponse({ job, applications: applications ?? [] }, ctx.requestId);
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 50,
    }
  );

  return handler(request);
}