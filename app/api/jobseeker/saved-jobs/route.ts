import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function getJobseekerId() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "jobseeker") return null;
  return user.id;
}

export async function GET() {
  try {
    const jobseekerId = await getJobseekerId();
    if (!jobseekerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("jobseeker_saved_jobs")
      .select(`
        id,
        created_at,
        job_id,
        jobs!inner(
          id,
          position_title,
          location,
          city,
          province,
          employment_type,
          starting_salary,
          salary_min,
          salary_max,
          salary_period,
          employers!inner(establishment_name)
        )
      `)
      .eq("jobseeker_id", jobseekerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const savedJobs = (data || []).map((item: any) => {
      const job = item.jobs;
      const employer = job.employers;
      return {
        savedId: item.id,
        savedAt: item.created_at,
        ...job,
        establishmentName: employer?.establishment_name || "Unknown Employer",
        location: job.location || [job.city, job.province].filter(Boolean).join(", ") || "General Santos City",
      };
    });

    return NextResponse.json({ savedJobs });
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const jobseekerId = await getJobseekerId();
    if (!jobseekerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("jobseeker_saved_jobs")
      .upsert({ jobseeker_id: jobseekerId, job_id: jobId }, { onConflict: "jobseeker_id,job_id" });

    if (error) throw error;

    return NextResponse.json({ message: "Job saved successfully" });
  } catch (error) {
    console.error("Error saving job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const jobseekerId = await getJobseekerId();
    if (!jobseekerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("jobseeker_saved_jobs")
      .delete()
      .eq("jobseeker_id", jobseekerId)
      .eq("job_id", jobId);

    if (error) throw error;

    return NextResponse.json({ message: "Job removed from saved list" });
  } catch (error) {
    console.error("Error removing saved job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
