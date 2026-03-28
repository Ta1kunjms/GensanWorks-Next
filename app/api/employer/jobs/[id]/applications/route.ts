import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationsTable, jobsTable, usersTable } from "@/db/schema";

async function getEmployerId() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "employer" || !user.id) return null;
  return user.id;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [job] = await db
      .select({ id: jobsTable.id, positionTitle: jobsTable.positionTitle })
      .from(jobsTable)
      .where(and(eq(jobsTable.id, id), eq(jobsTable.employerId, employerId)))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const applications = await db
      .select({
        id: applicationsTable.id,
        applicantId: applicationsTable.applicantId,
        applicantName: applicationsTable.applicantName,
        applicantEmail: applicationsTable.applicantEmail,
        status: applicationsTable.status,
        submittedAt: applicationsTable.submittedAt,
        coverLetter: applicationsTable.coverLetter,
        resumeUrl: applicationsTable.resumeUrl,
        feedback: applicationsTable.feedback,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userPhone: usersTable.phone,
        userCity: usersTable.city,
        userProvince: usersTable.province,
        userCurrentOccupation: usersTable.currentOccupation,
        userEducationLevel: usersTable.educationLevel,
        userSkills: usersTable.skills,
        userPreferredLocations: usersTable.preferredLocations,
      })
      .from(applicationsTable)
      .leftJoin(usersTable, eq(usersTable.id, applicationsTable.applicantId))
      .where(
        and(eq(applicationsTable.jobId, id), eq(applicationsTable.employerId, employerId))
      )
      .orderBy(desc(applicationsTable.submittedAt));

    return NextResponse.json({ job, applications });
  } catch (error) {
    console.error("Employer job applications list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
