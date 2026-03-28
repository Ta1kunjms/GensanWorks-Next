import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  adminAccessRequestsTable,
  applicationsTable,
  employersTable,
  jobsTable,
  usersTable,
} from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      usersCount,
      employersCount,
      jobsCount,
      applicationsCount,
      pendingEmployerCount,
      pendingAdminRequests,
      pendingJobs,
    ] = await Promise.all([
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
        .select({ count: sql<number>`count(*)` })
        .from(employersTable)
        .where(sql`${employersTable.accountStatus} = 'pending'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(adminAccessRequestsTable)
        .where(sql`${adminAccessRequestsTable.status} = 'pending'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(jobsTable)
        .where(sql`${jobsTable.status} = 'pending'`)
        .then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    return NextResponse.json({
      usersCount,
      employersCount,
      jobsCount,
      applicationsCount,
      pendingEmployerCount,
      pendingAdminRequests,
      pendingJobs,
    });
  } catch (error) {
    console.error("Admin summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
