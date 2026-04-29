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

    // Map signal type to weight modifiers
    const weightMap: Record<string, number> = {
      'shortlisted': 1.2,
      'rejected': 0.5,
      'hired': 2.0,
      'viewed': 1.0
    };

    const modifier = weightMap[signalType] || 1.0;

    const { error } = await supabaseAdmin
      .from("hiring_feedback_signals")
      .insert({
        job_id: jobId,
        jobseeker_id: jobseekerId,
        signal_type: signalType,
        weight_modifier: modifier,
        model_version: "hybrid-v1"
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
