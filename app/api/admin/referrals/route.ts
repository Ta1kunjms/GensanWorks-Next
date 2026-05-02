export const dynamic = "force-dynamic";
import { createPostHandler } from "@/lib/api-handler";
import { createReferral } from "@/lib/supabase-admin-data";
import { successResponse } from "@/lib/api-errors";
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
    const referral = await createReferral({ jobId, jobseekerId });
    return successResponse(referral, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    bodySchema: referralSchema,
  }
);
