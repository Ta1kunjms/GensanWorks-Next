import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employersTable, referralsTable } from "@/db/schema";

const REFERRAL_STATUSES = ["Pending", "For Interview", "Hired", "Rejected", "Withdrawn"] as const;

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalReferrals, referralsByStatusRows, topEmployers] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(referralsTable)
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({
          status: referralsTable.status,
          count: sql<number>`count(*)`,
        })
        .from(referralsTable)
        .groupBy(referralsTable.status),
      db
        .select({
          employerId: referralsTable.employerId,
          employerName: employersTable.establishmentName,
          count: sql<number>`count(*)`,
        })
        .from(referralsTable)
        .leftJoin(employersTable, eq(employersTable.id, referralsTable.employerId))
        .groupBy(referralsTable.employerId, employersTable.establishmentName)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(5),
    ]);

    const referralsByStatus = REFERRAL_STATUSES.map((status) => ({
      status,
      count: Number(referralsByStatusRows.find((row) => row.status === status)?.count ?? 0),
    }));

    return NextResponse.json({
      totalReferrals,
      referralsByStatus,
      topEmployers: topEmployers.map((item) => ({
        employerId: item.employerId,
        employerName: item.employerName ?? "Unknown employer",
        count: Number(item.count ?? 0),
      })),
    });
  } catch (error) {
    console.error("Admin referral analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
