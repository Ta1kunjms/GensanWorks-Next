export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { auditDemographicDisparity } from "@/lib/matching/bias-audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, position_title, created_at, employers(establishment_name)")
      .order("created_at", { ascending: false });

    return NextResponse.json({ jobs: jobs ?? [] });
  }

  const { data: scores, error: scoresError } = await supabaseAdmin
    .from("job_match_scores")
    .select(`
      id, jobseeker_id, utility_score, suitability_score, grade, dimension_scores,
      constraint_violations, match_evidence, strengths, gaps, computed_at,
      jobseekers!inner (
        first_name, last_name, email, gender, date_of_birth:birth_date, logistics_zone:city
      )
    `)
    .eq("job_id", jobId)
    .order("utility_score", { ascending: false, nullsFirst: false });
  if (scoresError) {
    return NextResponse.json({ error: "Failed to load match scores" }, { status: 500 });
  }

  const scoresArr = scores as any[] | null;

  if (!scoresArr || scoresArr.length === 0) {
    return NextResponse.json({
      jobId,
      auditReport: null,
      candidates: [],
      totalCandidates: 0,
    });
  }

  const auditReport = await auditDemographicDisparity(supabaseAdmin, jobId);

  const candidates = scoresArr.map((s, idx) => {
    const profile = s.jobseekers;
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Unknown";
    const ds = (s.dimension_scores ?? {}) as Record<string, unknown>;
    const rawScore = (s.suitability_score ?? s.utility_score ?? 0) as number;
    const confidenceBand = rawScore >= 72 ? "high" : rawScore >= 48 ? "medium" : "low";

    let ageBracket = "unknown";
    if (profile?.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) ageBracket = "under_18";
      else if (age <= 24) ageBracket = "18-24";
      else if (age <= 34) ageBracket = "25-34";
      else if (age <= 44) ageBracket = "35-44";
      else if (age <= 54) ageBracket = "45-54";
      else ageBracket = "55+";
    }

    return {
      rank: idx + 1,
      jobseekerId: s.jobseeker_id,
      name: fullName,
      email: profile?.email ?? "",
      utilityScore: s.utility_score,
      suitabilityScore: s.suitability_score,
      finalScore: s.suitability_score,
      grade: s.grade,
      confidenceBand,
      dimensionScores: ds,
      constraintViolations: s.constraint_violations ?? [],
      hasEvidence: (s.match_evidence as any)?.explanation != null,
      strengths: s.strengths ?? [],
      gaps: s.gaps ?? [],
      computedAt: s.computed_at,
      gender: profile?.gender ?? "unknown",
      ageBracket,
      logisticsZone: profile?.logistics_zone ?? "unknown",
      educationLevel: "unknown", // no education level column on jobseekers
    };
  });

  return NextResponse.json({
    jobId,
    auditReport,
    candidates,
    totalCandidates: candidates.length,
  });
}
