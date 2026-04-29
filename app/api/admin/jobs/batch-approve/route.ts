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

    const pendingJobsResult = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("job_status", "pending");

    const pendingJobs = pendingJobsResult.data ?? [];

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        message: "No pending jobs to approve",
        approved: 0,
      });
    }

    const jobIds = pendingJobs.map((job) => job.id);
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update({
        job_status: "active",
        is_active: true,
        published_at: now,
        updated_at: now,
      })
      .in("id", jobIds)
      .select("id");

    if (error) {
      console.error("Batch approve jobs error:", error);
      return NextResponse.json(
        { error: "Failed to approve jobs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully approved ${data?.length ?? 0} jobs`,
      approved: data?.length ?? 0,
    });
  } catch (error) {
    console.error("Batch approve jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}