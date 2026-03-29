import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationsTable, employersTable, jobsTable, usersTable } from "@/db/schema";

const APPLICATION_STATUSES = [
  "pending",
  "reviewed",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "withdrawn",
] as const;

const JOB_STATUSES = ["draft", "pending", "active", "closed", "archived"] as const;

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function csvEscape(value: string | number | undefined): string {
  const raw = String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [usersCount, employersCount, jobsCount, applicationsCount, jobs, applications] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(employersTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(jobsTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(applicationsTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db.select({ status: jobsTable.status }).from(jobsTable),
      db.select({ status: applicationsTable.status }).from(applicationsTable),
    ]);

    const jobStatusRows = JOB_STATUSES.map((status) => [status, jobs.filter((job) => job.status === status).length]);
    const applicationStatusRows = APPLICATION_STATUSES.map((status) => [
      status,
      applications.filter((app) => app.status === status).length,
    ]);

    const lines: string[] = [];
    lines.push(["section", "metric", "value"].map(csvEscape).join(","));
    lines.push(["overview", "usersCount", usersCount].map(csvEscape).join(","));
    lines.push(["overview", "employersCount", employersCount].map(csvEscape).join(","));
    lines.push(["overview", "jobsCount", jobsCount].map(csvEscape).join(","));
    lines.push(["overview", "applicationsCount", applicationsCount].map(csvEscape).join(","));

    jobStatusRows.forEach(([status, count]) => {
      lines.push(["jobStatus", status, count].map(csvEscape).join(","));
    });

    applicationStatusRows.forEach(([status, count]) => {
      lines.push(["applicationStatus", status, count].map(csvEscape).join(","));
    });

    const now = new Date();
    const filename = `admin-analytics-${now.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(`${lines.join("\n")}\n`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin analytics export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
