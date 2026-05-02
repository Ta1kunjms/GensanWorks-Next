export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const applySchema = z
  .object({
    jobId: z.string().uuid(),
    coverLetter: z.string().max(5000).optional(),
    resumeUrl: z.string().max(500).optional(),
  })
  .strict();

async function getJobseekerSession() {
  const session = await auth();
  const user = session?.user as { role?: string; id?: string; email?: string; name?: string } | undefined;
  return {
    isJobseeker: user?.role === "jobseeker",
    applicantId: user?.id,
    applicantEmail: user?.email,
    applicantName: user?.name,
  };
}

export async function GET() {
  try {
    const { isJobseeker, applicantId } = await getJobseekerSession();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await supabaseAdmin
      .from("applications")
      .select(
        `id, status, source, submitted_at, reviewed_at, feedback, interview_date, job_id,
         jobs!inner(
           position_title,
           employers!inner(establishment_name, city, province, location)
         ),
         referral_slips(qr_code_url, slip_number)`
      )
      .eq("applicant_id", applicantId)
      .order("submitted_at", { ascending: false });

    const applications = (result.data ?? []).map((a: Record<string, unknown>) => {
      const job = a.jobs as Record<string, unknown> | null;
      const employer = job?.employers as Record<string, unknown> | null;
      const city = employer?.city as string | null;
      const province = employer?.province as string | null;
      const location = (employer?.location as string | null)
        ?? [city, province].filter(Boolean).join(", ")
        ?? null;

      return {
        id: a.id,
        status: a.status,
        source: a.source,
        submittedAt: a.submitted_at,
        reviewedAt: a.reviewed_at,
        feedback: a.feedback,
        interviewDate: a.interview_date,
        jobId: a.job_id,
        positionTitle: job?.position_title ?? null,
        location,
        employerName: employer?.establishment_name ?? null,
        qrCodeUrl: (a.referral_slips as any)?.[0]?.qr_code_url ?? null,
        slipNumber: (a.referral_slips as any)?.[0]?.slip_number ?? null,
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Jobseeker applications list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isJobseeker, applicantId, applicantEmail, applicantName } = await getJobseekerSession();
    if (!isJobseeker || !applicantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = applySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const jobResult = await supabaseAdmin
      .from("jobs")
      .select("id, employer_id, position_title, status, is_published, archived")
      .eq("id", parsed.data.jobId)
      .single();

    const job = jobResult.data;

    if (!job || job.status !== "active" || !job.is_published || job.archived) {
      return NextResponse.json({ error: "Job is not available for application" }, { status: 400 });
    }

    const existingResult = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("applicant_id", applicantId)
      .eq("job_id", parsed.data.jobId)
      .single();

    if (existingResult.data) {
      return NextResponse.json({ error: "You already applied to this job" }, { status: 409 });
    }

    const userResult = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", applicantId)
      .single();

    const userProfile = userResult.data;

    const inserted = await supabaseAdmin
      .from("applications")
      .insert({
        job_id: parsed.data.jobId,
        applicant_id: applicantId,
        employer_id: job.employer_id,
        applicant_name: userProfile?.name ?? applicantName ?? null,
        applicant_email: userProfile?.email ?? applicantEmail ?? null,
        cover_letter: parsed.data.coverLetter?.trim() || null,
        resume_url: parsed.data.resumeUrl?.trim() || null,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select("id, job_id, status, submitted_at")
      .single();

    if (inserted.error || !inserted.data) {
      return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
    }

    await tryCreateNotification({
      userId: applicantId,
      role: "jobseeker",
      type: "application",
      title: "Application Submitted",
      message: `Your application for ${job.position_title} was submitted successfully.`,
      relatedId: inserted.data.id,
      relatedType: "application",
    });

    await tryCreateNotification({
      userId: job.employer_id,
      role: "employer",
      type: "application",
      title: "New Job Application",
      message: `${userProfile?.name ?? applicantName ?? "A candidate"} applied for ${job.position_title}.`,
      relatedId: inserted.data.id,
      relatedType: "application",
    });

    return NextResponse.json({ message: "Application submitted", application: inserted.data }, { status: 201 });
  } catch (error) {
    console.error("Job application submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}