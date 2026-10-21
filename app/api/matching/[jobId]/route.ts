import { NextRequest, NextResponse } from "next/server";
import { runMatching } from "@/lib/matching/agent";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { isUuid } from "@/lib/postgrest-safe";

// Single-pair matching runs the LLM narrative stage (cost) and exposes scores:
// PESO administrators only.
async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { jobId } = await params;
    const body = await req.json();
    const { jobseekerId, weights } = body as { jobseekerId?: string; weights?: Record<string, number> };

    if (!isUuid(jobId) || !isUuid(jobseekerId)) {
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
      return NextResponse.json({ error: "Matching failed", code: result.error.code }, { status: 500 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    console.error("Matching API Error:", error);
    return NextResponse.json({ error: "An error occurred during matching" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
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
    console.error("Matching GET Error:", error);
    return NextResponse.json({ error: "An error occurred fetching the match score" }, { status: 500 });
  }
}
