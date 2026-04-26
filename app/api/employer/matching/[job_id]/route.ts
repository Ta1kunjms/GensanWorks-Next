import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;

  // Verify the job belongs to the employer
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, employer_id")
    .eq("id", job_id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.employer_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Fetch sent scores only
  const { data: scores } = await supabaseAdmin
    .from("job_match_scores")
    .select("id, jobseeker_id, suitability_score, score_breakdown, top_reasons, ai_summary, computed_at")
    .eq("job_id", job_id)
    .eq("sent_to_employer", true)
    .order("suitability_score", { ascending: false });

  if (!scores || scores.length === 0) {
    return NextResponse.json({ job, scores: [] });
  }

  // Enrich with jobseeker names
  const jobseekerIds = scores.map((s) => s.jobseeker_id as string);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", jobseekerIds);

  const { data: profiles } = await supabaseAdmin
    .from("jobseekers")
    .select("user_id, nsrp_id, job_seeking_status")
    .in("user_id", jobseekerIds);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));

  const enrichedScores = scores.map((score, idx) => {
    const jsUser = userMap.get(score.jobseeker_id as string);
    const profile = profileMap.get(score.jobseeker_id as string);
    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: jsUser?.name ?? "Unknown",
      email: jsUser?.email ?? "",
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",
      suitabilityScore: score.suitability_score,
      scoreBreakdown: score.score_breakdown,
      topReasons: score.top_reasons,
      aiSummary: score.ai_summary,
      computedAt: score.computed_at,
    };
  });

  return NextResponse.json({
    job,
    scores: enrichedScores,
  });
}
