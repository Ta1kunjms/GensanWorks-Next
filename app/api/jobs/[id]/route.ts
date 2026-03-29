import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { enforceRateLimit, getRequestId, getClientIp } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { jobsTable, employersTable, applicationsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

/**
 * GET /api/jobs/[id]
 * Public endpoint to get a specific job detail
 * No authentication required, but includes employer contact if authenticated
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Rate limit: 60 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = enforceRateLimit({
      key: `jobs:detail:${clientIp}`,
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

    // Fetch job with employer info
    const job = await db
      .select({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        description: jobsTable.description,
        responsibilities: jobsTable.responsibilities,
        qualifications: jobsTable.qualifications,
        employmentType: jobsTable.employmentType,
        location: jobsTable.location,
        city: jobsTable.city,
        province: jobsTable.province,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        salaryPeriod: jobsTable.salaryPeriod,
        vacancies: jobsTable.vacancies,
        startDate: jobsTable.startDate,
        endDate: jobsTable.endDate,
        requiredSkills: jobsTable.requiredSkills,
        preferredSkills: jobsTable.preferredSkills,
        educationLevel: jobsTable.educationLevel,
        yearsExperience: jobsTable.yearsExperience,
        minimumAge: jobsTable.minimumAge,
        maximumAge: jobsTable.maximumAge,
        benefits: jobsTable.benefits,
        workSchedule: jobsTable.workSchedule,
        reportingTo: jobsTable.reportingTo,
        isRemote: jobsTable.isRemote,
        isPublished: jobsTable.isPublished,
        archived: jobsTable.archived,
        publishedAt: jobsTable.publishedAt,
        employerName: employersTable.establishmentName,
        employerEmail: employersTable.email,
        employerId: employersTable.id,
        employerContactPerson: employersTable.contactPerson,
        employerContactPhone: employersTable.contactPhone,
      })
      .from(jobsTable)
      .leftJoin(employersTable, eq(jobsTable.employerId, employersTable.id))
      .where(eq(jobsTable.id, jobId))
      .limit(1);

    const jobData = job?.[0];

    if (!jobData?.id) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Check if job is published (public jobs only)
    if (!jobData.isPublished || jobData.archived) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Get application count
    const appCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(applicationsTable)
      .where(eq(applicationsTable.jobId, jobId));

    // If authenticated, include full employer contact info, otherwise omit
    const session = await auth();
    const contactInfo =
      session && session.user
        ? {
            employerEmail: jobData.employerEmail,
            employerContactPerson: jobData.employerContactPerson,
            employerContactPhone: jobData.employerContactPhone,
          }
        : {};

    return NextResponse.json(
      {
        ...jobData,
        applicationsCount: Number(appCount[0]?.count ?? 0),
        ...contactInfo,
      },
      { headers: { "X-Request-ID": getRequestId(request) } }
    );
  } catch (error) {
    console.error("[GET /api/jobs/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
    );
  }
}
