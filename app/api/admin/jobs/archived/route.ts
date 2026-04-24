import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    const result = await supabaseAdmin
      .from("jobs")
      .select(
        "id, position_title, status, archived, created_at, employer_id",
        { count: "exact" }
      )
      .eq("archived", true)
      .order("created_at", { ascending: false });

    const jobs = (result.data ?? []).map((j: Record<string, unknown>) => ({
      id: j.id,
      positionTitle: j.position_title,
      status: j.status,
      archived: j.archived,
      createdAt: j.created_at,
      employerId: j.employer_id,
      establishmentName: null,
    }));

    const enriched = await Promise.all(
      jobs.map(async (job: Record<string, unknown>) => {
        if (!job.employerId) return job;
        const emp = await supabaseAdmin
          .from("employers")
          .select("establishment_name")
          .eq("id", String(job.employerId))
          .single();
        return { ...job, establishmentName: emp.data?.establishment_name ?? null };
      })
    );

    return NextResponse.json({ jobs: enriched, total: enriched.length });
  } catch (error) {
    console.error("Admin archived jobs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}