export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAdminSummary } from "@/lib/supabase-admin-data";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await fetchAdminSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Admin summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}