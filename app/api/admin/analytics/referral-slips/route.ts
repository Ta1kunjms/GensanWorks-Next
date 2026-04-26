import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const months = Math.min(parseInt(searchParams.get("months") ?? "6"), 12);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const { data: slips } = await supabaseAdmin
      .from("referral_slips")
      .select("id, issued_at, valid_until, status")
      .gte("issued_at", startDate.toISOString())
      .order("issued_at", { ascending: true });

    const totalIssued = slips?.length ?? 0;
    const now2 = new Date();
    const activeSlips = (slips ?? []).filter((s: Record<string, unknown>) => new Date(String(s.valid_until)) > now2).length;
    const expiredSlips = totalIssued - activeSlips;

    // Build monthly buckets
    const monthLabels = Array.from({ length: months }, (_, i) => {
      const d = new Date(now);
      d.setMonth(now.getMonth() - (months - 1) + i);
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    });

    const slipsByMonth: Record<string, number> = {};
    (slips ?? []).forEach((s: Record<string, unknown>) => {
      const d = new Date(String(s.issued_at));
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      slipsByMonth[key] = (slipsByMonth[key] ?? 0) + 1;
    });

    const monthlyIssuance = monthLabels.map((label) => ({
      month: label,
      count: slipsByMonth[label] ?? 0,
    }));

    return NextResponse.json(
      { totalIssued, activeSlips, expiredSlips, monthlyIssuance },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Referral slips analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
