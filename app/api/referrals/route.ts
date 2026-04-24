import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId, parseBoundedInt } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

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
    case "For Interview": return "interview";
    case "Hired": return "hired";
    case "Rejected": return "rejected";
    case "Withdrawn": return "withdrawn";
    case "Pending": return "pending";
  }
}

function statusColor(status: ReferralStatus) {
  switch (status) {
    case "Hired": return "green";
    case "Rejected": return "red";
    case "For Interview": return "blue";
    case "Withdrawn": return "gray";
    case "Pending": return "yellow";
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

function toSafeDate(raw?: string) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatApplicantName(user: Record<string, unknown> | null | undefined, fallback?: string | null) {
  const fromUser = String(user?.name ?? "").trim();
  if (fromUser) return fromUser;
  const fromFallback = String(fallback ?? "").trim();
  if (fromFallback) return fromFallback;
  return "Unknown Applicant";
}

function mapReferralRecord(params: {
  row: Record<string, unknown>;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  vacancyTitle: string;
  vacancyLocation: string | null;
  employerName: string;
}) {
  const status = normalizeReferralStatus(params.row.status as string | null);
  const dateReferred = toIso(params.row.date_referred) ?? new Date().toISOString();

  return {
    id: params.row.id,
    referralId: params.row.id,
    applicantId: params.row.applicant_id,
    employerId: params.row.employer_id,
    vacancyId: params.row.job_id,
    jobId: params.row.job_id,
    applicationId: params.row.application_id,
    applicant: params.applicantName,
    employer: params.employerName,
    vacancy: params.vacancyTitle,
    dateReferred,
    status,
    statusColor: statusColor(status),
    feedback: params.row.remarks ?? "",
    remarks: params.row.remarks ?? "",
    referralSlipNumber: params.row.referral_slip_number,
    pesoOfficerName: params.row.peso_officer_name,
    pesoOfficerDesignation: params.row.peso_officer_designation,
    createdAt: toIso(params.row.created_at),
    updatedAt: toIso(params.row.updated_at),
    applicantDetails: {
      id: params.row.applicant_id,
      name: params.applicantName,
      email: params.applicantEmail,
      phone: params.applicantPhone,
    },
    job: {
      id: params.row.job_id,
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
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const employerFilter = searchParams.get("employer")?.trim().toLowerCase();
    const startDate = toSafeDate(searchParams.get("startDate") ?? undefined);
    const endDate = toSafeDate(searchParams.get("endDate") ?? undefined);
    const limit = parseBoundedInt(searchParams.get("limit"), { fallback: 100, min: 1, max: 500 });
    const offset = parseBoundedInt(searchParams.get("offset"), { fallback: 0, min: 0, max: 5000 });

    const rowsResult = await supabaseAdmin
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    const rows = rowsResult.data ?? [];

    const applicantIds = Array.from(new Set(rows.map((row: Record<string, unknown>) => String(row.applicant_id)).filter(Boolean)));
    const jobIds = Array.from(new Set(rows.map((row: Record<string, unknown>) => String(row.job_id)).filter(Boolean)));
    const employerIds = Array.from(new Set(rows.map((row: Record<string, unknown>) => String(row.employer_id)).filter(Boolean)));

    const [applicantsResult, jobsResult, employersResult] = await Promise.all([
      applicantIds.length ? supabaseAdmin.from("users").select("id, name, email, phone").in("id", applicantIds) : Promise.resolve({ data: [] }),
      jobIds.length ? supabaseAdmin.from("jobs").select("id, position_title, location, employer_id").in("id", jobIds) : Promise.resolve({ data: [] }),
      employerIds.length ? supabaseAdmin.from("employers").select("id, establishment_name").in("id", employerIds) : Promise.resolve({ data: [] }),
    ]);

    const applicantsById = new Map((applicantsResult.data ?? []).map((item: Record<string, unknown>) => [String(item.id), item]));
    const jobsById = new Map((jobsResult.data ?? []).map((item: Record<string, unknown>) => [String(item.id), item]));
    const employersById = new Map((employersResult.data ?? []).map((item: Record<string, unknown>) => [String(item.id), item]));

    let mapped = rows.map((row: Record<string, unknown>) => {
      const applicant = applicantsById.get(String(row.applicant_id));
      const job = jobsById.get(String(row.job_id));
      const employer = employersById.get(String(row.employer_id));

      return mapReferralRecord({
        row,
        applicantName: formatApplicantName(applicant as Record<string, unknown> | null, String(row.applicant ?? "")),
        applicantEmail: applicant ? String(applicant.email) : null,
        applicantPhone: applicant ? String(applicant.phone) : null,
        vacancyTitle: String(row.vacancy ?? "").trim() || String(job?.position_title ?? "").trim() || "Untitled role",
        vacancyLocation: job ? String(job.location) : null,
        employerName: String(row.employer ?? "").trim() || String(employer?.establishment_name ?? "").trim() || "Unknown employer",
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
        const date = row.dateReferred ? new Date(String(row.dateReferred)) : null;
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
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
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

    const [applicantResult, jobResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, name, email, employment_status")
        .eq("id", body.applicantId)
        .single(),
      supabaseAdmin
        .from("jobs")
        .select("id, position_title, location, employer_id")
        .eq("id", jobId)
        .single(),
    ]);

    const job = jobResult.data;
    if (!job) {
      return NextResponse.json({ error: "Job not found", requestId }, { status: 404 });
    }

    const employerId = body.employerId || job.employer_id;
    const employerResult = await supabaseAdmin
      .from("employers")
      .select("id, establishment_name")
      .eq("id", employerId)
      .single();

    const referralStatus = normalizeReferralStatus(body.status);
    const referralDate = toSafeDate(body.dateReferred) ?? new Date();
    const remarks = String(body.feedback ?? body.remarks ?? "").trim() || null;

    const upsertValues: Record<string, unknown> = {
      applicant_id: body.applicantId,
      employer_id: employerId,
      job_id: jobId,
      application_id: body.applicationId ?? null,
      applicant: String(body.applicant ?? applicantResult.data?.name ?? "Unknown Applicant").trim(),
      employer: String(body.employer ?? employerResult.data?.establishment_name ?? "Unknown Employer").trim(),
      vacancy: String(body.vacancy ?? job.position_title ?? "Untitled role").trim(),
      status: referralStatus,
      referral_slip_number: body.referralSlipNumber ?? null,
      peso_officer_name: body.pesoOfficerName ?? null,
      peso_officer_designation: body.pesoOfficerDesignation ?? null,
      date_referred: referralDate.toISOString(),
      remarks,
      updated_at: new Date().toISOString(),
    };

    let referral: Record<string, unknown> | undefined;

    if (body.referralId) {
      const existing = await supabaseAdmin
        .from("referrals")
        .select("*")
        .eq("id", body.referralId)
        .single();

      if (existing.data) {
        const updated = await supabaseAdmin
          .from("referrals")
          .update(upsertValues)
          .eq("id", body.referralId)
          .select("*")
          .single();
        referral = updated.data;
      }
    }

    if (!referral) {
      const created = await supabaseAdmin
        .from("referrals")
        .insert({ ...upsertValues, created_at: new Date().toISOString() })
        .select("*")
        .single();
      referral = created.data;
    }

    if (!referral) {
      return NextResponse.json({ error: "Referral creation failed", requestId }, { status: 500 });
    }

    const applicationStatus = mapReferralToApplicationStatus(referralStatus);
    let linkedApplication: Record<string, unknown> | undefined;

    if (referral.application_id) {
      await supabaseAdmin
        .from("applications")
        .update({ status: applicationStatus, feedback: remarks, updated_at: new Date().toISOString() })
        .eq("id", referral.application_id);
    } else {
      const found = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("applicant_id", referral.applicant_id)
        .eq("job_id", referral.job_id)
        .eq("employer_id", referral.employer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      linkedApplication = found.data;
    }

    if (linkedApplication) {
      await supabaseAdmin
        .from("applications")
        .update({ status: applicationStatus, feedback: remarks, updated_at: new Date().toISOString() })
        .eq("id", linkedApplication.id);
    } else {
      const createdApp = await supabaseAdmin
        .from("applications")
        .insert({
          job_id: referral.job_id,
          employer_id: referral.employer_id,
          applicant_id: referral.applicant_id,
          applicant_name: referral.applicant,
          applicant_email: applicantResult.data?.email ?? null,
          status: applicationStatus,
          feedback: remarks,
          submitted_at: referral.date_referred,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createdApp.data) {
        await supabaseAdmin
          .from("referrals")
          .update({ application_id: createdApp.data.id, updated_at: new Date().toISOString() })
          .eq("id", referral.id);
        referral = { ...referral, application_id: createdApp.data.id };
      }
    }

    if (referralStatus === "Hired" && applicantResult.data && !applicantResult.data.employment_status) {
      await supabaseAdmin
        .from("users")
        .update({ employment_status: "Employed", updated_at: new Date().toISOString() })
        .eq("id", applicantResult.data.id);
    }

    const responseBody = mapReferralRecord({
      row: referral,
      applicantName: formatApplicantName(applicantResult.data as Record<string, unknown> | null, referral.applicant as string),
      applicantEmail: applicantResult.data?.email ?? null,
      applicantPhone: null,
      vacancyTitle: String(referral.vacancy ?? "").trim() || job.position_title || "Untitled role",
      vacancyLocation: job.location ?? null,
      employerName: String(referral.employer ?? "").trim() || employerResult.data?.establishment_name || "Unknown employer",
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