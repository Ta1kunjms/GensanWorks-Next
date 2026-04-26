export const dynamic = "force-dynamic";
import { z } from "zod";
import { createGetHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { createApiError, ErrorCode, errorResponse, successResponse } from "@/lib/api-errors";
import { employerApplicationsListQuerySchema } from "@/lib/validation-schemas";
import { db } from "@/lib/db";

type EmployerApplicationsListQuery = z.infer<typeof employerApplicationsListQuerySchema>;

async function handleListEmployerApplications(
  ctx: ApiHandlerContext,
  query?: EmployerApplicationsListQuery
) {
  if (!ctx.user || ctx.user.role !== "employer") {
    return errorResponse(
      createApiError(ErrorCode.UNAUTHORIZED, "Employer authentication required"),
      ctx.requestId
    );
  }

  const normalizedQuery = query ?? {
    limit: 10,
    offset: 0,
  };

  let supabaseQuery = db
    .from("applications")
    .select("*, jobs(position_title)", { count: "exact" })
    .eq("employer_id", ctx.user.id);

  if (normalizedQuery.status) {
    supabaseQuery = supabaseQuery.eq("status", normalizedQuery.status);
  }

  if (normalizedQuery.jobId) {
    supabaseQuery = supabaseQuery.eq("job_id", normalizedQuery.jobId);
  }

  if (normalizedQuery.search) {
    supabaseQuery = supabaseQuery.or(`applicant_name.ilike.%${normalizedQuery.search}%,applicant_email.ilike.%${normalizedQuery.search}%`);
  }

  const { data: applications, count, error } = await supabaseQuery
    .order("created_at", { ascending: false })
    .range(normalizedQuery.offset, normalizedQuery.offset + normalizedQuery.limit - 1);

  if (error) {
    return errorResponse(
      createApiError(
        ErrorCode.DATABASE_ERROR,
        error.message || "Failed to load employer applications"
      ),
      ctx.requestId
    );
  }

  const total = count ?? 0;
  const hasMore = normalizedQuery.offset + normalizedQuery.limit < total;

  return successResponse(
    {
      applications: applications ?? [],
      pagination: {
        limit: normalizedQuery.limit,
        offset: normalizedQuery.offset,
        total,
        hasMore,
      },
    },
    ctx.requestId
  );
}

export const GET = createGetHandler(
  handleListEmployerApplications,
  {
    querySchema: employerApplicationsListQuerySchema,
    requireAuth: true,
    allowedRoles: ["employer"],
    rateLimitMaxRequests: 60,
  }
);