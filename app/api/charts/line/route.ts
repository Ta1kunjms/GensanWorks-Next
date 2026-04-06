import { NextResponse } from "next/server";
import { referralsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { isInDateRange, parseDateRangeFromUrl } from "@/lib/legacy-compat";

function monthLabel(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const { start, end } = parseDateRangeFromUrl(req.url);
    const referrals = await db
      .select({
        dateReferred: referralsTable.dateReferred,
        status: referralsTable.status,
        remarks: referralsTable.remarks,
      })
      .from(referralsTable);

    const filtered = referrals.filter((row) => isInDateRange(row.dateReferred, start, end));

    const monthMap = new Map<string, { referred: number; hired: number; feedback: number }>();

    filtered.forEach((row) => {
      const date = row.dateReferred ? new Date(row.dateReferred) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const key = monthLabel(date);
      if (!monthMap.has(key)) {
        monthMap.set(key, { referred: 0, hired: 0, feedback: 0 });
      }

      const entry = monthMap.get(key)!;
      entry.referred += 1;
      if (String(row.status ?? "").toLowerCase() === "hired") {
        entry.hired += 1;
      }
      if (String(row.remarks ?? "").trim().length > 0) {
        entry.feedback += 1;
      }
    });

    const months = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      months,
      referred: months.map((month) => monthMap.get(month)?.referred ?? 0),
      hired: months.map((month) => monthMap.get(month)?.hired ?? 0),
      feedback: months.map((month) => monthMap.get(month)?.feedback ?? 0),
    });
  } catch (error) {
    console.error("[GET /api/charts/line] Failed:", error);
    return NextResponse.json({ error: "Failed to fetch line chart data" }, { status: 500 });
  }
}
