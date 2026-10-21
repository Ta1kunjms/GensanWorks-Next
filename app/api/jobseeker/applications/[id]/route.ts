export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const user = session?.user as { role?: string; id?: string } | undefined;
    
    if (user?.role !== "jobseeker" || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("applications")
      .select(`
        *,
        jobs!inner(
          *,
          employers!inner(id, establishment_name, industry, city, province, address, contact_person, contact_phone, profile_image)
        )
      `)
      .eq("id", id)
      .eq("jobseeker_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Map snake_case to camelCase for the frontend
    const application = {
      ...data,
      submittedAt: data.submitted_at,
      reviewedAt: data.reviewed_at,
      interviewDate: data.interview_date,
      coverLetter: null,
      resumeUrl: null,
      job: {
        positionTitle: data.jobs.position_title,
        employmentType: data.jobs.work_setup,
        city: data.jobs.employers?.city ?? null,
        province: data.jobs.employers?.province ?? null,
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
