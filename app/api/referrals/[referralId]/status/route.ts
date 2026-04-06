import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { applicationsTable, referralsTable, usersTable } from "@/db/schema";

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
    case "For Interview":
      return "interview" as const;
    case "Hired":
      return "hired" as const;
    case "Rejected":
      return "rejected" as const;
    case "Withdrawn":
      return "withdrawn" as const;
    case "Pending":
    default:
      return "pending" as const;
  }
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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
        {
          status: 429,
          headers: {
            "X-Request-ID": requestId,
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const { referralId } = await context.params;
    const body = patchReferralStatusSchema.parse(await req.json());

    const normalizedStatus = normalizeReferralStatus(body.status);
    const remarks = body.feedback?.trim() || null;

    const existing = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.id, referralId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    const [updated] = await db
      .update(referralsTable)
      .set({
        status: normalizedStatus,
        remarks,
        updatedAt: new Date(),
      })
      .where(eq(referralsTable.id, referralId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Referral update failed", requestId }, { status: 500 });
    }

    const applicationStatus = mapReferralToApplicationStatus(normalizedStatus);

    const linkedApplication = updated.applicationId
      ? await db
          .select()
          .from(applicationsTable)
          .where(eq(applicationsTable.id, updated.applicationId))
          .limit(1)
          .then((rows) => rows[0])
      : await db
          .select()
          .from(applicationsTable)
          .where(
            and(
              eq(applicationsTable.applicantId, updated.applicantId),
              eq(applicationsTable.jobId, updated.jobId),
              eq(applicationsTable.employerId, updated.employerId)
            )
          )
          .orderBy(desc(applicationsTable.createdAt))
          .limit(1)
          .then((rows) => rows[0]);

    if (linkedApplication) {
      await db
        .update(applicationsTable)
        .set({
          status: applicationStatus,
          feedback: remarks,
          updatedAt: new Date(),
        })
        .where(eq(applicationsTable.id, linkedApplication.id));
    }

    if (normalizedStatus === "Hired") {
      const applicant = await db
        .select({ id: usersTable.id, employmentStatus: usersTable.employmentStatus })
        .from(usersTable)
        .where(eq(usersTable.id, updated.applicantId))
        .limit(1)
        .then((rows) => rows[0]);

      if (applicant && !applicant.employmentStatus) {
        await db
          .update(usersTable)
          .set({ employmentStatus: "Employed", updatedAt: new Date() })
          .where(eq(usersTable.id, applicant.id));
      }
    }

    return NextResponse.json(
      {
        id: updated.id,
        referralId: updated.id,
        applicantId: updated.applicantId,
        employerId: updated.employerId,
        vacancyId: updated.jobId,
        jobId: updated.jobId,
        applicationId: updated.applicationId,
        applicant: updated.applicant,
        employer: updated.employer,
        vacancy: updated.vacancy,
        dateReferred: toIso(updated.dateReferred),
        status: normalizedStatus,
        feedback: updated.remarks ?? "",
        remarks: updated.remarks ?? "",
        referralSlipNumber: updated.referralSlipNumber,
        updatedAt: toIso(updated.updatedAt),
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
        {
          error: firstIssue?.message || "Invalid request body",
          field: firstIssue?.path?.[0],
          requestId,
        },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/referrals/[referralId]/status] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
