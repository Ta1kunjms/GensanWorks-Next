import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

type TrendPoint = {
  month: string;
  jobs: number;
  applications: number;
};

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(date));
  }
  return months;
}

function formatMonthLabel(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? month : new Date().getMonth() + 1;
  const date = new Date(safeYear, safeMonth - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

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
    const requestedMonths = Number(searchParams.get("months") ?? "6");
    const months = Math.max(3, Math.min(24, Number.isFinite(requestedMonths) ? requestedMonths : 6));

    const [jobsResult, appsResult] = await Promise.all([
      supabaseAdmin.from("jobs").select("created_at"),
      supabaseAdmin.from("applications").select("created_at"),
    ]);

    const jobs = jobsResult.data ?? [];
    const applications = appsResult.data ?? [];
    const monthKeys = getLastMonths(months);
    const trendsMap = new Map<string, TrendPoint>();

    monthKeys.forEach((monthKey) => {
      trendsMap.set(monthKey, { month: formatMonthLabel(monthKey), jobs: 0, applications: 0 });
    });

    jobs.forEach((item: Record<string, unknown>) => {
      if (!item.created_at) return;
      const key = getMonthKey(new Date(String(item.created_at)));
      const trend = trendsMap.get(key);
      if (trend) trend.jobs += 1;
    });

    applications.forEach((item: Record<string, unknown>) => {
      if (!item.created_at) return;
      const key = getMonthKey(new Date(String(item.created_at)));
      const trend = trendsMap.get(key);
      if (trend) trend.applications += 1;
    });

    const monthlyTrends = monthKeys
      .map((key) => trendsMap.get(key))
      .filter((item): item is TrendPoint => Boolean(item));

    return NextResponse.json({ months, monthlyTrends });
  } catch (error) {
    console.error("Admin analytics timeline error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}