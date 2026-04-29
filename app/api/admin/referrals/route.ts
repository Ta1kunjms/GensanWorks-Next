export const dynamic = "force-dynamic";
import { createPostHandler } from "@/lib/api-handler";
import { createReferral } from "@/lib/supabase-admin-data";
import { successResponse } from "@/lib/api-errors";
import { z } from "zod";

const referralSchema = z.object({
  jobId: z.string().uuid(),
  jobseekerId: z.string().uuid(),
});

export const POST = createPostHandler(
  async (ctx, body) => {
    const { jobId, jobseekerId } = referralSchema.parse(body);
    const referral = await createReferral({ jobId, jobseekerId });
    return successResponse(referral, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
  }
);
