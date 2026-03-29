import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { jobsTable, applicationsTable, usersTable } from "@/db/schema";

/**
 * POST /api/jobs/[id]/apply
 * Submit an application for a job
 * Requires authentication as jobseeker
 * Rate limited: 10 applications per day per user
 */

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().max(500).optional(),
});

type SessionUser = {
  id?: string;
  role?: "admin" | "employer" | "jobseeker";
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - must be logged in" },
        { status: 401, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Check user role from session
    const userRole = (session.user as SessionUser).role;
    if (userRole !== "jobseeker") {
      return NextResponse.json(
        { error: "Only jobseekers can apply for jobs" },
        { status: 403, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Rate limiting check: 10 applications per day per user
    const rateLimitResult = enforceRateLimit({
      key: `apply:${session.user.id}:daily`,
      maxRequests: 10,
      windowMs: 86400000, // 24 hours
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limited - maximum 10 applications per day" },
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

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const { coverLetter, resumeUrl } = parsed.data;

    // Check if job exists and is published
    const job = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId))
      .limit(1);

    const jobData = job?.[0];

    if (!jobData?.id) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    if (!jobData.isPublished || jobData.archived) {
      return NextResponse.json(
        { error: "This job is no longer available" },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Check if user already applied
    const existingApp = await db
      .select()
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.jobId, jobId),
          eq(applicationsTable.applicantId, session.user.id!)
        )
      );

    if (existingApp && existingApp.length > 0) {
      return NextResponse.json(
        { error: "You have already applied for this job" },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Get applicant info
    const applicant = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1);

    const applicantData = applicant?.[0];

    if (!applicantData?.id) {
      return NextResponse.json(
        { error: "Applicant info not found" },
        { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    // Create application
    const application = await db
      .insert(applicationsTable)
      .values({
        jobId,
        applicantId: session.user.id,
        employerId: jobData.employerId,
        applicantName: applicantData.name,
        applicantEmail: applicantData.email,
        coverLetter: coverLetter || null,
        resumeUrl: resumeUrl || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully",
        application: application[0],
      },
      { headers: { "X-Request-ID": getRequestId(request) } }
    );
  } catch (error) {
    console.error("[POST /api/jobs/[id]/apply] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
    );
  }
}
