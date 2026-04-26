export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all jobs with employer info
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from("jobs")
      .select("id, position_title, created_at, employers(establishment_name), city")
      .order("created_at", { ascending: false });

    if (jobsError) throw jobsError;

    // Fetch summary of scores
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from("job_match_scores")
      .select("job_id, computed_at, sent_to_employer");

    if (scoresError) throw scoresError;

    // Aggregate scores per job
    const scoreAgg = (scores ?? []).reduce((acc: Record<string, { count: number; lastComputedAt: string; sent: boolean }>, score) => {
      const jid = score.job_id as string;
      if (!acc[jid]) acc[jid] = { count: 0, lastComputedAt: score.computed_at as string, sent: false };
      acc[jid].count++;
      if (new Date(score.computed_at as string) > new Date(acc[jid].lastComputedAt)) {
        acc[jid].lastComputedAt = score.computed_at as string;
      }
      if (score.sent_to_employer) acc[jid].sent = true;
      return acc;
    }, {});

    const enrichedJobs = (jobs ?? []).map((job) => ({
      id: job.id,
      position_title: job.position_title,
      establishment_name: (job.employers as unknown as { establishment_name: string })?.establishment_name ?? "Unknown Employer",
      city: job.city,
      created_at: job.created_at,
      match_count: scoreAgg[job.id]?.count ?? 0,
      last_computed_at: scoreAgg[job.id]?.lastComputedAt ?? null,
      sent_to_employer: scoreAgg[job.id]?.sent ?? false,
    }));

    return NextResponse.json({ jobs: enrichedJobs });
  } catch (error) {
    console.error("Failed to fetch matching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch matching jobs" }, { status: 500 });
  }
}
