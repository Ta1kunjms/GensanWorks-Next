export const dynamic = "force-dynamic";
import { createGetHandler } from "@/lib/api-handler";
import { fetchActiveJobs } from "@/lib/supabase-admin-data";
import { successResponse } from "@/lib/api-errors";

export const GET = createGetHandler(
  async (ctx) => {
    const jobs = await fetchActiveJobs();
    return successResponse(jobs, ctx.requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
  }
);
