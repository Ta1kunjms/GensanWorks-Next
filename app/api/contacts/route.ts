import { NextResponse } from "next/server";
import { ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminsTable, employersTable, usersTable } from "@/db/schema";

type Role = "admin" | "employer" | "jobseeker";

type Contact = {
  id: string;
  role: Role;
  name: string;
  email: string | null;
};

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as Role };
}

export async function GET(req: Request) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);

    const shouldInclude = (role: Role) => {
      if (!roleFilter || roleFilter === "all") return true;
      return roleFilter === role;
    };

    const contacts: Contact[] = [];

    if (shouldInclude("jobseeker")) {
      const rows = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(
          q
            ? or(ilike(usersTable.name, `%${q}%`), ilike(usersTable.email, `%${q}%`))
            : undefined
        )
        .limit(limit);

      rows.forEach((row) => {
        if (row.id !== identity.userId) {
          contacts.push({ id: row.id, role: "jobseeker", name: row.name, email: row.email });
        }
      });
    }

    if (shouldInclude("employer")) {
      const rows = await db
        .select({
          id: employersTable.id,
          name: employersTable.establishmentName,
          email: employersTable.email,
          accountStatus: employersTable.accountStatus,
        })
        .from(employersTable)
        .where(
          q
            ? or(
                ilike(employersTable.establishmentName, `%${q}%`),
                ilike(employersTable.email, `%${q}%`)
              )
            : undefined
        )
        .limit(limit);

      rows.forEach((row) => {
        if (row.id !== identity.userId && row.accountStatus !== "rejected") {
          contacts.push({ id: row.id, role: "employer", name: row.name, email: row.email });
        }
      });
    }

    if (shouldInclude("admin")) {
      const rows = await db
        .select({ id: adminsTable.id, name: adminsTable.name, email: adminsTable.email })
        .from(adminsTable)
        .where(q ? or(ilike(adminsTable.name, `%${q}%`), ilike(adminsTable.email, `%${q}%`)) : undefined)
        .limit(limit);

      rows.forEach((row) => {
        if (row.id !== identity.userId) {
          contacts.push({ id: row.id, role: "admin", name: row.name, email: row.email });
        }
      });
    }

    const deduped = Array.from(new Map(contacts.map((item) => [item.id, item])).values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);

    return NextResponse.json({ contacts: deduped });
  } catch (error) {
    console.error("Contacts fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
