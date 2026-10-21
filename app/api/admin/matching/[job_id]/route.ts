import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getMatchingReportSentAt, markMatchingReportSent } from "@/lib/matching/report-sent";
import { tryCreateNotification } from "@/lib/notifications";
import { HybridEngine } from "@/lib/matching/engine/HybridEngine";
import { persistenceEngine } from "@/lib/matching/persistence-engine";
import { invalidateTFIDFCache } from "@/lib/matching/agent";

export const dynamic = "force-dynamic";

// -- GET /api/admin/matching/[job_id] - Fetch existing scores --------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, employers(id, establishment_name)")
    .eq("id", job_id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: scores, error: scoresError } = await supabaseAdmin
    .from("job_match_scores")
    .select(
      "id, jobseeker_id, utility_score, grade, suitability_score, dimension_scores, summary, strengths, gaps, constraint_violations, ai_summary, computed_at, match_evidence"
    )
    .eq("job_id", job_id)
    .order("utility_score", { ascending: false, nullsFirst: false });
  if (scoresError) {
    console.error("[Admin matching] score fetch failed", { code: scoresError.code });
    return NextResponse.json({ error: "Failed to load match scores" }, { status: 500 });
  }

  const sentAt = (await getMatchingReportSentAt([job_id])).get(job_id) ?? null;

  if (!scores || scores.length === 0) {
    return NextResponse.json({
      job,
      scores: [],
      totalScored: 0,
      lastComputedAt: null,
      sentToEmployer: Boolean(sentAt),
    });
  }

  const jobseekerIds = scores.map((s) => s.jobseeker_id as string);

  const { data: profiles } = await supabaseAdmin
    .from("jobseekers")
    .select("id, nsrp_id, job_seeking_status, first_name, last_name, email, other_skills, other_skills_others")
    .in("id", jobseekerIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const enrichedScores = (scores as any[]).map((score, idx) => {
    const profile = profileMap.get(score.jobseeker_id as string);
    const fullName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
    const resolvedName = fullName || "Unknown";
    const resolvedEmail = profile?.email ?? "";
    const resolvedScore = (score.suitability_score ?? score.utility_score ?? 0) as number;
    
    // Derive confidence band from calibrated score (consistent with scoring-engine.ts)
    const confidence_band = resolvedScore >= 72 ? "high" : resolvedScore >= 48 ? "medium" : "low";

    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: resolvedName,
      email: resolvedEmail,
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",
      utilityScore: resolvedScore,
      final_score: resolvedScore,
      confidence_band,
      grade: score.grade ?? null,
      dimensionScores: score.dimension_scores ?? null,
      summary: score.summary ?? score.ai_summary ?? null,
      narrative: (score.dimension_scores as any)?.narrative ?? null,
      strengths: score.strengths ?? score.top_reasons ?? [],
      gaps: score.gaps ?? [],
      biasFlags: score.constraint_violations ?? [],
      constraint_violations: score.constraint_violations ?? [],
      suitabilityScore: resolvedScore,
      scoreBreakdown: score.score_breakdown ?? score.dimension_scores ?? null,
      topReasons: score.top_reasons ?? score.strengths ?? [],
      aiSummary: score.ai_summary ?? score.summary ?? null,
      matchEvidence: score.match_evidence ?? null,
      explanation: score.match_evidence?.explanation ?? score.explanation ?? null,
      computedAt: score.computed_at,
      sentToEmployer: Boolean(sentAt),
      skills: [
        ...((profile?.other_skills as any[])?.map(s => typeof s === 'string' ? s : s?.name).filter(Boolean) ?? []),
        ...(profile?.other_skills_others?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [])
      ],
    };
  });

  return NextResponse.json({
    job,
    scores: enrichedScores,
    totalScored: enrichedScores.length,
    lastComputedAt: scores[0]?.computed_at ?? null,
    sentToEmployer: Boolean(sentAt),
  });
}

// -- POST /api/admin/matching/[job_id] - Trigger Hybrid Matching -------
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { job_id } = await params;

    // 1. Run the new Hybrid Engine (includes retrieval + scoring)
    const results = await HybridEngine.match(job_id, true);

    // 2. Persist results for UI retrieval
    await persistenceEngine.saveRankingResults(job_id, results);

    // 3. Invalidate TF-IDF cache so next run picks up any new jobs/seekers
    invalidateTFIDFCache();

    console.log(`[Matching API] Hybrid Engine completed. Ranked ${results.length} candidates.`);

    return NextResponse.json({
      scored: results.length,
      success: true
    });
  } catch (error: any) {
    console.error("[Matching API] Error:", error);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}

// -- PATCH /api/admin/matching/[job_id] - Send report to employer ---------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job_id } = await params;

  // The report always goes to the job's own employer (a body employerId is ignored).
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("position_title, employer_id")
    .eq("id", job_id)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  if (!job?.employer_id) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { count: scoredCount } = await supabaseAdmin
    .from("job_match_scores")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job_id);
  if (!scoredCount) {
    return NextResponse.json({ error: "Run matching before sending a report" }, { status: 409 });
  }

  await markMatchingReportSent({ jobId: job_id, employerId: job.employer_id, adminId: user.id, scoredCount, req });

  await tryCreateNotification({
    userId: job.employer_id,
    role: "employer",
    type: "matching_report",
    title: "AI Suitability Matching Report Ready",
    message: `Your AI matching report for "${job?.position_title ?? "your job posting"}" is now available. View ranked candidates by suitability score.`,
    relatedId: job_id,
    relatedType: "job",
  });

  return NextResponse.json({ success: true });
}
