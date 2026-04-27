export const dynamic = "force-dynamic";
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
    const q = searchParams.get("q")?.trim() ?? searchParams.get("search")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
    const type = searchParams.get("type") ?? "";
    const location = searchParams.get("location") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "recent";

    // Use a join to eliminate the N+1 employer lookup
    let query = supabaseAdmin
      .from("jobs")
      .select(
        `id, position_title, work_setup,
         starting_salary, vacancies, created_at, employer_id,
         employers!inner(id, establishment_name, city, province)`,
        { count: "exact" }
      )
      // Support both old schema (job_status/is_active) and new (status/is_published)
      .or("job_status.eq.Open,status.eq.active")
      .eq("is_active", true)
      .eq("archived", false)
      .range(offset, offset + limit - 1);

    // Apply sort
    if (sortBy === "salary_high") {
      // salary_max doesn't exist, sort by starting_salary (though it's text, this is best effort or we default to created_at)
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply text search
    if (q) {
      query = query.or(`position_title.ilike.%${q}%`);
    }

    // Apply type filter
    if (type) {
      query = query.ilike("work_setup", `%${type}%`);
    }

    // Apply location filter (search via employers table)
    if (location) {
      query = query.or(`city.ilike.%${location}%,province.ilike.%${location}%`, { foreignTable: "employers" });
    }

    const result = await query;
    const rows = result.data ?? [];
    const total = result.count ?? 0;

    const jobs = rows.map((job: Record<string, unknown>) => {
      const employer = job.employers as Record<string, unknown> | null;
      const city = employer?.city as string | null;
      const province = employer?.province as string | null;
      
      return {
        id: job.id,
        positionTitle: job.position_title,
        location: [city, province].filter(Boolean).join(", ") || null,
        city: city,
        province: province,
        employmentType: job.work_setup,
        startingSalary: job.starting_salary,
        salaryMin: null,
        salaryMax: null,
        salaryPeriod: null,
        vacancies: job.vacancies,
        createdAt: job.created_at,
        employerId: employer?.id ?? job.employer_id,
        establishmentName: employer?.establishment_name ?? null,
        // Dashboard-compat alias
        employerName: employer?.establishment_name ?? null,
      };
    });

    return NextResponse.json({
      jobs,
      data: jobs, // alias for browse page compatibility
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Jobseeker jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}