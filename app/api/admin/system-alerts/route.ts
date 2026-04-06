import { NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { accountDeletionRequestsTable, adminAccessRequestsTable, jobsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { ensureAdmin } from "@/lib/legacy-compat";

type SystemAlert = {
  id: string;
  message: string;
  field?: string;
  route: string;
  method: string;
  timestamp: string;
};

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;
    if (admin.forbiddenResponse) return admin.forbiddenResponse;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pendingAccessRequests, overdueDeletionRequests, stalePendingJobs] = await Promise.all([
      db
        .select({ id: adminAccessRequestsTable.id, createdAt: adminAccessRequestsTable.createdAt })
        .from(adminAccessRequestsTable)
        .where(eq(adminAccessRequestsTable.status, "pending"))
        .orderBy(desc(adminAccessRequestsTable.createdAt))
        .limit(20),
      db
        .select({ id: accountDeletionRequestsTable.id, deleteAfter: accountDeletionRequestsTable.deleteAfter })
        .from(accountDeletionRequestsTable)
        .where(
          and(
            eq(accountDeletionRequestsTable.status, "pending"),
            lt(accountDeletionRequestsTable.deleteAfter, now)
          )
        )
        .limit(20),
      db
        .select({ id: jobsTable.id, createdAt: jobsTable.createdAt })
        .from(jobsTable)
        .where(and(eq(jobsTable.status, "pending"), lt(jobsTable.createdAt, sevenDaysAgo)))
        .limit(20),
    ]);

    const alerts: SystemAlert[] = [];

    pendingAccessRequests.forEach((item) => {
      alerts.push({
        id: `pending-access-${item.id}`,
        message: "Pending admin access request requires review",
        field: "status",
        route: "/api/admin/access-requests/[id]/status",
        method: "PATCH",
        timestamp: item.createdAt?.toISOString?.() ?? now.toISOString(),
      });
    });

    overdueDeletionRequests.forEach((item) => {
      alerts.push({
        id: `overdue-deletion-${item.id}`,
        message: "Account deletion request is overdue for processing",
        field: "deleteAfter",
        route: "/api/admin/account-deletion/process",
        method: "POST",
        timestamp: item.deleteAfter?.toISOString?.() ?? now.toISOString(),
      });
    });

    stalePendingJobs.forEach((item) => {
      alerts.push({
        id: `stale-job-${item.id}`,
        message: "Job has been pending review for more than 7 days",
        field: "status",
        route: "/api/admin/jobs/[id]/status",
        method: "PATCH",
        timestamp: item.createdAt?.toISOString?.() ?? now.toISOString(),
      });
    });

    alerts.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[GET /api/admin/system-alerts] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
