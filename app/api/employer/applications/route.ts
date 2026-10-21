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
    .select("*, jobs(position_title), jobseekers(first_name, last_name, email)", { count: "exact" })
    .eq("employer_id", ctx.user.id);

  if (normalizedQuery.status) {
    supabaseQuery = supabaseQuery.eq("status", normalizedQuery.status);
  }

  if (normalizedQuery.jobId) {
    supabaseQuery = supabaseQuery.eq("job_id", normalizedQuery.jobId);
  }

  // Note: applicant_name/applicant_email don't exist in DB; search is omitted for now

  const { data: applications, count, error } = await supabaseQuery
    .order("created_at", { ascending: false })
    .range(normalizedQuery.offset, normalizedQuery.offset + normalizedQuery.limit - 1);

  if (error) {
    return errorResponse(
      createApiError(
        ErrorCode.DATABASE_ERROR,
        "Failed to load employer applications"
      ),
      ctx.requestId
    );
  }

  const total = count ?? 0;
  const hasMore = normalizedQuery.offset + normalizedQuery.limit < total;

  const mappedApplications = (applications ?? []).map((app: any) => {
    const applicantName = app.jobseekers
      ? `${app.jobseekers.first_name || ""} ${app.jobseekers.last_name || ""}`.trim()
      : "";
    const applicantEmail = app.jobseekers?.email ?? "";

    return {
      id: app.id,
      applicantName: applicantName || "Unknown",
      applicantEmail: applicantEmail || "No email",
      status: app.status,
      createdAt: app.created_at,
      notes: app.notes,
      feedback: null,
      source: app.source,
      jobId: app.job_id,
      job: app.jobs ? {
        positionTitle: app.jobs.position_title
      } : null,
    };
  });

  return successResponse(
    {
      applications: mappedApplications,
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