export const dynamic = "force-dynamic";
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

  // Fetch scores — prefer utility_score (new) but fall back to suitability_score (legacy)
  const { data: scores } = await supabaseAdmin
    .from("job_match_scores")
    .select(
      "id, jobseeker_id, utility_score, grade, suitability_score, dimension_scores, skill_breakdown, summary, strengths, gaps, bias_flags, constraint_violations, score_breakdown, top_reasons, ai_summary, computed_at, sent_to_employer"
    )
    .eq("job_id", job_id)
    .eq("sent_to_employer", true)
    .order("utility_score", { ascending: false, nullsFirst: false });

  if (!scores || scores.length === 0) {
    return NextResponse.json({ job, scores: [] });
  }

  // Enrich with jobseeker names & profiles
  const jobseekerIds = scores.map((s) => s.jobseeker_id as string);

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", jobseekerIds);

  const { data: profiles } = await supabaseAdmin
    .from("jobseekers")
    .select("id, nsrp_id, job_seeking_status")
    .in("id", jobseekerIds);

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const enrichedScores = scores.map((score, idx) => {
    const jsUser = userMap.get(score.jobseeker_id as string);
    const profile = profileMap.get(score.jobseeker_id as string);

    // New utility_score takes priority over legacy suitability_score
    const resolvedScore = (score.utility_score ?? score.suitability_score ?? 0) as number;

    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: jsUser?.name ?? "Unknown",
      email: jsUser?.email ?? "",
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",

      // New utility fields
      utilityScore: resolvedScore,
      grade: score.grade ?? null,
      dimensionScores: score.dimension_scores ?? null,
      skillBreakdown: score.skill_breakdown ?? null,
      summary: score.summary ?? score.ai_summary ?? null,
      strengths: score.strengths ?? score.top_reasons ?? [],
      gaps: score.gaps ?? [],
      biasFlags: score.bias_flags ?? [],
      constraintViolations: score.constraint_violations ?? [],

      // Legacy fields kept for backward compat with existing UI
      suitabilityScore: resolvedScore,
      scoreBreakdown: score.score_breakdown ?? score.dimension_scores ?? null,
      topReasons: score.top_reasons ?? score.strengths ?? [],
      aiSummary: score.ai_summary ?? score.summary ?? null,

      computedAt: score.computed_at,
    };
  });

  return NextResponse.json({ job, scores: enrichedScores });
}
