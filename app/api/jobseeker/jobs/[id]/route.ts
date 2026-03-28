import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationsTable, employersTable, jobsTable } from "@/db/schema";

async function getSessionContext() {
  const session = await auth();
  const role = (session?.user as { role?: string; id?: string } | undefined)?.role;
  const applicantId = (session?.user as { role?: string; id?: string } | undefined)?.id;
  return {
    isJobseeker: role === "jobseeker",
    applicantId,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isJobseeker, applicantId } = await getSessionContext();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [job] = await db
      .select({
        id: jobsTable.id,
        employerId: jobsTable.employerId,
        positionTitle: jobsTable.positionTitle,
        description: jobsTable.description,
        responsibilities: jobsTable.responsibilities,
        qualifications: jobsTable.qualifications,
        location: jobsTable.location,
        city: jobsTable.city,
        province: jobsTable.province,
        employmentType: jobsTable.employmentType,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        salaryPeriod: jobsTable.salaryPeriod,
        vacancies: jobsTable.vacancies,
        requiredSkills: jobsTable.requiredSkills,
        preferredSkills: jobsTable.preferredSkills,
        benefits: jobsTable.benefits,
        createdAt: jobsTable.createdAt,
        establishmentName: employersTable.establishmentName,
      })
      .from(jobsTable)
      .leftJoin(employersTable, eq(employersTable.id, jobsTable.employerId))
      .where(
        and(
          eq(jobsTable.id, id),
          eq(jobsTable.status, "active"),
          eq(jobsTable.isPublished, true),
          eq(jobsTable.archived, false)
        )
      )
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const [existingApplication] = await db
      .select({ id: applicationsTable.id, status: applicationsTable.status })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.jobId, job.id),
          eq(applicationsTable.applicantId, applicantId)
        )
      )
      .limit(1);

    return NextResponse.json({
      job,
      hasApplied: Boolean(existingApplication),
      applicationStatus: existingApplication?.status ?? null,
    });
  } catch (error) {
    console.error("Jobseeker job detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
