import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employersTable } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "pending";

    const validStatuses = ["pending", "approved", "rejected", "suspended"] as const;
    const normalizedStatus = validStatuses.includes(
      statusFilter as (typeof validStatuses)[number]
    )
      ? (statusFilter as (typeof validStatuses)[number])
      : "pending";

    const employers = await db
      .select({
        id: employersTable.id,
        establishmentName: employersTable.establishmentName,
        contactPerson: employersTable.contactPerson,
        contactPhone: employersTable.contactPhone,
        email: employersTable.email,
        city: employersTable.city,
        province: employersTable.province,
        accountStatus: employersTable.accountStatus,
        createdAt: employersTable.createdAt,
      })
      .from(employersTable)
      .where(eq(employersTable.accountStatus, normalizedStatus))
      .orderBy(desc(employersTable.createdAt));

    return NextResponse.json({ employers, status: normalizedStatus });
  } catch (error) {
    console.error("Admin employer list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
