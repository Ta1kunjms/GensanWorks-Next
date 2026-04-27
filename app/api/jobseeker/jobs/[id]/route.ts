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
        "id, employer_id, position_title, description, work_setup, starting_salary, vacancies, main_skill_desired, created_at, employers!inner(establishment_name, city, province)"
      )
      .eq("id", id)
      .or("job_status.eq.Open,job_status.eq.open")
      .eq("is_active", true)
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
        responsibilities: null,
        qualifications: null,
        // location fields are now derived from employer join
        city: (job.employers as any)?.city ?? null,
        province: (job.employers as any)?.province ?? null,
        employmentType: job.work_setup,
        startingSalary: job.starting_salary,
        vacancies: job.vacancies,
        requiredSkills: job.main_skill_desired,
        preferredSkills: null,
        benefits: null,
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