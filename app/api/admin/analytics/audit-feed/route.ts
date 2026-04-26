export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    const [accessRequestsResult, deletionRequestsResult] = await Promise.all([
      supabaseAdmin
        .from("admin_access_requests")
        .select("id, name, email, status, created_at, reviewed_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("account_deletion_requests")
        .select("id, role, email, status, requested_at, processed_at, cancelled_at")
        .order("requested_at", { ascending: false })
        .limit(limit),
    ]);

    const accessRequests = accessRequestsResult.data ?? [];
    const deletionRequests = deletionRequestsResult.data ?? [];
    const events: AuditEvent[] = [];

    accessRequests.forEach((item: Record<string, unknown>) => {
      events.push({
        timestamp: item.created_at ? new Date(String(item.created_at)).toISOString() : new Date().toISOString(),
        type: "admin_access_request_created",
        actor: String(item.email),
        detail: `${item.name} requested admin access`,
      });

      if (item.reviewed_at) {
        events.push({
          timestamp: new Date(String(item.reviewed_at)).toISOString(),
          type: "admin_access_request_reviewed",
          actor: String(item.email),
          detail: `Admin request marked ${item.status}`,
        });
      }
    });

    deletionRequests.forEach((item: Record<string, unknown>) => {
      events.push({
        timestamp: item.requested_at ? new Date(String(item.requested_at)).toISOString() : new Date().toISOString(),
        type: "account_deletion_requested",
        actor: String(item.email),
        detail: `${item.role} account requested deletion`,
      });

      if (item.cancelled_at) {
        events.push({
          timestamp: new Date(String(item.cancelled_at)).toISOString(),
          type: "account_deletion_cancelled",
          actor: String(item.email),
          detail: "Account deletion request cancelled",
        });
      }

      if (item.processed_at) {
        events.push({
          timestamp: new Date(String(item.processed_at)).toISOString(),
          type: "account_deletion_processed",
          actor: String(item.email),
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