export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { referralStatusDbValues } from "@/lib/referral-status";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

// All windows are [start, end): end is the start of the next period.
function getWeekBounds() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() };
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getQuarterBounds() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), quarter * 3, 1);
  const end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

type CountResult = { count: number | null; error: { code?: string } | null };

function countOf(result: CountResult, label: string): number {
  if (result.error) {
    // Fail loudly instead of reporting a silent zero.
    throw new Error(`placement-stats ${label} count failed (${result.error.code ?? "unknown"})`);
  }
  return result.count ?? 0;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekBounds = getWeekBounds();
    const monthBounds = getMonthBounds();
    const quarterBounds = getQuarterBounds();
    const referrals = () => supabaseAdmin.from("referrals").select("id", { count: "exact", head: true });
    const hired = referralStatusDbValues("Hired");

    // "hired" is terminal, so a hired referral's updated_at is its hire date.
    const [
      hiredThisWeekResult,
      hiredThisMonthResult,
      hiredThisQuarterResult,
      hiredTotalResult,
      forInterviewResult,
      pendingReferralsResult,
      totalReferralsResult,
    ] = await Promise.all([
      referrals().in("status", hired).gte("updated_at", weekBounds.start).lt("updated_at", weekBounds.end),
      referrals().in("status", hired).gte("updated_at", monthBounds.start).lt("updated_at", monthBounds.end),
      referrals().in("status", hired).gte("updated_at", quarterBounds.start).lt("updated_at", quarterBounds.end),
      referrals().in("status", hired),
      referrals().in("status", referralStatusDbValues("For Interview")),
      referrals().in("status", referralStatusDbValues("Pending")),
      referrals(),
    ]);

    const totalReferrals = countOf(totalReferralsResult, "total");
    const hiredTotal = countOf(hiredTotalResult, "hired");
    const successRate = totalReferrals > 0 ? Math.round((hiredTotal / totalReferrals) * 100) : 0;

    const stats = {
      hiredThisWeek: countOf(hiredThisWeekResult, "week"),
      hiredThisMonth: countOf(hiredThisMonthResult, "month"),
      hiredThisQuarter: countOf(hiredThisQuarterResult, "quarter"),
      forInterview: countOf(forInterviewResult, "interview"),
      pendingReferrals: countOf(pendingReferralsResult, "pending"),
      successRate,
      totalReferrals,
    };

    return NextResponse.json({ data: stats }, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Placement stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
