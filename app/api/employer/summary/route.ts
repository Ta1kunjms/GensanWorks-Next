import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationsTable, jobsTable } from "@/db/schema";

async function getEmployerId() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "employer" || !user.id) return null;
  return user.id;
}

export async function GET() {
  try {
    const employerId = await getEmployerId();
    if (!employerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [jobsCount, activeJobsCount, applicationsCount, pendingApplicationsCount] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(jobsTable)
          .where(eq(jobsTable.employerId, employerId))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(jobsTable)
          .where(and(eq(jobsTable.employerId, employerId), eq(jobsTable.status, "active")))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(applicationsTable)
          .where(eq(applicationsTable.employerId, employerId))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(applicationsTable)
          .where(
            and(
              eq(applicationsTable.employerId, employerId),
              eq(applicationsTable.status, "pending")
            )
          )
          .then((rows) => Number(rows[0]?.count ?? 0)),
      ]);

    return NextResponse.json({
      jobsCount,
      activeJobsCount,
      applicationsCount,
      pendingApplicationsCount,
    });
  } catch (error) {
    console.error("Employer summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
