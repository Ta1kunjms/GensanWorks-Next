import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationsTable, employersTable, jobsTable, usersTable } from "@/db/schema";

type TrendPoint = {
  month: string;
  jobs: number;
  applications: number;
};

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

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(date));
  }
  return months;
}

function formatMonthLabel(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? month : new Date().getMonth() + 1;
  const date = new Date(safeYear, safeMonth - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [usersCount, employersCount, jobsCount, applicationsCount, jobs, applications] =
      await Promise.all([
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
        db
          .select({ createdAt: jobsTable.createdAt, status: jobsTable.status })
          .from(jobsTable),
        db
          .select({ createdAt: applicationsTable.createdAt, status: applicationsTable.status })
          .from(applicationsTable),
      ]);

    const jobStatusCounts = JOB_STATUSES.map((status) => ({
      status,
      count: jobs.filter((item) => item.status === status).length,
    }));

    const applicationStatusCounts = APPLICATION_STATUSES.map((status) => ({
      status,
      count: applications.filter((item) => item.status === status).length,
    }));

    const monthKeys = getLastMonths(6);
    const trendsMap = new Map<string, TrendPoint>();

    monthKeys.forEach((monthKey) => {
      trendsMap.set(monthKey, { month: formatMonthLabel(monthKey), jobs: 0, applications: 0 });
    });

    jobs.forEach((item) => {
      if (!item.createdAt) return;
      const key = getMonthKey(new Date(item.createdAt));
      const trend = trendsMap.get(key);
      if (trend) {
        trend.jobs += 1;
      }
    });

    applications.forEach((item) => {
      if (!item.createdAt) return;
      const key = getMonthKey(new Date(item.createdAt));
      const trend = trendsMap.get(key);
      if (trend) {
        trend.applications += 1;
      }
    });

    const monthlyTrends = monthKeys
      .map((key) => trendsMap.get(key))
      .filter((item): item is TrendPoint => Boolean(item));

    return NextResponse.json({
      overview: {
        usersCount,
        employersCount,
        jobsCount,
        applicationsCount,
      },
      jobStatusCounts,
      applicationStatusCounts,
      monthlyTrends,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
