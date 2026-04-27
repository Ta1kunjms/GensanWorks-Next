import { NextResponse } from "next/server";
import { classifyEmploymentStatus, getUsersFilteredByDate } from "@/api/charts/_utils";

export async function GET(req: Request) {
  try {
    const users = await getUsersFilteredByDate(req.url);

    const byBarangay = new Map<
      string,
      { employed: number; unemployed: number; selfEmployed: number; newEntrant: number }
    >();

    users.forEach((user) => {
      const key = user.city?.trim() || "Unknown";
      const bucket = classifyEmploymentStatus(user.employment_status);

      if (!byBarangay.has(key)) {
        byBarangay.set(key, { employed: 0, unemployed: 0, selfEmployed: 0, newEntrant: 0 });
      }

      if (bucket) {
        byBarangay.get(key)![bucket] += 1;
      }
    });

    const sortedBarangays = Array.from(byBarangay.keys()).sort((a, b) => a.localeCompare(b));

    const response = {
      barangays: sortedBarangays,
      employed: sortedBarangays.map((name) => byBarangay.get(name)?.employed ?? 0),
      unemployed: sortedBarangays.map((name) => byBarangay.get(name)?.unemployed ?? 0),
      selfEmployed: sortedBarangays.map((name) => byBarangay.get(name)?.selfEmployed ?? 0),
      newEntrant: sortedBarangays.map((name) => byBarangay.get(name)?.newEntrant ?? 0),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/charts/bar] Failed:", error);
    return NextResponse.json({ error: "Failed to fetch bar chart data" }, { status: 500 });
  }
}
