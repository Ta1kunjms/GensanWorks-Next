import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireJobseeker() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "jobseeker";
}

export async function GET(req: Request) {
  try {
    if (!(await requireJobseeker())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    let query = supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, location, city, province, employment_type, salary_min, salary_max, salary_period, created_at, employer_id",
        { count: "exact" }
      )
      .eq("status", "active")
      .eq("is_published", true)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(
        `position_title.ilike.%${q}%,location.ilike.%${q}%,employers.establishment_name.ilike.%${q}%`
      );
    }

    const result = await query;
    const jobs = result.data ?? [];

    const enriched = await Promise.all(
      jobs.map(async (job: Record<string, unknown>) => {
        let establishmentName: string | null = null;
        if (job.employer_id) {
          const emp = await supabaseAdmin
            .from("employers")
            .select("establishment_name")
            .eq("id", String(job.employer_id))
            .single();
          establishmentName = emp.data?.establishment_name ?? null;
        }
        return {
          id: job.id,
          positionTitle: job.position_title,
          location: job.location,
          city: job.city,
          province: job.province,
          employmentType: job.employment_type,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          salaryPeriod: job.salary_period,
          createdAt: job.created_at,
          employerId: job.employer_id,
          establishmentName,
        };
      })
    );

    return NextResponse.json({ jobs: enriched });
  } catch (error) {
    console.error("Jobseeker jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}