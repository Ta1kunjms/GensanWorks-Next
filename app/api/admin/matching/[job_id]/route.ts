import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { HybridEngine } from "@/lib/matching/engine/HybridEngine";
import { persistenceEngine } from "@/lib/matching/persistence-engine";

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

  const { data: scores } = await supabaseAdmin
    .from("job_match_scores")
    .select(
      "id, jobseeker_id, utility_score, grade, suitability_score, dimension_scores, summary, strengths, gaps, bias_flags, constraint_violations, ai_summary, computed_at, sent_to_employer, match_evidence"
    )
    .eq("job_id", job_id)
    .order("utility_score", { ascending: false, nullsFirst: false })
    .limit(100);

  if (!scores || scores.length === 0) {
    return NextResponse.json({
      job,
      scores: [],
      totalScored: 0,
      lastComputedAt: null,
      sentToEmployer: false,
    });
  }

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
    const resolvedScore = (score.utility_score ?? score.suitability_score ?? 0) as number;
    return {
      rank: idx + 1,
      jobseekerId: score.jobseeker_id,
      name: resolvedName,
      email: resolvedEmail,
      nsrpId: profile?.nsrp_id ?? null,
      jobSeekingStatus: profile?.job_seeking_status ?? "not_looking",
      utilityScore: resolvedScore,
      grade: score.grade ?? null,
      dimensionScores: score.dimension_scores ?? null,
      summary: score.summary ?? score.ai_summary ?? null,
      strengths: score.strengths ?? score.top_reasons ?? [],
      gaps: score.gaps ?? [],
      biasFlags: score.bias_flags ?? [],
      constraintViolations: score.constraint_violations ?? [],
      suitabilityScore: resolvedScore,
      scoreBreakdown: score.score_breakdown ?? score.dimension_scores ?? null,
      topReasons: score.top_reasons ?? score.strengths ?? [],
      aiSummary: score.ai_summary ?? score.summary ?? null,
      matchEvidence: score.match_evidence ?? null,
      computedAt: score.computed_at,
      sentToEmployer: score.sent_to_employer,
    };
  });

  return NextResponse.json({
    job,
    scores: enrichedScores,
    totalScored: enrichedScores.length,
    lastComputedAt: scores[0]?.computed_at ?? null,
    sentToEmployer: scores.some((s) => s.sent_to_employer),
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
    const results = await HybridEngine.match(job_id);

    // 2. Persist results for UI retrieval
    await persistenceEngine.saveRankingResults(job_id, results);

    console.log(`[Matching API] Hybrid Engine completed. Ranked ${results.length} candidates.`);

    return NextResponse.json({
      scored: results.length,
      success: true
    });
  } catch (error: any) {
    console.error("[Matching API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = (await req.json()) as { employerId: string };
  const { employerId } = body;

  if (!employerId) return NextResponse.json({ error: "employerId required" }, { status: 400 });

  await supabaseAdmin
    .from("job_match_scores")
    .update({ sent_to_employer: true, sent_at: new Date().toISOString() })
    .eq("job_id", job_id);

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("position_title")
    .eq("id", job_id)
    .single();

  await tryCreateNotification({
    userId: employerId,
    role: "employer",
    type: "matching_report",
    title: "AI Suitability Matching Report Ready",
    message: `Your AI matching report for "${job?.position_title ?? "your job posting"}" is now available. View ranked candidates by suitability score.`,
    relatedId: job_id,
    relatedType: "job",
  });

  return NextResponse.json({ success: true });
}
