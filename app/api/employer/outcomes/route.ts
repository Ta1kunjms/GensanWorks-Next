export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isUuid } from "@/lib/postgrest-safe";
import { recordHiringOutcome, computeRecalibrationSignal } from "@/lib/matching/employer-feedback";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== "employer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { job_id, jobseeker_id, outcome, notes } = body;

    if (!isUuid(job_id) || !isUuid(jobseeker_id) || !outcome) {
      return NextResponse.json({ error: "job_id, jobseeker_id, and outcome are required" }, { status: 400 });
    }

    const validOutcomes = ["hired", "shortlisted", "interviewed", "rejected", "withdrew"];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of: ${validOutcomes.join(", ")}` }, { status: 400 });
    }

    // Outcomes feed fairness evidence and recalibration: only for this employer's
    // own job, and only for a jobseeker who applied or was referred to it.
    const [{ data: job }, apps, refs] = await Promise.all([
      supabaseAdmin.from("jobs").select("employer_id").eq("id", job_id).maybeSingle(),
      supabaseAdmin.from("applications").select("id", { count: "exact", head: true }).eq("job_id", job_id).eq("jobseeker_id", jobseeker_id),
      supabaseAdmin.from("referrals").select("id", { count: "exact", head: true }).eq("job_id", job_id).eq("jobseeker_id", jobseeker_id),
    ]);
    if (!job || job.employer_id !== user.id || ((apps.count ?? 0) === 0 && (refs.count ?? 0) === 0)) {
      return NextResponse.json({ error: "Job or candidate not found" }, { status: 404 });
    }

    const { data: matchScore } = await supabaseAdmin
      .from("job_match_scores")
      .select("utility_score, dimension_scores")
      .eq("job_id", job_id)
      .eq("jobseeker_id", jobseeker_id)
      .maybeSingle();

    const scoreAtDecision = matchScore?.utility_score ?? null;
    const dimSnapshot = matchScore?.dimension_scores ?? {};

    await recordHiringOutcome(supabaseAdmin, {
      job_id,
      jobseeker_id,
      employer_id: user.id,
      outcome,
      match_score_at_decision: scoreAtDecision,
      dimension_scores_snapshot: dimSnapshot,
      ...(typeof notes === "string" && notes.trim() ? { employer_notes: notes.trim().slice(0, 2000) } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Employer Outcomes] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId query parameter required" }, { status: 400 });
    }

    const signal = await computeRecalibrationSignal(supabaseAdmin, jobId);
    if (!signal) {
      return NextResponse.json({ sample_size: 0, note: "Insufficient data — need at least 5 outcomes to compute recalibration signal." });
    }

    return NextResponse.json(signal);
  } catch (error: any) {
    console.error("[Employer Outcomes] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
