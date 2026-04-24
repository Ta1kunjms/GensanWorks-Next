import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    if (shouldInclude("jobseeker") && identity.role !== "jobseeker") {
      let query = db.from("users").select("id, name, email");
      if (q) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data: rows } = await query.limit(limit);

      rows?.forEach((row) => {
        if (row.id !== identity.userId) {
          contacts.push({ id: row.id, role: "jobseeker", name: row.name, email: row.email });
        }
      });
    }

    if (shouldInclude("employer")) {
      let rows: any[] = [];
      if (identity.role === "jobseeker") {
        const { data: appData } = await db.from("applications").select("employer_id").eq("jobseeker_id", identity.userId);
        const empIds = [...new Set(appData?.map(a => a.employer_id).filter(Boolean))];
        if (empIds.length > 0) {
          let query = db.from("employers").select("id, establishment_name, email, account_status").in("id", empIds);
          if (q) query = query.or(`establishment_name.ilike.%${q}%,email.ilike.%${q}%`);
          const { data } = await query.limit(limit);
          rows = data || [];
        }
      } else {
        let query = db.from("employers").select("id, establishment_name, email, account_status");
        if (q) {
          query = query.or(`establishment_name.ilike.%${q}%,email.ilike.%${q}%`);
        }
        const { data } = await query.limit(limit);
        rows = data || [];
      }

      rows?.forEach((row) => {
        if (row.id !== identity.userId && row.account_status !== "rejected") {
          contacts.push({ id: row.id, role: "employer", name: row.establishment_name, email: row.email });
        }
      });
    }

    if (shouldInclude("admin")) {
      let query = db.from("admins").select("id, name, email");
      if (q) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data: rows } = await query.limit(limit);

      rows?.forEach((row) => {
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