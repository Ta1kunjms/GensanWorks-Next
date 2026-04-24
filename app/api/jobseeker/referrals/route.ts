import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as { role?: string; id?: string } | undefined;
    
    if (user?.role !== "jobseeker" || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("referrals")
      .select(`
        *,
        jobs!inner(
          id,
          position_title,
          employment_type,
          starting_salary,
          employers!inner(establishment_name, city, province)
        )
      `)
      .eq("jobseeker_id", user.id)
      .order("date_referred", { ascending: false });

    if (error) {
      console.error("Referrals fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
    }

    const referrals = (data ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      dateReferred: r.date_referred,
      job: {
        id: r.jobs.id,
        positionTitle: r.jobs.position_title,
        employmentType: r.jobs.employment_type,
        startingSalary: r.jobs.starting_salary,
        employerName: r.jobs.employers.establishment_name,
        location: `${r.jobs.employers.city}, ${r.jobs.employers.province}`
      },
      applicationId: r.application_id
    }));

    return NextResponse.json({ referrals });
  } catch (error) {
    console.error("Referrals API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
