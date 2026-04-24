import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const user = session?.user as { role?: string; id?: string } | undefined;
    
    if (user?.role !== "jobseeker" || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from("applications")
      .select(`
        *,
        jobs!inner(
          *,
          employers!inner(*)
        )
      `)
      .eq("id", id)
      .eq("applicant_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Map snake_case to camelCase for the frontend
    const application = {
      ...data,
      submittedAt: data.submitted_at,
      reviewedAt: data.reviewed_at,
      interviewDate: data.interview_date,
      coverLetter: data.cover_letter,
      resumeUrl: data.resume_url,
      job: {
        ...data.jobs,
        positionTitle: data.jobs.position_title,
        employmentType: data.jobs.employment_type,
        employer: {
          ...data.jobs.employers,
          establishmentName: data.jobs.employers.establishment_name,
        }
      }
    };

    return NextResponse.json({ application });
  } catch (error) {
    console.error("Error fetching application details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
