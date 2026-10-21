export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createGetHandler, type ApiHandlerContext } from "@/lib/api-handler";
import { errorResponse, createApiError, ErrorCode } from "@/lib/api-errors";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/postgrest-safe";

function skillList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : (v as { name?: string; skill?: string })?.name ?? (v as { skill?: string })?.skill ?? ""))
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// Applicants for one of the employer's own jobs. Returns the shape read by
// app/employer/jobs/[id]/applications/page.tsx ({ job, applications }).
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
      if (!isUuid(id)) {
        return errorResponse(createApiError(ErrorCode.NOT_FOUND, "Job not found"), ctx.requestId);
      }

      const { data: job, error: jobError } = await db
        .from("jobs")
        .select("id, position_title")
        .eq("id", id)
        .eq("employer_id", ctx.user.id)
        .maybeSingle();
      if (jobError) throw jobError;
      if (!job) {
        return errorResponse(createApiError(ErrorCode.NOT_FOUND, "Job not found"), ctx.requestId);
      }

      const { data: applications, error: appsError } = await db
        .from("applications")
        .select("id, jobseeker_id, status, submitted_at, created_at")
        .eq("job_id", id)
        .eq("employer_id", ctx.user.id)
        .order("created_at", { ascending: false });
      if (appsError) throw appsError;

      const seekerIds = Array.from(new Set((applications ?? []).map((a) => a.jobseeker_id).filter(Boolean)));
      const [{ data: seekers }, { data: education }] = await Promise.all([
        seekerIds.length
          ? db
              .from("jobseekers")
              .select("id, first_name, middle_name, last_name, suffix, email, phone, city, province, preferred_occupation_1, other_skills, preferred_work_location_local_1, preferred_work_location_local_2, preferred_work_location_local_3")
              .in("id", seekerIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        seekerIds.length
          ? db.from("jobseeker_education").select("jobseeker_id, level").in("jobseeker_id", seekerIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
      ]);
      const seekerById = new Map((seekers ?? []).map((s) => [String(s.id), s as Record<string, unknown>]));
      const levelById = new Map((education ?? []).map((e) => [String(e.jobseeker_id), e.level as string | null]));

      return NextResponse.json({
        success: true,
        requestId: ctx.requestId,
        job: { id: job.id, positionTitle: job.position_title },
        applications: (applications ?? []).map((a) => {
          const s = seekerById.get(String(a.jobseeker_id)) ?? {};
          const name = [s.first_name, s.middle_name, s.last_name, s.suffix]
            .filter((p) => typeof p === "string" && p.trim())
            .join(" ") || null;
          return {
            id: a.id,
            applicantId: a.jobseeker_id,
            applicantName: name,
            applicantEmail: (s.email as string) ?? null,
            status: a.status,
            submittedAt: a.submitted_at ?? a.created_at,
            coverLetter: null,
            resumeUrl: null,
            feedback: null,
            userName: name,
            userEmail: (s.email as string) ?? null,
            userPhone: (s.phone as string) ?? null,
            userCity: (s.city as string) ?? null,
            userProvince: (s.province as string) ?? null,
            userCurrentOccupation: (s.preferred_occupation_1 as string) ?? null,
            userEducationLevel: levelById.get(String(a.jobseeker_id)) ?? null,
            userSkills: skillList(s.other_skills),
            userPreferredLocations: [s.preferred_work_location_local_1, s.preferred_work_location_local_2, s.preferred_work_location_local_3]
              .filter((l): l is string => typeof l === "string" && l.trim() !== ""),
          };
        }),
      });
    },
    {
      requireAuth: true,
      allowedRoles: ["employer"],
      rateLimitMaxRequests: 50,
    }
  );

  return handler(request);
}
