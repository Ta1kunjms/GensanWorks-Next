import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().max(500).optional(),
  expectedSalary: z.string().max(100).optional(),
  nsrpForwarded: z.boolean().optional().default(false),
  extraAttachments: z.array(z.string().url()).optional(),
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

    const { coverLetter, resumeUrl, expectedSalary, nsrpForwarded, extraAttachments } = parsed.data;

    const jobResult = await supabaseAdmin
      .from("jobs")
      .select("id, employer_id, job_status, is_active, archived, position_title")
      .eq("id", jobId)
      .single();

    const jobData = jobResult.data;

    if (!jobData?.id) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": getRequestId(request) } }
      );
    }

    if (jobData.job_status !== "Open" || !jobData.is_active || jobData.archived) {
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

    // The jobseekers table holds the canonical applicant record (no separate `users` table)
    const applicantResult = await supabaseAdmin
      .from("jobseekers")
      .select("first_name, last_name, email")
      .eq("id", session.user.id!)
      .single();

    const applicantData = applicantResult.data as Record<string, unknown> | null;

    // Fall back to session-provided identity if the DB lookup fails
    const applicantName = applicantData
      ? `${String(applicantData.first_name ?? "")} ${String(applicantData.last_name ?? "")}`.trim()
      : (session.user.name ?? null);
    const applicantEmail = applicantData
      ? String(applicantData.email ?? "")
      : (session.user.email ?? null);

    const inserted = await supabaseAdmin
      .from("applications")
      .insert({
        job_id: jobId,
        applicant_id: session.user.id!,
        employer_id: jobData.employer_id,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl || null,
        expected_salary: expectedSalary || null,
        nsrp_forwarded: nsrpForwarded,
        extra_attachments: extraAttachments ? JSON.stringify(extraAttachments) : '[]',
        status: "under_review", // phase 1 migration normalization
      })
      .select("*")
      .single();

    await logAuditAction({
      userId: session.user.id!,
      role: "jobseeker",
      action: "job_application_submit",
      resourceType: "application",
      resourceId: inserted.data.id,
      payload: { jobId },
      req: request,
    });

    // Auto-create message thread on submit
    try {
      const initialMessageContent = `Hello! I have submitted my application for the ${jobData.position_title || "position"}. Please review my profile and attachments. Thank you!`;
      await supabaseAdmin.from("messages").insert({
        sender_id: session.user.id!,
        recipient_id: jobData.employer_id,
        content: initialMessageContent,
        read: false,
      });
    } catch (msgError) {
      console.error("[POST /api/jobs/[id]/apply] Failed to auto-create message thread:", msgError);
    }

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