import { NextRequest, NextResponse } from "next/server";
import { ExplanationService } from "@/lib/matching/services/ExplanationService";
import { auth } from "@/lib/auth";

/**
 * POST /api/matching/narrative
 * Body: { jobId, jobseekerId }
 * 
 * Generates and returns a recruiter narrative for a specific match.
 * Decoupled from the ranking pipeline for maximum performance.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobseekerId } = await req.json();

    if (!jobId || !jobseekerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const narrative = await ExplanationService.generateNarrative(jobId, jobseekerId);

    return NextResponse.json(narrative);
  } catch (error: any) {
    console.error("Narrative API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
