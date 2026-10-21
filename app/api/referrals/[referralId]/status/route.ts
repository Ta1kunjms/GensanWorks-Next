import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";
import { isUuid } from "@/lib/postgrest-safe";

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

    // Only PESO admins, or the employer the referral was made to, may change it.
    if (identity.role !== "admin" && identity.role !== "employer") {
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    const { referralId } = await context.params;
    if (!isUuid(referralId)) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }
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
    if (identity.role === "employer" && existing.data.employer_id !== identity.userId) {
      // Not this employer's referral: respond as not found (no existence leak).
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    // referrals has no remarks column; feedback is kept in the audit trail.
    const updated = await supabaseAdmin
      .from("referrals")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referralId)
      .select("*")
      .single();

    if (updated.error || !updated.data) {
      return NextResponse.json({ error: "Referral update failed", requestId }, { status: 500 });
    }

    const applicationStatus = mapReferralToApplicationStatus(normalizedStatus);

    if (updated.data.application_id) {
      await supabaseAdmin
        .from("applications")
        .update({ status: applicationStatus, updated_at: new Date().toISOString() })
        .eq("id", updated.data.application_id);
    } else {
      const found = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("jobseeker_id", updated.data.jobseeker_id)
        .eq("job_id", updated.data.job_id)
        .eq("employer_id", updated.data.employer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (found.data) {
        await supabaseAdmin
          .from("applications")
          .update({ status: applicationStatus, updated_at: new Date().toISOString() })
          .eq("id", found.data.id);
      }
    }

    if (normalizedStatus === "Hired") {
      // Task 13G: "jobseekers" replaces the retired "users" table.
      // Task 13I: corrected lookup key to updated.data.jobseeker_id to align
      // with the canonical schema contract.
      const applicant = await supabaseAdmin
        .from("jobseekers")
        .select("id, employment_status")
        .eq("id", updated.data.jobseeker_id)
        .single();

      if (applicant.data && !applicant.data.employment_status) {
        await supabaseAdmin
          .from("jobseekers")
          .update({ employment_status: "Employed", updated_at: new Date().toISOString() })
          .eq("id", applicant.data.id);
      }
    }

    await logAuditAction({
      userId: identity.userId,
      role: identity.role,
      action: "referral_update",
      resourceType: "referral",
      resourceId: updated.data.id,
      payload: { change: "status", from: existing.data.status, to: normalizedStatus, feedback: remarks },
      req,
    });

    return NextResponse.json(
      {
        id: updated.data.id,
        referralId: updated.data.id,
        applicantId: updated.data.jobseeker_id,
        employerId: updated.data.employer_id,
        vacancyId: updated.data.job_id,
        jobId: updated.data.job_id,
        applicationId: updated.data.application_id,
        dateReferred: toIso(updated.data.date_referred),
        status: normalizedStatus,
        feedback: remarks ?? "",
        remarks: remarks ?? "",
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