import { NextResponse } from "next/server";
import { classifyEmploymentStatus, getUsersFilteredByDate } from "@/api/charts/_utils";

export async function GET(req: Request) {
  try {
    const users = await getUsersFilteredByDate(req.url);

    let employed = 0;
    let wageEmployed = 0;
    let unemployed = 0;
    let selfEmployed = 0;
    let newEntrant = 0;

    users.forEach((user) => {
      const bucket = classifyEmploymentStatus(user.employmentStatus ?? user.employmentType);
      if (!bucket) return;

      if (bucket === "employed") {
        employed += 1;
        wageEmployed += 1;
      } else if (bucket === "unemployed") {
        unemployed += 1;
      } else if (bucket === "selfEmployed") {
        selfEmployed += 1;
        employed += 1;
      } else if (bucket === "newEntrant") {
        newEntrant += 1;
        unemployed += 1;
      }
    });

    return NextResponse.json({
      employed,
      wageEmployed,
      unemployed,
      selfEmployed,
      newEntrant,
    });
  } catch (error) {
    console.error("[GET /api/charts/employment-status] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment status data" },
      { status: 500 }
    );
  }
}
