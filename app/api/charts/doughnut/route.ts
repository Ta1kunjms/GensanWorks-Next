import { NextResponse } from "next/server";
import { getUsersFilteredByDate } from "@/api/charts/_utils";

export async function GET(req: Request) {
  try {
    const users = await getUsersFilteredByDate(req.url);

    const freelancerCount = users.filter((user) => {
      const status = String(user.employment_status ?? "").toLowerCase();
      return status.includes("freelanc");
    }).length;

    const jobSeekerCount = Math.max(0, users.length - freelancerCount);

    return NextResponse.json({
      jobSeeker: jobSeekerCount,
      freelancer: freelancerCount,
    });
  } catch (error) {
    console.error("[GET /api/charts/doughnut] Failed:", error);
    return NextResponse.json({ error: "Failed to fetch doughnut chart data" }, { status: 500 });
  }
}
