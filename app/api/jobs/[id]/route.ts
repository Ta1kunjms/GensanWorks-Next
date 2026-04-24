import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId);
    if (!isUuid) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimitResult = enforceRateLimit({
      key: `jobs:detail:${clientIp}`,
      maxRequests: 60,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limited" },
        {
          status: 429,
          headers: {
            "X-Request-ID": getRequestId(request),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetInSeconds),
          },
        }
      );
    }

    const jobResult = await supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, description, responsibilities, qualifications, employment_type, location, city, province, salary_min, salary_max, salary_period, vacancies, start_date, end_date, required_skills, preferred_skills, education_level, years_experience, minimum_age, maximum_age, benefits, work_schedule, reporting_to, is_remote, is_published, archived, published_at, employers!inner(id, establishment_name, email, contact_person, contact_phone)"
      )
      .eq("id", jobId)
      .single();

    const jobData = jobResult.data;

    if (!jobData?.id || !jobData.is_published || jobData.archived) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const countResult = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    const session = await auth();
    const empData = jobData.employers as unknown as Record<string, unknown>;
    const contactInfo =
      session && session.user
        ? {
            employerEmail: empData?.email,
            employerContactPerson: empData?.contact_person,
            employerContactPhone: empData?.contact_phone,
          }
        : {};

    return NextResponse.json(
      {
        ...jobData,
        employerName: empData?.establishment_name,
        employerId: empData?.id,
        applicationsCount: countResult.count ?? 0,
        ...contactInfo,
      },
      { headers: { "X-Request-ID": getRequestId(request) } }
    );
  } catch (error) {
    console.error("[GET /api/jobs/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
    );
  }
}