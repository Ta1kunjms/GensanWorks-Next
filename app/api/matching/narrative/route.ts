import { NextRequest, NextResponse } from "next/server";
import { ExplanationService } from "@/lib/matching/services/ExplanationService";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || !user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. "jobseeker" role is forbidden entirely
    if (user.role === "jobseeker") {
      return NextResponse.json(
        { error: "Forbidden: Recruiter narratives are for employer/admin review only." },
        { status: 403 }
      );
    }

    if (user.role !== "admin" && user.role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobId, jobseekerId } = await req.json();
    if (!jobId || !jobseekerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. "employer" role ownership check: verify against jobs.employer_id in DB
    if (user.role === "employer") {
      const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("id, employer_id")
        .eq("id", jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (job.employer_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only request narratives for jobs you own." },
          { status: 403 }
        );
      }
    }

    // 3. "admin" role bypasses the ownership check and can access any job/jobseeker pair
    const narrative = await ExplanationService.generateNarrative(jobId, jobseekerId);
    return NextResponse.json(narrative);
  } catch (error: any) {
    console.error("Narrative API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
