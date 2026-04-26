export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

type JobSeekerAlert = {
  id: string;
  name: string | null;
  email: string | null;
  lastActiveAt: string | null;
  daysInactive: number;
  alertType: "no_applications" | "inactive_90_days" | "pending_applications";
  applicationsCount: number;
};

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const [usersResult, applicationsResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, full_name, email, last_active_at, created_at"),
      supabaseAdmin
        .from("applications")
        .select("applicant_id"),
    ]);

    const applicationsByUser: Record<string, number> = {};
    (applicationsResult.data ?? []).forEach((app) => {
      if (app.applicant_id) {
        applicationsByUser[app.applicant_id] =
          (applicationsByUser[app.applicant_id] ?? 0) + 1;
      }
    });

    const alerts: JobSeekerAlert[] = [];
    const seenIds = new Set<string>();

    for (const user of usersResult.data ?? []) {
      const lastActive = user.last_active_at
        ? new Date(user.last_active_at)
        : user.created_at
        ? new Date(user.created_at)
        : null;
      const daysInactive = lastActive ? daysBetween(now, lastActive) : 0;
      const appsCount = applicationsByUser[user.id] ?? 0;

      if (appsCount === 0 && !seenIds.has(user.id)) {
        seenIds.add(user.id);
        alerts.push({
          id: user.id,
          name: user.full_name,
          email: user.email,
          lastActiveAt: user.last_active_at,
          daysInactive,
          alertType: "no_applications",
          applicationsCount: 0,
        });
      } else if (daysInactive >= 90 && !seenIds.has(user.id)) {
        seenIds.add(user.id);
        alerts.push({
          id: user.id,
          name: user.full_name,
          email: user.email,
          lastActiveAt: user.last_active_at,
          daysInactive,
          alertType: "inactive_90_days",
          applicationsCount: appsCount,
        });
      }
    }

    const sortedAlerts = alerts
      .sort((a, b) => b.daysInactive - a.daysInactive)
      .slice(0, 20);

    return NextResponse.json(
      { data: { alerts: sortedAlerts } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Job seeker alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}