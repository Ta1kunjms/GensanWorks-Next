import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().max(500).optional(),
});

type SessionUser = {
  id?: string;
  role?: "admin" | "employer" | "jobseeker";
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - must be logged in" },
        { status: 401, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const userRole = (session.user as SessionUser).role;
    if (userRole !== "jobseeker") {
      return NextResponse.json(
        { error: "Only jobseekers can apply for jobs" },
        { status: 403, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const rateLimitResult = enforceRateLimit({
      key: `apply:${session.user.id}:daily`,
      maxRequests: 10,
      windowMs: 86400000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limited - maximum 10 applications per day" },
        {
          status: 429,
          headers: {
            "X-Request-ID": getRequestId(request),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetInSeconds),
          },
        }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const { coverLetter, resumeUrl } = parsed.data;

    const jobResult = await supabaseAdmin
      .from("jobs")
      .select("id, employer_id, is_published, archived")
      .eq("id", jobId)
      .single();

    const jobData = jobResult.data;

    if (!jobData?.id) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    if (!jobData.is_published || jobData.archived) {
      return NextResponse.json(
        { error: "This job is no longer available" },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const existingResult = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", session.user.id!)
      .single();

    if (existingResult.data) {
      return NextResponse.json(
        { error: "You have already applied for this job" },
        { status: 400, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const applicantResult = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", session.user.id!)
      .single();

    const applicantData = applicantResult.data as Record<string, unknown>;

    if (!applicantData) {
      return NextResponse.json(
        { error: "Applicant info not found" },
        { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    const inserted = await supabaseAdmin
      .from("applications")
      .insert({
        job_id: jobId,
        applicant_id: session.user.id!,
        employer_id: jobData.employer_id,
        applicant_name: applicantData.name,
        applicant_email: applicantData.email,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl || null,
        status: "pending",
      })
      .select("*")
      .single();

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully",
        application: inserted.data,
      },
      { headers: { "X-Request-ID": getRequestId(request) } }
    );
  } catch (error) {
    console.error("[POST /api/jobs/[id]/apply] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": getRequestId(request) } }
    );
  }
}