import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

const jobsQuerySchema = z.object({
  limit: z.string().pipe(z.coerce.number().min(1).max(100)).default("10"),
  offset: z.string().pipe(z.coerce.number().min(0)).default("0"),
  search: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  employmentType: z
    .enum(["Full-time", "Part-time", "Contract", "Temporary", "Freelance", "Internship"])
    .optional(),
  salaryMin: z.string().pipe(z.coerce.number().min(0)).optional(),
  salaryMax: z.string().pipe(z.coerce.number().min(0)).optional(),
  city: z.string().max(100).optional(),
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
      employmentType: getParam("employmentType"),
      salaryMin: getParam("salaryMin"),
      salaryMax: getParam("salaryMax"),
      city: getParam("city"),
      sortBy: getParam("sortBy"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const { limit, offset, search, location, employmentType, salaryMin, salaryMax, city, sortBy } = parsed.data;

    let query = supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, employment_type, city, province, starting_salary, vacancies, is_active, archived, created_at, employers!inner(id, establishment_name)",
        { count: "exact" }
      )
      .eq("is_active", true)
      .eq("archived", false)
      // Compatibility with both job_status (SQL/Generator) and status (Admin portal)
      .or("job_status.eq.Open,status.eq.active")
      .order(sortBy === "recent" ? "created_at" : "position_title", {
        ascending: sortBy !== "recent",
        nullsFirst: false,
      })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`position_title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }
    if (city) {
      query = query.ilike("city", `%${city}%`);
    }
    if (employmentType) {
      query = query.eq("employment_type", employmentType);
    }

    const result = await query;
    const rows = result.data ?? [];

    let total = result.count ?? 0;

    if (result.error && total === 0) {
      const countResult = await supabaseAdmin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("archived", false)
        .eq("job_status", "Open");
      total = countResult.count ?? 0;
    }

    const jobs = rows.map((job: Record<string, unknown>) => ({
      id: job.id,
      positionTitle: job.position_title,
      employmentType: job.employment_type,
      city: job.city,
      province: job.province,
      startingSalary: job.starting_salary,
      vacancies: job.vacancies,
      createdAt: job.created_at,
      employerName: ((job.employers as unknown) as Record<string, unknown>)?.establishment_name,
      employerId: ((job.employers as unknown) as Record<string, unknown>)?.id,
    }));

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