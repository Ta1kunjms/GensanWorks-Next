import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employersTable, jobsTable } from "@/db/schema";

async function requireJobseeker() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "jobseeker";
}

export async function GET(req: Request) {
  try {
    if (!(await requireJobseeker())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const baseConditions = [
      eq(jobsTable.status, "active"),
      eq(jobsTable.isPublished, true),
      eq(jobsTable.archived, false),
    ];

    if (q) {
      baseConditions.push(
        or(
          ilike(jobsTable.positionTitle, `%${q}%`),
          ilike(jobsTable.location, `%${q}%`),
          ilike(employersTable.establishmentName, `%${q}%`)
        )!
      );
    }

    const jobs = await db
      .select({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        location: jobsTable.location,
        city: jobsTable.city,
        province: jobsTable.province,
        employmentType: jobsTable.employmentType,
        salaryMin: jobsTable.salaryMin,
        salaryMax: jobsTable.salaryMax,
        salaryPeriod: jobsTable.salaryPeriod,
        createdAt: jobsTable.createdAt,
        employerId: jobsTable.employerId,
        establishmentName: employersTable.establishmentName,
      })
      .from(jobsTable)
      .leftJoin(employersTable, eq(employersTable.id, jobsTable.employerId))
      .where(and(...baseConditions))
      .orderBy(desc(jobsTable.createdAt))
      .limit(limit);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Jobseeker jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
