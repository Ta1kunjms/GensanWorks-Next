import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Fetch unique cities and provinces from employers who have active jobs
    const { data: locationsData, error: locationsError } = await supabaseAdmin
      .from("jobs")
      .select("employers(city, province)")
      .eq("is_active", true)
      .eq("archived", false)
      .eq("job_status", "active");

    if (locationsError) throw locationsError;

    const locations = new Set<string>();
    locationsData?.forEach((job: any) => {
      if (job.employers?.city) locations.add(job.employers.city);
      if (job.employers?.province) locations.add(job.employers.province);
    });

    // Fetch unique work types from active jobs
    const { data: typesData, error: typesError } = await supabaseAdmin
      .from("jobs")
      .select("work_type")
      .eq("is_active", true)
      .eq("archived", false)
      .eq("job_status", "active");

    if (typesError) throw typesError;

    const workTypes = new Set<string>();
    typesData?.forEach((job: any) => {
      if (job.work_type) workTypes.add(job.work_type);
    });

    return NextResponse.json({
      locations: Array.from(locations).sort(),
      workTypes: Array.from(workTypes).sort(),
    });
  } catch (error) {
    console.error("[GET /api/jobs/filters] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
