export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() };
}

function getMonthBounds() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() };
}

function getQuarterBounds() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
  const endOfQuarter = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  return { start: startOfQuarter.toISOString(), end: endOfQuarter.toISOString() };
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekBounds = getWeekBounds();
    const monthBounds = getMonthBounds();
    const quarterBounds = getQuarterBounds();

    const [
      hiredThisWeekResult,
      hiredThisMonthResult,
      hiredThisQuarterResult,
      forInterviewResult,
      pendingReferralsResult,
      totalReferralsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .gte("created_at", weekBounds.start)
        .lt("created_at", weekBounds.end),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .gte("created_at", monthBounds.start)
        .lte("created_at", monthBounds.end),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .gte("created_at", quarterBounds.start)
        .lte("created_at", quarterBounds.end),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "For Interview"),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending"),
      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true }),
    ]);

    const totalReferrals = totalReferralsResult.count ?? 0;
    const hiredTotal =
      (await supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "Hired")
        .then((r) => r.count)) ?? 0;

    const successRate =
      totalReferrals > 0 ? Math.round((hiredTotal / totalReferrals) * 100) : 0;

    const stats = {
      hiredThisWeek: hiredThisWeekResult.count ?? 0,
      hiredThisMonth: hiredThisMonthResult.count ?? 0,
      hiredThisQuarter: hiredThisQuarterResult.count ?? 0,
      forInterview: forInterviewResult.count ?? 0,
      pendingReferrals: pendingReferralsResult.count ?? 0,
      successRate,
      totalReferrals,
    };

    return NextResponse.json({ data: stats }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Placement stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}