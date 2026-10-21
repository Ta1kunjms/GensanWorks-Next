export const dynamic = "force-dynamic";
import { createPostHandler } from "@/lib/api-handler";
import { createReferral } from "@/lib/supabase-admin-data";
import { successResponse, errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { z } from "zod";

const referralSchema = z.object({
  jobId: z.string().uuid(),
  jobseekerId: z.string().uuid(),
});

type ReferralPayload = z.infer<typeof referralSchema>;

export const POST = createPostHandler<ReferralPayload>(
  async (ctx, body) => {
    if (!body) throw new Error("Body is required"); // TS check, though bodySchema ensures it
    const { jobId, jobseekerId } = body;
    if (!ctx.user) throw new Error("Unauthorized");
    try {
      const referral = await createReferral({ jobId, jobseekerId, adminId: ctx.user.id });
      return successResponse(referral, ctx.requestId);
    } catch (err) {
      if ((err as { status?: number }).status === 409) {
        return errorResponse(createApiError(ErrorCode.CONFLICT, (err as Error).message), ctx.requestId);
      }
      throw err;
    }
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    bodySchema: referralSchema,
  }
);
