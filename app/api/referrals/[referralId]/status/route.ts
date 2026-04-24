import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

const patchReferralStatusSchema = z
  .object({
    status: z.string().min(1),
    feedback: z.string().optional(),
  })
  .strict();

function normalizeReferralStatus(value?: string | null) {
  if (!value) return "Pending" as const;
  const normalized = value.trim().toLowerCase();
  if (normalized === "for interview" || normalized === "interview") return "For Interview" as const;
  if (normalized === "hired") return "Hired" as const;
  if (normalized === "rejected") return "Rejected" as const;
  if (normalized === "withdrawn") return "Withdrawn" as const;
  return "Pending" as const;
}

function mapReferralToApplicationStatus(status: ReturnType<typeof normalizeReferralStatus>) {
  switch (status) {
    case "For Interview": return "interview" as const;
    case "Hired": return "hired" as const;
    case "Rejected": return "rejected" as const;
    case "Withdrawn": return "withdrawn" as const;
    case "Pending": return "pending" as const;
  }
}

function toIso(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  return null;
}

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function PATCH(req: Request, context: { params: Promise<{ referralId: string }> }) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `referrals:update:${identity.userId}:${clientIp}`,
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const { referralId } = await context.params;
    const body = patchReferralStatusSchema.parse(await req.json());

    const normalizedStatus = normalizeReferralStatus(body.status);
    const remarks = String(body.feedback ?? "").trim() || null;

    const existing = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (!existing.data) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    const updated = await supabaseAdmin
      .from("referrals")
      .update({
        status: normalizedStatus,
        remarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referralId)
      .select("*")
      .single();

    if (!updated.data) {
      return NextResponse.json({ error: "Referral update failed", requestId }, { status: 500 });
    }

    const applicationStatus = mapReferralToApplicationStatus(normalizedStatus);

    if (updated.data.application_id) {
      await supabaseAdmin
        .from("applications")
        .update({ status: applicationStatus, feedback: remarks, updated_at: new Date().toISOString() })
        .eq("id", updated.data.application_id);
    } else {
      const found = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("applicant_id", updated.data.applicant_id)
        .eq("job_id", updated.data.job_id)
        .eq("employer_id", updated.data.employer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (found.data) {
        await supabaseAdmin
          .from("applications")
          .update({ status: applicationStatus, feedback: remarks, updated_at: new Date().toISOString() })
          .eq("id", found.data.id);
      }
    }

    if (normalizedStatus === "Hired") {
      const applicant = await supabaseAdmin
        .from("users")
        .select("id, employment_status")
        .eq("id", updated.data.applicant_id)
        .single();

      if (applicant.data && !applicant.data.employment_status) {
        await supabaseAdmin
          .from("users")
          .update({ employment_status: "Employed", updated_at: new Date().toISOString() })
          .eq("id", applicant.data.id);
      }
    }

    return NextResponse.json(
      {
        id: updated.data.id,
        referralId: updated.data.id,
        applicantId: updated.data.applicant_id,
        employerId: updated.data.employer_id,
        vacancyId: updated.data.job_id,
        jobId: updated.data.job_id,
        applicationId: updated.data.application_id,
        applicant: updated.data.applicant,
        employer: updated.data.employer,
        vacancy: updated.data.vacancy,
        dateReferred: toIso(updated.data.date_referred),
        status: normalizedStatus,
        feedback: updated.data.remarks ?? "",
        remarks: updated.data.remarks ?? "",
        referralSlipNumber: updated.data.referral_slip_number,
        updatedAt: toIso(updated.data.updated_at),
      },
      {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid request body", field: firstIssue?.path?.[0], requestId },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/referrals/[referralId]/status] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}