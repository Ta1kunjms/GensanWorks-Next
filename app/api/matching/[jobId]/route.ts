import { NextRequest, NextResponse } from "next/server";
import { runMatching } from "@/lib/matching/agent";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body = await req.json();
    const { jobseekerId, weights } = body as { jobseekerId?: string; weights?: Record<string, number> };

    if (!jobseekerId) {
      return NextResponse.json(
        { error: "jobseekerId is required" },
        { status: 400 }
      );
    }

    const result = await runMatching({
      jobseeker_id: jobseekerId,
      job_id: jobId,
      weights
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 500 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "An error occurred during matching";
    console.error("Matching API Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { searchParams } = new URL(req.url);
    const jobseekerId = searchParams.get("jobseekerId");

    if (!jobseekerId) {
      return NextResponse.json(
        { error: "jobseekerId is required in query params" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("job_match_scores")
      .select("*")
      .eq("job_id", jobId)
      .eq("jobseeker_id", jobseekerId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data) {
      return NextResponse.json({ message: "No match score found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "An error occurred fetching the match score";
    console.error("Matching GET Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
