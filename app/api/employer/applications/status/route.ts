import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const schema = z.object({
  applicationId: z.string().uuid().optional(),
  jobseekerId: z.string().min(1).optional(),
  jobId: z.string().uuid().optional(),
  status: z.enum(["under_review", "interview", "hired", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
  interviewDate: z.string().datetime().optional(),
});

const STATUS_MESSAGES: Record<"under_review" | "interview" | "hired" | "rejected", { title: string; body: string }> = {
  under_review: { title: "Application Under Review", body: "Your application is being reviewed by the employer." },
  interview: { title: "Interview Scheduled!", body: "Congratulations! The employer wants to schedule an interview with you." },
  hired: { title: "🎉 You've Been Hired!", body: "Congratulations! The employer has selected you for the position." },
  rejected: { title: "Application Update", body: "The employer has reviewed your application and decided to move forward with other candidates." },
};

export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { applicationId, jobseekerId, jobId, status, rejectionReason, interviewDate } = parsed.data;

  // Build the update payload
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (rejectionReason) updatePayload.rejection_reason = rejectionReason;
  if (interviewDate) updatePayload.interview_date = interviewDate;

  // Find the application
  let query = supabaseAdmin.from("applications").update(updatePayload).eq("employer_id", user.id);

  if (applicationId) {
    query = query.eq("id", applicationId);
  } else if (jobseekerId && jobId) {
    query = query.eq("jobseeker_id", jobseekerId).eq("job_id", jobId);
  } else if (jobseekerId) {
    query = query.eq("jobseeker_id", jobseekerId);
  } else {
    return NextResponse.json({ error: "Must provide applicationId or jobseekerId" }, { status: 400 });
  }

  const { error, data } = await query.select("id, jobseeker_id, job_id").maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }

  // Send notification to jobseeker
  if (data?.jobseeker_id) {
    const msgConfig = STATUS_MESSAGES[status];
    const bodyText = status === "rejected" && rejectionReason
      ? `${msgConfig.body} Reason: ${rejectionReason}`
      : status === "interview" && interviewDate
        ? `${msgConfig.body} Interview scheduled for ${new Date(interviewDate).toLocaleDateString()}.`
        : msgConfig.body;

    await tryCreateNotification({
      userId: data.jobseeker_id,
      role: "jobseeker",
      type: "application_status",
      title: msgConfig.title,
      message: bodyText,
      relatedId: data.id,
      relatedType: "application",
    });
  }

  return NextResponse.json({ success: true, status });
}
