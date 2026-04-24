import { createGetHandler } from "@/lib/api-handler";
import { supabaseAdmin } from "@/lib/supabase";
import { paginationQuerySchema } from "@/lib/validation-schemas";
import { paginatedResponse } from "@/lib/api-errors";
import { z } from "zod";

const auditLogsQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
});

type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;

export const GET = createGetHandler<AuditLogsQuery>(
  async (ctx, query) => {
    const { userId, action, resourceType, limit, offset } = query!;
    const requestId = ctx.requestId;

    let q = supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" });

    if (userId) q = q.eq("user_id", userId);
    if (action) q = q.eq("action", action);
    if (resourceType) q = q.eq("resource_type", resourceType);

    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return paginatedResponse(data || [], count || 0, limit, offset, requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    querySchema: auditLogsQuerySchema,
  }
);
