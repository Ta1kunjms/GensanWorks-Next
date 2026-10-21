export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getMatchingReportSentAt } from "@/lib/matching/report-sent";

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
      "id, jobseeker_id, utility_score, grade, suitability_score, dimension_scores, summary, strengths, gaps, constraint_violations, ai_summary, computed_at"
    )
    .eq("job_id", job_id)
    .order("utility_score", { ascending: false, nullsFirst: false });

  // Employers see a ranking only after PESO has reviewed and sent it.
  const reportSent = (await getMatchingReportSentAt([job_id])).has(job_id);
  if (!reportSent || !scores || scores.length === 0) {
    return NextResponse.json({ job, scores: [] });
  }

  // Enrich with jobseeker names & profiles
  const jobseekerIds = scores.map((s) => s.jobseeker_id as string);

  const { data: profiles } = await supabaseAdmin
    .from("jobseekers")
    .select("id, nsrp_id, job_seeking_status, first_name, last_name, email")
    .in("id", jobseekerIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const enrichedScores = scores.map((score, idx) => {
    const profile = profileMap.get(score.jobseeker_id as string);

    const fullName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
    const resolvedName = fullName || "Unknown";
    const resolvedEmail = profile?.email ?? "";

    // New utility_score takes priority over legacy suitability_score
    const resolvedScore = (score.utility_score ?? score.suitability_score ?? 0) as number;

    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: resolvedName,
      email: resolvedEmail,
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",

      // New utility fields
      utilityScore: resolvedScore,
      grade: score.grade ?? null,
      dimensionScores: score.dimension_scores ?? null,
      skillBreakdown: (score.dimension_scores as { skills?: unknown } | null)?.skills ?? null,
      summary: score.summary ?? score.ai_summary ?? null,
      strengths: score.strengths ?? [],
      gaps: score.gaps ?? [],
      biasFlags: score.constraint_violations ?? [],
      constraintViolations: score.constraint_violations ?? [],

      // Legacy fields kept for backward compat with existing UI
      suitabilityScore: resolvedScore,
      scoreBreakdown: score.dimension_scores ?? null,
      topReasons: score.strengths ?? [],
      aiSummary: score.ai_summary ?? score.summary ?? null,

      computedAt: score.computed_at,
    };
  });

  return NextResponse.json({ job, scores: enrichedScores });
}
