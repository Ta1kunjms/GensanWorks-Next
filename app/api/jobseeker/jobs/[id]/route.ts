export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionContext() {
  const session = await auth();
  const role = (session?.user as { role?: string; id?: string } | undefined)?.role;
  const applicantId = (session?.user as { role?: string; id?: string } | undefined)?.id;
  return { isJobseeker: role === "jobseeker", applicantId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isJobseeker, applicantId } = await getSessionContext();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const jobResult = await supabaseAdmin
      .from("jobs")
      .select(
        "id, employer_id, position_title, description, responsibilities, qualifications, location, city, province, employment_type, salary_min, salary_max, salary_period, vacancies, required_skills, preferred_skills, benefits, created_at, employers!inner(establishment_name)"
      )
      .eq("id", id)
      .eq("status", "active")
      .eq("is_published", true)
      .eq("archived", false)
      .single();

    const job = jobResult.data;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const applicationResult = await supabaseAdmin
      .from("applications")
      .select("id, status")
      .eq("job_id", id)
      .eq("applicant_id", applicantId)
      .single();

    const existingApplication = applicationResult.data;

    return NextResponse.json({
      job: {
        id: job.id,
        employerId: job.employer_id,
        positionTitle: job.position_title,
        description: job.description,
        responsibilities: job.responsibilities,
        qualifications: job.qualifications,
        location: job.location,
        city: job.city,
        province: job.province,
        employmentType: job.employment_type,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryPeriod: job.salary_period,
        vacancies: job.vacancies,
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills,
        benefits: job.benefits,
        createdAt: job.created_at,
        establishmentName: (job.employers as unknown as Record<string, unknown>)?.establishment_name ?? null,
      },
      hasApplied: Boolean(existingApplication),
      applicationStatus: existingApplication?.status ?? null,
    });
  } catch (error) {
    console.error("Jobseeker job detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}