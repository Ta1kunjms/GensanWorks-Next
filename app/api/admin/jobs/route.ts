import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAdminJobs } from "@/lib/supabase-admin-data";

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
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

    const { jobs, total } = await fetchAdminJobs({ status, search, sortBy, sortOrder, limit, offset });
    return NextResponse.json({ jobs, total, limit, offset });
  } catch (error) {
    console.error("Admin jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}