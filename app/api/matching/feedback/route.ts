import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/matching/feedback
 * Body: { jobId, jobseekerId, signalType }
 * 
 * Records recruiter actions (shortlist, reject, hire) to feed the ML model.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobseekerId, signalType } = await req.json();

    if (!jobId || !jobseekerId || !signalType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Map signal type to database interaction types and weights
    const signalMapping: Record<string, { type: string; weight: number }> = {
      shortlisted: { type: "interview_selected", weight: 0.5 },
      rejected: { type: "rejected", weight: -1.0 },
      hired: { type: "hired", weight: 1.0 },
      viewed: { type: "clicked_profile", weight: 0.2 },
    };

    const mapping = signalMapping[signalType] || { type: signalType, weight: 0.0 };

    const { error } = await supabaseAdmin
      .from("match_feedback_logs")
      .insert({
        job_id: jobId,
        jobseeker_id: jobseekerId,
        interaction_type: mapping.type,
        weight: mapping.weight,
        metadata: { model_version: "hybrid-v1" },
        captured_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
