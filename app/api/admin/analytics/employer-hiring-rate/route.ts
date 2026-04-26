import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all referrals with employer_id and status
    const { data: referrals } = await supabaseAdmin
      .from("referrals")
      .select("employer_id, status");

    if (!referrals || referrals.length === 0) {
      return NextResponse.json({ employers: [], totalReferrals: 0 }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    // Aggregate per employer
    const employerStats: Record<string, { total: number; hired: number; interview: number }> = {};
    referrals.forEach((r: Record<string, unknown>) => {
      const eid = String(r.employer_id ?? "");
      if (!eid) return;
      if (!employerStats[eid]) employerStats[eid] = { total: 0, hired: 0, interview: 0 };
      employerStats[eid].total++;
      if (r.status === "Hired") employerStats[eid].hired++;
      if (r.status === "For Interview") employerStats[eid].interview++;
    });

    // Resolve employer names
    const empIds = Object.keys(employerStats);
    const { data: empData } = await supabaseAdmin
      .from("employers")
      .select("id, establishment_name, city")
      .in("id", empIds);

    const empMap: Record<string, { name: string; city: string }> = {};
    (empData ?? []).forEach((e: Record<string, unknown>) => {
      empMap[String(e.id)] = {
        name: String(e.establishment_name ?? "Unknown"),
        city: String(e.city ?? ""),
      };
    });

    const employers = empIds
      .map((id) => {
        const stats = employerStats[id] ?? { total: 0, hired: 0, interview: 0 };
        const meta = empMap[id] ?? { name: "Unknown", city: "" };
        return {
          employerId: id,
          employerName: meta.name,
          city: meta.city,
          totalReferrals: stats.total,
          hired: stats.hired,
          forInterview: stats.interview,
          hiringRate: stats.total > 0 ? Math.round((stats.hired / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.hiringRate - a.hiringRate);

    return NextResponse.json(
      { employers, totalReferrals: referrals.length },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Employer hiring rate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
