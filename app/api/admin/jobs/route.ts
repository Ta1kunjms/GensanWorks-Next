export const dynamic = "force-dynamic";
import { createGetHandler } from "@/lib/api-handler";
import { fetchAdminJobs } from "@/lib/supabase-admin-data";
import { adminJobsQuerySchema } from "@/lib/validation-schemas";
import { paginatedResponse } from "@/lib/api-errors";
import { z } from "zod";

type AdminJobsQuery = z.infer<typeof adminJobsQuerySchema>;

export const GET = createGetHandler<AdminJobsQuery>(
  async (ctx, query) => {
    const { status, search, sortBy, sortOrder, limit, offset } = query!;
    const requestId = ctx.requestId;

    const { jobs, total } = await fetchAdminJobs({ 
      status, 
      search, 
      sortBy, 
      sortOrder, 
      limit, 
      offset 
    });

    return paginatedResponse(jobs, total, limit, offset, requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    querySchema: adminJobsQuerySchema,
  }
);