export const dynamic = "force-dynamic";
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

    // 1. Get user preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("jobseekers")
      .select("preferred_occupation_1, preferred_occupation_2, preferred_occupation_3, city, province")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const preferences = [
      profile.preferred_occupation_1,
      profile.preferred_occupation_2,
      profile.preferred_occupation_3
    ].filter(Boolean);

    if (preferences.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    // 2. Search for matching jobs
    // We'll use a simple ILIKE search for each preference
    // In a real app, this would use pg_trgm or FTS
    let query = supabaseAdmin
      .from("jobs")
      .select(`
        id, position_title, work_setup, starting_salary, created_at,
        employers!inner(establishment_name, city, province)
      `)
      .eq("is_active", true)
      .or("job_status.eq.Open,job_status.eq.open");

    // Build the OR filter for preferences
    const orFilter = preferences
      .map(pref => `position_title.ilike.%${pref}%,main_skill_desired.ilike.%${pref}%`)
      .join(",");
    
    query = query.or(orFilter);

    // Prioritize same city/province
    const { data: jobs, error: jobsError } = await query
      .limit(10)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Recommendations fetch error:", jobsError);
      return NextResponse.json({ jobs: [] });
    }

    const formattedJobs = (jobs ?? []).map((j: any) => ({
      id: j.id,
      positionTitle: j.position_title,
      employmentType: j.work_setup || "Full-time",
      startingSalary: j.starting_salary,
      createdAt: j.created_at,
      employerName: j.employers.establishment_name,
      city: j.employers.city,
      province: j.employers.province
    }));

    // Sort by location relevance (simple)
    const sortedJobs = formattedJobs.sort((a, b) => {
      const aLocationMatch = a.city === profile.city || a.province === profile.province;
      const bLocationMatch = b.city === profile.city || b.province === profile.province;
      if (aLocationMatch && !bLocationMatch) return -1;
      if (!aLocationMatch && bLocationMatch) return 1;
      return 0;
    });

    return NextResponse.json({ jobs: sortedJobs });
  } catch (error) {
    console.error("Error in recommendations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
