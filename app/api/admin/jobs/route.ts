import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employersTable, jobsTable } from "@/db/schema";

const ALLOWED_STATUSES = new Set(["draft", "pending", "active", "closed", "archived"]);

async function isAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

    const filters = [];
    if (status && ALLOWED_STATUSES.has(status)) {
      filters.push(
        eq(
          jobsTable.status,
          status as "draft" | "pending" | "active" | "closed" | "archived"
        )
      );
    }

    const rows = await db
      .select({
        id: jobsTable.id,
        positionTitle: jobsTable.positionTitle,
        status: jobsTable.status,
        isPublished: jobsTable.isPublished,
        archived: jobsTable.archived,
        createdAt: jobsTable.createdAt,
        employerId: jobsTable.employerId,
        establishmentName: employersTable.establishmentName,
      })
      .from(jobsTable)
      .leftJoin(employersTable, eq(employersTable.id, jobsTable.employerId))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(jobsTable.createdAt))
      .limit(limit);

    return NextResponse.json({ jobs: rows });
  } catch (error) {
    console.error("Admin jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
