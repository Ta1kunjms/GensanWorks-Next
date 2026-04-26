export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function POST() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingEmployersResult = await supabaseAdmin
      .from("employers")
      .select("id")
      .eq("account_status", "pending");

    const pendingEmployers = pendingEmployersResult.data ?? [];

    if (pendingEmployers.length === 0) {
      return NextResponse.json({
        message: "No pending employers to approve",
        approved: 0,
      });
    }

    const employerIds = pendingEmployers.map((emp) => emp.id);
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("employers")
      .update({
        account_status: "active",
        updated_at: now,
      })
      .in("id", employerIds)
      .select("id");

    if (error) {
      console.error("Batch approve employers error:", error);
      return NextResponse.json(
        { error: "Failed to approve employers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully approved ${data?.length ?? 0} employers`,
      approved: data?.length ?? 0,
    });
  } catch (error) {
    console.error("Batch approve employers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}