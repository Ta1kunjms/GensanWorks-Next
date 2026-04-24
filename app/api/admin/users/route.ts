import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
    const search = searchParams.get("search")?.trim();
    const roleFilter = searchParams.get("role")?.trim() ?? "all";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);

    let regularUsers: Array<Record<string, unknown>> = [];
    let adminUsers: Array<Record<string, unknown>> = [];

    if (roleFilter === "all" || roleFilter === "jobseeker") {
      let query = supabaseAdmin.from("users").select(
        "id, name, email, city, province, created_at",
        { count: "exact" }
      );
      if (search) {
        const pattern = `%${search}%`;
        query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
      }
      const result = await query.order("created_at", { ascending: sortOrder === "asc" }).range(offset, offset + limit - 1);
      regularUsers = (result.data ?? []).map((u: Record<string, unknown>) => ({
        id: u.id,
        role: "jobseeker",
        name: u.name,
        email: u.email,
        city: u.city,
        province: u.province,
        createdAt: u.created_at,
      }));
    }

    if (roleFilter === "all" || roleFilter === "admin") {
      let query = supabaseAdmin.from("admins").select(
        "id, name, email, created_at",
        { count: "exact" }
      );
      if (search) {
        const pattern = `%${search}%`;
        query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
      }
      const result = await query.order("created_at", { ascending: sortOrder === "asc" }).range(offset, offset + limit - 1);
      adminUsers = (result.data ?? []).map((a: Record<string, unknown>) => ({
        id: a.id,
        role: "admin",
        name: a.name,
        email: a.email,
        city: null,
        province: null,
        createdAt: a.created_at,
      }));
    }

    const users = [...regularUsers, ...adminUsers].sort((left, right) => {
      const leftTime = new Date(String(left.createdAt ?? new Date())).getTime();
      const rightTime = new Date(String(right.createdAt ?? new Date())).getTime();
      return sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
    }).slice(0, limit);

    const [userCount, adminCount] = await Promise.all([
      (async () => {
        const result = await supabaseAdmin.from("users").select("id", { count: "exact", head: true });
        return result.count ?? 0;
      })(),
      (async () => {
        const result = await supabaseAdmin.from("admins").select("id", { count: "exact", head: true });
        return result.count ?? 0;
      })(),
    ]);

    return NextResponse.json({ users, total: userCount + adminCount, limit, offset });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}