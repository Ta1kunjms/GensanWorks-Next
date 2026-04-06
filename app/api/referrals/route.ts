import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId, parseBoundedInt } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { applicationsTable, employersTable, jobsTable, referralsTable, usersTable } from "@/db/schema";

type ReferralStatus = "Pending" | "For Interview" | "Hired" | "Rejected" | "Withdrawn";

const createReferralSchema = z
  .object({
    referralId: z.string().optional(),
    applicantId: z.string().min(1),
    applicant: z.string().optional(),
    employerId: z.string().optional(),
    employer: z.string().optional(),
    vacancyId: z.string().optional(),
    jobId: z.string().optional(),
    vacancy: z.string().optional(),
    status: z.string().optional(),
    feedback: z.string().optional(),
    remarks: z.string().optional(),
    referralSlipNumber: z.string().optional(),
    pesoOfficerName: z.string().optional(),
    pesoOfficerDesignation: z.string().optional(),
    dateReferred: z.string().optional(),
    applicationId: z.string().optional(),
  })
  .strict();

function normalizeReferralStatus(value?: string | null): ReferralStatus {
  if (!value) return "Pending";

  const normalized = value.trim().toLowerCase();
  if (normalized === "for interview" || normalized === "interview") return "For Interview";
  if (normalized === "hired") return "Hired";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "withdrawn") return "Withdrawn";
  return "Pending";
}

function mapReferralToApplicationStatus(status: ReferralStatus):
  | "pending"
  | "interview"
  | "hired"
  | "rejected"
  | "withdrawn" {
  switch (status) {
    case "For Interview":
      return "interview";
    case "Hired":
      return "hired";
    case "Rejected":
      return "rejected";
    case "Withdrawn":
      return "withdrawn";
    case "Pending":
    default:
      return "pending";
  }
}

function statusColor(status: ReferralStatus) {
  switch (status) {
    case "Hired":
      return "green";
    case "Rejected":
      return "red";
    case "For Interview":
      return "blue";
    case "Withdrawn":
      return "gray";
    case "Pending":
    default:
      return "yellow";
  }
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toSafeDate(raw?: string) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatApplicantName(user: { name: string | null } | undefined, fallback?: string | null) {
  const fromUser = user?.name?.trim();
  if (fromUser) return fromUser;
  const fromFallback = fallback?.trim();
  if (fromFallback) return fromFallback;
  return "Unknown Applicant";
}

function mapReferralRecord(params: {
  row: typeof referralsTable.$inferSelect;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  vacancyTitle: string;
  vacancyLocation: string | null;
  employerName: string;
}) {
  const status = normalizeReferralStatus(params.row.status);
  const dateReferred = toIso(params.row.dateReferred) ?? new Date().toISOString();

  return {
    id: params.row.id,
    referralId: params.row.id,
    applicantId: params.row.applicantId,
    employerId: params.row.employerId,
    vacancyId: params.row.jobId,
    jobId: params.row.jobId,
    applicationId: params.row.applicationId,
    applicant: params.applicantName,
    employer: params.employerName,
    vacancy: params.vacancyTitle,
    dateReferred,
    status,
    statusColor: statusColor(status),
    feedback: params.row.remarks ?? "",
    remarks: params.row.remarks ?? "",
    referralSlipNumber: params.row.referralSlipNumber,
    pesoOfficerName: params.row.pesoOfficerName,
    pesoOfficerDesignation: params.row.pesoOfficerDesignation,
    createdAt: toIso(params.row.createdAt),
    updatedAt: toIso(params.row.updatedAt),
    applicantDetails: {
      id: params.row.applicantId,
      name: params.applicantName,
      email: params.applicantEmail,
      phone: params.applicantPhone,
    },
    job: {
      id: params.row.jobId,
      title: params.vacancyTitle,
      location: params.vacancyLocation,
    },
  };
}

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `referrals:list:${identity.userId}:${clientIp}`,
      maxRequests: 120,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const employerFilter = searchParams.get("employer")?.trim().toLowerCase();
    const startDate = toSafeDate(searchParams.get("startDate") ?? undefined);
    const endDate = toSafeDate(searchParams.get("endDate") ?? undefined);

    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 100,
      min: 1,
      max: 500,
    });
    const offset = parseBoundedInt(searchParams.get("offset"), {
      fallback: 0,
      min: 0,
      max: 5000,
    });

    const rows = await db.select().from(referralsTable).orderBy(desc(referralsTable.createdAt));

    const applicantIds = Array.from(new Set(rows.map((row) => row.applicantId)));
    const jobIds = Array.from(new Set(rows.map((row) => row.jobId)));
    const employerIds = Array.from(new Set(rows.map((row) => row.employerId)));

    const [applicants, jobs, employers] = await Promise.all([
      applicantIds.length
        ? db
            .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone })
            .from(usersTable)
            .where(inArray(usersTable.id, applicantIds))
        : Promise.resolve([]),
      jobIds.length
        ? db
            .select({ id: jobsTable.id, title: jobsTable.positionTitle, location: jobsTable.location, employerId: jobsTable.employerId })
            .from(jobsTable)
            .where(inArray(jobsTable.id, jobIds))
        : Promise.resolve([]),
      employerIds.length
        ? db
            .select({ id: employersTable.id, name: employersTable.establishmentName })
            .from(employersTable)
            .where(inArray(employersTable.id, employerIds))
        : Promise.resolve([]),
    ]);

    const applicantsById = new Map(applicants.map((item) => [item.id, item]));
    const jobsById = new Map(jobs.map((item) => [item.id, item]));
    const employersById = new Map(employers.map((item) => [item.id, item]));

    let mapped = rows.map((row) => {
      const applicant = applicantsById.get(row.applicantId);
      const job = jobsById.get(row.jobId);
      const employer = employersById.get(row.employerId);

      return mapReferralRecord({
        row,
        applicantName: formatApplicantName(applicant, row.applicant),
        applicantEmail: applicant?.email ?? null,
        applicantPhone: applicant?.phone ?? null,
        vacancyTitle: row.vacancy?.trim() || job?.title?.trim() || "Untitled role",
        vacancyLocation: job?.location ?? null,
        employerName: row.employer?.trim() || employer?.name?.trim() || "Unknown employer",
      });
    });

    if (statusFilter && statusFilter.toLowerCase() !== "all") {
      const normalizedStatus = normalizeReferralStatus(statusFilter);
      mapped = mapped.filter((row) => row.status === normalizedStatus);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      mapped = mapped.filter((row) => {
        const date = row.dateReferred ? new Date(row.dateReferred) : null;
        return Boolean(date && date >= start && date <= end);
      });
    }

    if (employerFilter) {
      mapped = mapped.filter((row) => row.employer.toLowerCase().includes(employerFilter));
    }

    const total = mapped.length;
    const paginated = mapped.slice(offset, offset + limit);

    return NextResponse.json(paginated, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "X-Total-Count": String(total),
        "X-Limit": String(limit),
        "X-Offset": String(offset),
      },
    });
  } catch (error) {
    console.error("[GET /api/referrals] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `referrals:create:${identity.userId}:${clientIp}`,
      maxRequests: 40,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
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

    const body = createReferralSchema.parse(await req.json());
    const jobId = body.jobId || body.vacancyId;

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing required fields: applicantId and vacancyId/jobId", requestId },
        { status: 400 }
      );
    }

    const [applicant, job] = await Promise.all([
      db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, employmentStatus: usersTable.employmentStatus })
        .from(usersTable)
        .where(eq(usersTable.id, body.applicantId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ id: jobsTable.id, title: jobsTable.positionTitle, location: jobsTable.location, employerId: jobsTable.employerId })
        .from(jobsTable)
        .where(eq(jobsTable.id, jobId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!job) {
      return NextResponse.json({ error: "Job not found", requestId }, { status: 404 });
    }

    const employerId = body.employerId || job.employerId;
    const employer = await db
      .select({ id: employersTable.id, name: employersTable.establishmentName })
      .from(employersTable)
      .where(eq(employersTable.id, employerId))
      .limit(1)
      .then((rows) => rows[0]);

    const referralStatus = normalizeReferralStatus(body.status);
    const referralDate = toSafeDate(body.dateReferred) ?? new Date();
    const remarks = body.feedback?.trim() || body.remarks?.trim() || null;

    const upsertValues = {
      applicantId: body.applicantId,
      employerId,
      jobId,
      applicationId: body.applicationId ?? null,
      applicant: body.applicant?.trim() || applicant?.name || "Unknown Applicant",
      employer: body.employer?.trim() || employer?.name || "Unknown Employer",
      vacancy: body.vacancy?.trim() || job.title || "Untitled role",
      status: referralStatus,
      referralSlipNumber: body.referralSlipNumber ?? null,
      pesoOfficerName: body.pesoOfficerName ?? null,
      pesoOfficerDesignation: body.pesoOfficerDesignation ?? null,
      dateReferred: referralDate,
      remarks,
      updatedAt: new Date(),
    } as const;

    let referral: typeof referralsTable.$inferSelect | undefined;

    if (body.referralId) {
      const existing = await db
        .select()
        .from(referralsTable)
        .where(eq(referralsTable.id, body.referralId))
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        const [updated] = await db
          .update(referralsTable)
          .set(upsertValues)
          .where(eq(referralsTable.id, body.referralId))
          .returning();
        referral = updated;
      }
    }

    if (!referral) {
      const [created] = await db
        .insert(referralsTable)
        .values({
          ...upsertValues,
          createdAt: new Date(),
        })
        .returning();
      referral = created;
    }

    if (!referral) {
      return NextResponse.json({ error: "Referral creation failed", requestId }, { status: 500 });
    }

    const applicationStatus = mapReferralToApplicationStatus(referralStatus);
    const linkedApplication = referral.applicationId
      ? await db
          .select()
          .from(applicationsTable)
          .where(eq(applicationsTable.id, referral.applicationId))
          .limit(1)
          .then((rows) => rows[0])
      : await db
          .select()
          .from(applicationsTable)
          .where(
            and(
              eq(applicationsTable.applicantId, referral.applicantId),
              eq(applicationsTable.jobId, referral.jobId),
              eq(applicationsTable.employerId, referral.employerId)
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
    } else {
      const [createdApplication] = await db
        .insert(applicationsTable)
        .values({
          jobId: referral.jobId,
          employerId: referral.employerId,
          applicantId: referral.applicantId,
          applicantName: referral.applicant,
          applicantEmail: applicant?.email ?? null,
          status: applicationStatus,
          feedback: remarks,
          submittedAt: referral.dateReferred,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: applicationsTable.id });

      if (!createdApplication) {
        return NextResponse.json(
          { error: "Application link creation failed", requestId },
          { status: 500 }
        );
      }

      await db
        .update(referralsTable)
        .set({ applicationId: createdApplication.id, updatedAt: new Date() })
        .where(eq(referralsTable.id, referral.id));

      referral.applicationId = createdApplication.id;
    }

    if (referralStatus === "Hired" && applicant && !applicant.employmentStatus) {
      await db
        .update(usersTable)
        .set({ employmentStatus: "Employed", updatedAt: new Date() })
        .where(eq(usersTable.id, applicant.id));
    }

    const responseBody = mapReferralRecord({
      row: referral,
      applicantName: formatApplicantName(applicant, referral.applicant),
      applicantEmail: applicant?.email ?? null,
      applicantPhone: null,
      vacancyTitle: referral.vacancy?.trim() || job.title || "Untitled role",
      vacancyLocation: job.location ?? null,
      employerName: referral.employer?.trim() || employer?.name || "Unknown employer",
    });

    return NextResponse.json(responseBody, {
      status: body.referralId ? 200 : 201,
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
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

    console.error("[POST /api/referrals] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
