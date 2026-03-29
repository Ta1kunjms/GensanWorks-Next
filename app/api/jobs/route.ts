import { NextRequest, NextResponse } from "next/server";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { jobsTable, employersTable } from "@/db/schema";

/**
 * GET /api/jobs
 * Public endpoint to list all published jobs with search, filters, and pagination
 * No authentication required
 */

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
    // Rate limit: 60 requests per minute per IP
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

    const {
      limit,
      offset,
      search,
      location,
      employmentType,
      salaryMin,
      salaryMax,
      city,
      sortBy,
    } = parsed.data;

    // Build where conditions
    const conditions = [
      eq(jobsTable.isPublished, true),
      eq(jobsTable.archived, false),
      eq(jobsTable.status, "active"),
    ];

    if (search) {
      conditions.push(
        sql`(${jobsTable.positionTitle} ILIKE ${"%" + search + "%"} OR ${jobsTable.description} ILIKE ${"%" + search + "%"})`
      );
    }

    if (location) {
      conditions.push(ilike(jobsTable.location, `%${location}%`));
    }

    if (city) {
      conditions.push(ilike(jobsTable.city, `%${city}%`));
    }

    if (employmentType) {
      conditions.push(eq(jobsTable.employmentType, employmentType));
    }

    if (salaryMin !== undefined) {
      conditions.push(
        sql`CAST(${jobsTable.salaryMax} AS NUMERIC) >= ${salaryMin}`
      );
    }

    if (salaryMax !== undefined) {
      conditions.push(
        sql`CAST(${jobsTable.salaryMin} AS NUMERIC) <= ${salaryMax}`
      );
    }

    // Build order by
    let orderBy;
    switch (sortBy) {
      case "salary_high":
        orderBy = desc(jobsTable.salaryMax);
        break;
      case "salary_low":
        orderBy = sql`${jobsTable.salaryMin} ASC`;
        break;
      case "recent":
      default:
        orderBy = desc(jobsTable.publishedAt);
        break;
    }

    // Fetch jobs with employer info
    const jobs = await db
      .select({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        description: jobsTable.description,
        employmentType: jobsTable.employmentType,
        location: jobsTable.location,
        city: jobsTable.city,
        province: jobsTable.province,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        salaryPeriod: jobsTable.salaryPeriod,
        vacancies: jobsTable.vacancies,
        requiredSkills: jobsTable.requiredSkills,
        educationLevel: jobsTable.educationLevel,
        yearsExperience: jobsTable.yearsExperience,
        isRemote: jobsTable.isRemote,
        publishedAt: jobsTable.publishedAt,
        employerName: employersTable.establishmentName,
        employerId: employersTable.id,
      })
      .from(jobsTable)
      .leftJoin(employersTable, eq(jobsTable.employerId, employersTable.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Fetch total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobsTable)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

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
