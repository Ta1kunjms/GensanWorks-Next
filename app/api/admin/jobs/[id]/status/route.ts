import { createPatchHandler } from "@/lib/api-handler";
import { updateJobStatus } from "@/lib/supabase-admin-data";
import { employerJobStatusUpdateSchema } from "@/lib/validation-schemas";
import { successResponse, createApiError, ErrorCode, errorResponse } from "@/lib/api-errors";
import { logAuditAction } from "@/lib/audit";
import { z } from "zod";

type UpdateStatusBody = z.infer<typeof employerJobStatusUpdateSchema>;

export const PATCH = createPatchHandler<UpdateStatusBody>(
  async (ctx, body) => {
    const { id } = await (ctx.request as any).params || {}; // Next.js 15 params handling in wrapper might need care, but ctx.request is the NextRequest
    // In createApiHandler, we don't directly have params in the ctx, but it's passed to the original request handler.
    // Wait, createApiHandler returns (request: NextRequest) => ...
    // To handle dynamic segments, we might need to extract them from the URL if the wrapper doesn't provide them.
    
    const urlParts = ctx.request.nextUrl.pathname.split('/');
    const jobId = urlParts[urlParts.length - 2]; // .../admin/jobs/[id]/status
    
    if (!jobId) {
      return errorResponse(createApiError(ErrorCode.BAD_REQUEST, "Missing job ID"), ctx.requestId);
    }

    const { status: nextStatus } = body!;
    const updatedJob = await updateJobStatus(jobId, nextStatus);

    // Audit Log
    if (ctx.user) {
      const actionMap: Record<string, any> = {
        active: "job_approve",
        closed: "job_archive",
        archived: "job_archive",
        draft: "job_reject", // assuming rejection moves it back to draft or something similar
        pending: "job_reject"
      };

      await logAuditAction({
        userId: ctx.user.id,
        role: ctx.user.role,
        action: actionMap[nextStatus] || "admin_action",
        resourceType: "job",
        resourceId: jobId,
        payload: { status: nextStatus, prevStatus: "unknown" },
        req: ctx.request
      });
    }

    return successResponse({ message: "Job status updated", job: updatedJob }, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    bodySchema: employerJobStatusUpdateSchema,
  }
);