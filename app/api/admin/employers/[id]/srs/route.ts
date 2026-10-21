export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { isUuid } from "@/lib/postgrest-safe";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
  adminNote: z.string().max(1000).optional(),
});

const SRS_DOCUMENT_FIELDS = [
  { column: "srs_form_file", name: "SRS Form", type: "srs_form" },
  { column: "business_permit_file", name: "Business Permit", type: "business_permit" },
  { column: "bir_2303_file", name: "BIR 2303", type: "bir_2303" },
  { column: "company_profile_file", name: "Company Profile", type: "company_profile" },
  { column: "dole_certification_file", name: "DOLE Certification", type: "dole_certification" },
] as const;

// The employer's SRS review state is its account_status (pending | approved |
// rejected | suspended); verified_at records the approval time. Review history
// (who, when, reason) is kept in audit_logs.
const EMPLOYER_COLUMNS =
  "id, establishment_name, email, contact_person, contact_phone, address, city, industry, total_paid_employees, " +
  "account_status, verified_at, created_at, updated_at, srs_form_file, business_permit_file, bir_2303_file, " +
  "company_profile_file, dole_certification_file";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  return user?.id && user.role === "admin" ? user : null;
}

// GET — employer SRS profile + review history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Employer not found" }, { status: 404 });

  const { data: employer, error } = await supabaseAdmin
    .from("employers")
    .select(EMPLOYER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("SRS profile: employer lookup failed", { code: error.code });
    return NextResponse.json({ error: "Failed to load employer" }, { status: 500 });
  }
  if (!employer) return NextResponse.json({ error: "Employer not found" }, { status: 404 });

  const row = employer as unknown as Record<string, unknown>;
  const documents = SRS_DOCUMENT_FIELDS.flatMap(({ column, name, type }) => {
    const url = row[column];
    return typeof url === "string" && url.trim() ? [{ name, url, type }] : [];
  });

  const { data: history } = await supabaseAdmin
    .from("audit_logs")
    .select("id, user_id, action, payload, created_at")
    .eq("resource_type", "employer_profile")
    .eq("resource_id", id)
    .in("action", ["employer_approve", "employer_reject"])
    .order("created_at", { ascending: false })
    .limit(20);

  const adminIds = Array.from(new Set((history ?? []).map((h) => h.user_id).filter(Boolean)));
  const { data: admins } = adminIds.length
    ? await supabaseAdmin.from("admins").select("id, name").in("id", adminIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const adminNames = new Map((admins ?? []).map((a) => [a.id, a.name]));

  const lastReview = (history ?? [])[0];
  const lastPayload = (lastReview?.payload ?? {}) as { reason?: string | null };

  return NextResponse.json({
    profile: {
      id: row.id,
      establishmentName: row.establishment_name,
      email: row.email,
      contactPerson: row.contact_person,
      contactPhone: row.contact_phone,
      address: row.address,
      city: row.city,
      businessType: row.industry,
      employeeCount: row.total_paid_employees,
      srsStatus: row.account_status ?? "pending",
      srsRejectionReason: row.account_status === "rejected" ? lastPayload.reason ?? null : null,
      srsSubmittedAt: row.created_at,
      srsApprovedAt: row.verified_at ?? null,
      srsVersion: 1,
      documents,
    },
    history: (history ?? []).map((h) => {
      const payload = (h.payload ?? {}) as { action?: string; reason?: string | null };
      return {
        id: h.id,
        action: payload.action ?? (h.action === "employer_approve" ? "approve" : "reject"),
        reason: payload.reason ?? null,
        adminName: adminNames.get(h.user_id) ?? "Admin",
        createdAt: h.created_at,
      };
    }),
  });
}

// PATCH — approve or reject the employer's SRS / account
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Employer not found" }, { status: 404 });
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { action, rejectionReason, adminNote } = parsed.data;
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("employers")
    .select("id, account_status")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    console.error("SRS review: employer lookup failed", { code: lookupError.code });
    return NextResponse.json({ error: "Failed to load employer" }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "Employer not found" }, { status: 404 });

  // Separate requests, not a transaction: partial progress is reported explicitly.
  const updatePayload: Record<string, unknown> =
    action === "approve"
      ? { account_status: "approved", verified_at: now, is_active: true, updated_at: now }
      : { account_status: "rejected", verified_at: null, updated_at: now };

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("employers")
    .update(updatePayload)
    .eq("id", id)
    .select("id");

  if (updateError || !updatedRows?.length) {
    if (updateError) console.error("SRS review: employer status update failed", { code: updateError.code });
    return NextResponse.json({ error: "SRS status was not updated", statusUpdated: false }, { status: 500 });
  }

  // If rejected, take the employer's live job postings offline.
  let jobsPaused: boolean | undefined;
  if (action === "reject") {
    const { error: pauseError } = await supabaseAdmin
      .from("jobs")
      .update({ is_active: false, updated_at: now })
      .eq("employer_id", id)
      .eq("is_active", true);
    jobsPaused = !pauseError;
    if (pauseError) console.error("SRS review: job pause failed", { code: pauseError.code });
  }

  // The review history is the audit trail, so its write is checked (logAuditAction swallows errors).
  const { error: historyError } = await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id!,
    role: "admin",
    action: action === "approve" ? "employer_approve" : "employer_reject",
    resource_type: "employer_profile",
    resource_id: id,
    payload: {
      action,
      from: existing.account_status,
      to: updatePayload.account_status,
      reason: rejectionReason ?? null,
      note: adminNote ?? null,
    },
    ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    user_agent: req.headers.get("user-agent"),
  });
  const historyRecorded = !historyError;
  if (historyError) console.error("SRS review: history insert failed", { code: historyError.code });

  const notifTitle = action === "approve"
    ? "✅ SRS Profile Approved — You Can Now Post Jobs!"
    : "❌ SRS Profile Rejected";
  const notifBody = action === "approve"
    ? "Your business profile has been verified and approved by PESO. You can now post job openings."
    : `Your SRS profile submission was rejected. Reason: ${rejectionReason ?? "Please contact PESO for details."}`;

  await tryCreateNotification({
    userId: id,
    role: "employer",
    type: "srs_review",
    title: notifTitle,
    message: notifBody,
    relatedId: id,
    relatedType: "employer",
  });

  if (jobsPaused === false) {
    return NextResponse.json(
      { error: "SRS status was updated, but active job postings could not be paused", statusUpdated: true, jobsPaused, historyRecorded },
      { status: 500 }
    );
  }
  if (!historyRecorded) {
    return NextResponse.json(
      {
        error: "SRS status was updated, but the approval history was not recorded",
        statusUpdated: true,
        ...(jobsPaused !== undefined ? { jobsPaused } : {}),
        historyRecorded,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, action });
}
