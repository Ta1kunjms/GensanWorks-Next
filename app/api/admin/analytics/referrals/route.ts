import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchReferralAnalytics } from "@/lib/supabase-admin-data";

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

    const analytics = await fetchReferralAnalytics();

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Admin referral analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}