export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAdminDashboardData,
  computeSinceDate,
  type DashboardPeriod,
} from "@/admin/dashboard/_lib/data-loader";

const VALID_PERIODS: DashboardPeriod[] = ["day", "week", "month", "quarter", "year", "all"];

function parsePeriod(value: string | null): DashboardPeriod {
  if (value && VALID_PERIODS.includes(value as DashboardPeriod)) {
    return value as DashboardPeriod;
  }
  return "month";
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const since = computeSinceDate(period);

    const data = await getAdminDashboardData({ since, period });

    return NextResponse.json(
      { ...data, since: since ? since.toISOString() : null },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[admin/dashboard/summary] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
