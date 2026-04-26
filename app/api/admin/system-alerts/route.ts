export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureAdmin } from "@/lib/legacy-compat";

export async function GET(req: Request) {
  try {
    const admin = await ensureAdmin(req);
    if (admin.unauthorizedResponse) return admin.unauthorizedResponse;

    const result = await supabaseAdmin
      .from("admin_access_requests")
      .select("id, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pendingAccessResult, overdueDeletionResult, stalePendingResult] = await Promise.all([
      supabaseAdmin
        .from("admin_access_requests")
        .select("id, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("account_deletion_requests")
        .select("id, delete_after")
        .eq("status", "pending")
        .lt("delete_after", now.toISOString())
        .limit(20),
      supabaseAdmin
        .from("jobs")
        .select("id, created_at")
        .eq("status", "pending")
        .lt("created_at", sevenDaysAgo.toISOString())
        .limit(20),
    ]);

    const alerts: Array<{
      id: string;
      message: string;
      field?: string;
      route: string;
      method: string;
      timestamp: string;
    }> = [];

    (pendingAccessResult.data ?? []).forEach((item: Record<string, unknown>) => {
      alerts.push({
        id: `pending-access-${item.id}`,
        message: "Pending admin access request requires review",
        field: "status",
        route: "/api/admin/access-requests/[id]/status",
        method: "PATCH",
        timestamp: item.created_at ? new Date(String(item.created_at)).toISOString() : now.toISOString(),
      });
    });

    (overdueDeletionResult.data ?? []).forEach((item: Record<string, unknown>) => {
      alerts.push({
        id: `overdue-deletion-${item.id}`,
        message: "Account deletion request is overdue for processing",
        field: "deleteAfter",
        route: "/api/admin/account-deletion/process",
        method: "POST",
        timestamp: item.delete_after ? new Date(String(item.delete_after)).toISOString() : now.toISOString(),
      });
    });

    (stalePendingResult.data ?? []).forEach((item: Record<string, unknown>) => {
      alerts.push({
        id: `stale-job-${item.id}`,
        message: "Job has been pending review for more than 7 days",
        field: "status",
        route: "/api/admin/jobs/[id]/status",
        method: "PATCH",
        timestamp: item.created_at ? new Date(String(item.created_at)).toISOString() : now.toISOString(),
      });
    });

    alerts.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[GET /api/admin/system-alerts] Failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}