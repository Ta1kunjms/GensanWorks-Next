import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

const jobsQuerySchema = z.object({
  limit: z.string().pipe(z.coerce.number().min(1).max(100)).default("10"),
  offset: z.string().pipe(z.coerce.number().min(0)).default("0"),
  search: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  // work_setup is the actual DB column (onsite, remote, hybrid, etc.)
  type: z.string().max(100).optional(),
  sortBy: z.enum(["recent", "salary_high", "salary_low"]).default("recent"),
});

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = enforceRateLimit({
      key: `jobs:list:${clientIp}`,
      maxRequests: 60,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limited" },
        {
          status: 429,
          headers: {
            "X-Request-ID": getRequestId(request),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetInSeconds),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const getParam = (key: string): string | undefined => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };
    const parsed = jobsQuerySchema.safeParse({
      limit: getParam("limit"),
      offset: getParam("offset"),
      search: getParam("search"),
      location: getParam("location"),
      type: getParam("type"),
      sortBy: getParam("sortBy"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const { limit, offset, search, location, type, sortBy } = parsed.data;

    // city & province come from the employers join; work_setup is the actual column for employment type
    let query = supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, work_setup, starting_salary, vacancies, is_active, archived, created_at, main_skill_desired, employers!inner(id, establishment_name, city, province)",
        { count: "exact" }
      )
      .eq("is_active", true)
      .eq("archived", false)
      // job_status is the only status column in the jobs table
      .or("job_status.eq.Open,job_status.eq.open")
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("position_title", `%${search}%`);
    }
    if (location) {
      // Filter by city or province in the joined employers table
      query = query.or(`city.ilike.%${location}%,province.ilike.%${location}%`, { foreignTable: 'employers' });
    }
    if (type) {
      query = query.ilike("work_setup", `%${type}%`);
    }

    const result = await query;

    if (result.error) {
      console.error("[GET /api/jobs] Supabase query error:", result.error);
      return NextResponse.json(
        { error: "Failed to fetch jobs", details: result.error.message },
        { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const rows = result.data ?? [];
    const total = result.count ?? 0;

    const jobs = rows.map((job: Record<string, unknown>) => {
      const employer = (job.employers as unknown) as Record<string, unknown> | null;
      return {
        id: job.id,
        positionTitle: job.position_title,
        employmentType: job.work_setup,   // work_setup maps to employmentType for the frontend
        city: employer?.city ?? null,
        province: employer?.province ?? null,
        startingSalary: job.starting_salary,
        vacancies: job.vacancies,
        createdAt: job.created_at,
        requiredSkills: job.main_skill_desired,
        employerName: employer?.establishment_name ?? null,
        employerId: employer?.id ?? null,
      };
    });

    return NextResponse.json(
      {
        data: jobs,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit),
          hasMore: offset + limit < total,
        },
      },
      { headers: { "X-Request-ID": getRequestId(request) } }
    );
  } catch (error) {
    console.error("[GET /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
    );
  }
}