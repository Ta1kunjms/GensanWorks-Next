import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { type JobDetailResponse } from "@/lib/job-detail";

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
        "id, employer_id, position_title, minimum_education_required, main_skill_desired, years_of_experience_required, age_preference_min, age_preference_max, starting_salary, job_status, vacancies, is_active, archived, created_at, updated_at, category, work_setup, psoc_code, featured, slots_remaining, job_embedding, employers!inner(establishment_name, email, contact_person, contact_phone, city, province)"
      )
      .eq("id", jobId)
      .eq("archived", false)
      .single();

    const jobData = jobResult.data;

    if (!jobData?.id || jobData.archived) {
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
    let applicationStatus: string | null = null;
    let hasApplied = false;
    let isSaved = false;

    if (session?.user?.id) {
      // Check application status
      const { data: existingApp } = await supabaseAdmin
        .from("applications")
        .select("status")
        .eq("job_id", jobId)
        .eq("jobseeker_id", session.user.id)
        .maybeSingle();

      if (existingApp) {
        hasApplied = true;
        applicationStatus = existingApp.status;
      }

      // Check if saved
      const { data: existingSave } = await supabaseAdmin
        .from("jobseeker_saved_jobs")
        .select("id")
        .eq("job_id", jobId)
        .eq("jobseeker_id", session.user.id)
        .maybeSingle();

      if (existingSave) {
        isSaved = true;
      }
    }

    const empData = jobData.employers as unknown as Record<string, unknown>;
    const toNullableString = (value: unknown): string | null =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
    const contactInfo =
      session && session.user
        ? {
            employerEmail: toNullableString(empData?.email),
            employerContactPerson: toNullableString(empData?.contact_person),
            employerContactPhone: toNullableString(empData?.contact_phone),
          }
        : {};

    const location = [empData?.city, empData?.province].filter(Boolean).join(", ") || null;

    const response: JobDetailResponse = {
      id: jobData.id,
      employerId: jobData.employer_id ?? empData?.id ?? null,
      employerName: toNullableString(empData?.establishment_name),
      employerEmail: toNullableString(empData?.email),
      employerContactPerson: toNullableString(empData?.contact_person),
      employerContactPhone: toNullableString(empData?.contact_phone),
      employerCity: toNullableString(empData?.city),
      employerProvince: toNullableString(empData?.province),
      positionTitle: jobData.position_title,
      minimumEducationRequired: toNullableString(jobData.minimum_education_required),
      mainSkillOrSpecialization: toNullableString(jobData.main_skill_desired),
      yearsOfExperienceRequired:
        jobData.years_of_experience_required !== null && jobData.years_of_experience_required !== undefined
          ? String(jobData.years_of_experience_required)
          : null,
      agePreferenceMin: jobData.age_preference_min ?? null,
      agePreferenceMax: jobData.age_preference_max ?? null,
      location,
      city: toNullableString(empData?.city),
      province: toNullableString(empData?.province),
      employmentType: toNullableString(jobData.work_setup),
      startingSalary: toNullableString(jobData.starting_salary),
      vacancies: jobData.vacancies ?? null,
      jobStatus: toNullableString(jobData.job_status),
      category: toNullableString(jobData.category),
      psocCode: jobData.psoc_code ?? null,
      featured: Boolean(jobData.featured),
      slotsRemaining: jobData.slots_remaining ?? null,
      jobEmbedding: jobData.job_embedding ?? null,
      publishedAt: jobData.created_at ?? null,
      createdAt: jobData.created_at ?? null,
      updatedAt: jobData.updated_at ?? null,
      applicationsCount: countResult.count ?? 0,
      hasApplied,
      applicationStatus,
      isSaved,
      ...contactInfo,
    };

    return NextResponse.json(
      response,
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