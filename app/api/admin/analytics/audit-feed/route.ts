import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountDeletionRequestsTable, adminAccessRequestsTable } from "@/db/schema";

type AuditEvent = {
  timestamp: string;
  type: string;
  actor: string;
  detail: string;
};

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "20");
    const limit = Math.max(5, Math.min(50, Number.isFinite(requestedLimit) ? requestedLimit : 20));

    const [accessRequests, deletionRequests] = await Promise.all([
      db
        .select({
          id: adminAccessRequestsTable.id,
          name: adminAccessRequestsTable.name,
          email: adminAccessRequestsTable.email,
          status: adminAccessRequestsTable.status,
          createdAt: adminAccessRequestsTable.createdAt,
          reviewedAt: adminAccessRequestsTable.reviewedAt,
        })
        .from(adminAccessRequestsTable)
        .orderBy(desc(adminAccessRequestsTable.createdAt))
        .limit(limit),
      db
        .select({
          id: accountDeletionRequestsTable.id,
          role: accountDeletionRequestsTable.role,
          email: accountDeletionRequestsTable.email,
          status: accountDeletionRequestsTable.status,
          requestedAt: accountDeletionRequestsTable.requestedAt,
          processedAt: accountDeletionRequestsTable.processedAt,
          cancelledAt: accountDeletionRequestsTable.cancelledAt,
        })
        .from(accountDeletionRequestsTable)
        .orderBy(desc(accountDeletionRequestsTable.requestedAt))
        .limit(limit),
    ]);

    const events: AuditEvent[] = [];

    accessRequests.forEach((item) => {
      events.push({
        timestamp: item.createdAt?.toISOString?.() ?? new Date().toISOString(),
        type: "admin_access_request_created",
        actor: item.email,
        detail: `${item.name} requested admin access`,
      });

      if (item.reviewedAt) {
        events.push({
          timestamp: item.reviewedAt.toISOString(),
          type: "admin_access_request_reviewed",
          actor: item.email,
          detail: `Admin request marked ${item.status}`,
        });
      }
    });

    deletionRequests.forEach((item) => {
      events.push({
        timestamp: item.requestedAt?.toISOString?.() ?? new Date().toISOString(),
        type: "account_deletion_requested",
        actor: item.email,
        detail: `${item.role} account requested deletion`,
      });

      if (item.cancelledAt) {
        events.push({
          timestamp: item.cancelledAt.toISOString(),
          type: "account_deletion_cancelled",
          actor: item.email,
          detail: "Account deletion request cancelled",
        });
      }

      if (item.processedAt) {
        events.push({
          timestamp: item.processedAt.toISOString(),
          type: "account_deletion_processed",
          actor: item.email,
          detail: `Account deletion processed (${item.status})`,
        });
      }
    });

    events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({
      totalEvents: events.length,
      events: events.slice(0, limit),
    });
  } catch (error) {
    console.error("Admin audit feed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
