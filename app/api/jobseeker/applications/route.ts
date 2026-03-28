import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tryCreateNotification } from "@/lib/notifications";
import { applicationsTable, employersTable, jobsTable, usersTable } from "@/db/schema";

const applySchema = z
  .object({
    jobId: z.string().uuid(),
    coverLetter: z.string().max(5000).optional(),
    resumeUrl: z.string().max(500).optional(),
  })
  .strict();

async function getJobseekerSession() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string; email?: string; name?: string } | undefined;
  return {
    isJobseeker: user?.role === "jobseeker",
    applicantId: user?.id,
    applicantEmail: user?.email,
    applicantName: user?.name,
  };
}

export async function GET() {
  try {
    const { isJobseeker, applicantId } = await getJobseekerSession();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await db
      .select({
        id: applicationsTable.id,
        status: applicationsTable.status,
        submittedAt: applicationsTable.submittedAt,
        reviewedAt: applicationsTable.reviewedAt,
        feedback: applicationsTable.feedback,
        interviewDate: applicationsTable.interviewDate,
        jobId: applicationsTable.jobId,
        positionTitle: jobsTable.positionTitle,
        location: jobsTable.location,
        employerName: employersTable.establishmentName,
      })
      .from(applicationsTable)
      .leftJoin(jobsTable, eq(jobsTable.id, applicationsTable.jobId))
      .leftJoin(employersTable, eq(employersTable.id, applicationsTable.employerId))
      .where(eq(applicationsTable.applicantId, applicantId))
      .orderBy(desc(applicationsTable.submittedAt));

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Jobseeker applications list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isJobseeker, applicantId, applicantEmail, applicantName } = await getJobseekerSession();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = applySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [job] = await db
      .select({
        id: jobsTable.id,
        employerId: jobsTable.employerId,
        positionTitle: jobsTable.positionTitle,
        status: jobsTable.status,
        isPublished: jobsTable.isPublished,
        archived: jobsTable.archived,
      })
      .from(jobsTable)
      .where(eq(jobsTable.id, parsed.data.jobId))
      .limit(1);

    if (!job || job.status !== "active" || !job.isPublished || job.archived) {
      return NextResponse.json({ error: "Job is not available for application" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: applicationsTable.id })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.applicantId, applicantId),
          eq(applicationsTable.jobId, parsed.data.jobId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "You already applied to this job" }, { status: 409 });
    }

    const [userProfile] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, applicantId))
      .limit(1);

    const [created] = await db
      .insert(applicationsTable)
      .values({
        jobId: parsed.data.jobId,
        applicantId,
        employerId: job.employerId,
        applicantName: userProfile?.name ?? applicantName ?? null,
        applicantEmail: userProfile?.email ?? applicantEmail ?? null,
        coverLetter: parsed.data.coverLetter?.trim() || null,
        resumeUrl: parsed.data.resumeUrl?.trim() || null,
        status: "pending",
      })
      .returning({
        id: applicationsTable.id,
        jobId: applicationsTable.jobId,
        status: applicationsTable.status,
        submittedAt: applicationsTable.submittedAt,
      });

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create application" },
        { status: 500 }
      );
    }

    // Notify jobseeker immediately for confirmation.
    await tryCreateNotification({
      userId: applicantId,
      role: "jobseeker",
      type: "application",
      title: "Application Submitted",
      message: `Your application for ${job.positionTitle} was submitted successfully.`,
      relatedId: created.id,
      relatedType: "application",
    });

    // Notify employer about a new applicant (best effort).
    await tryCreateNotification({
      userId: job.employerId,
      role: "employer",
      type: "application",
      title: "New Job Application",
      message: `${userProfile?.name ?? applicantName ?? "A candidate"} applied for ${job.positionTitle}.`,
      relatedId: created.id,
      relatedType: "application",
    });

    return NextResponse.json({ message: "Application submitted", application: created }, { status: 201 });
  } catch (error) {
    console.error("Job application submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
