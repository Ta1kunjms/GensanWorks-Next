import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
  adminNote: z.string().max(1000).optional(),
});

// GET — fetch full SRS profile + approval history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: employer } = await supabaseAdmin
    .from("employers")
    .select("id, establishment_name, email, contact_person, contact_phone, address, city, business_type, employee_count, srs_status, srs_rejection_reason, srs_submitted_at, srs_approved_at, srs_version")
    .eq("id", id)
    .maybeSingle();

  if (!employer) return NextResponse.json({ error: "Employer not found" }, { status: 404 });

  // Fetch uploaded documents
  const { data: docs } = await supabaseAdmin
    .from("employer_documents")
    .select("id, name, url, doc_type")
    .eq("employer_id", id);

  // Fetch approval history (from audit_logs or a dedicated table if exists)
  const { data: history } = await supabaseAdmin
    .from("srs_approval_history")
    .select("id, action, reason, admin_name, created_at")
    .eq("employer_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const profile = {
    id: employer.id,
    establishmentName: employer.establishment_name,
    email: employer.email,
    contactPerson: employer.contact_person,
    contactPhone: employer.contact_phone,
    address: employer.address,
    city: employer.city,
    businessType: employer.business_type,
    employeeCount: employer.employee_count,
    srsStatus: employer.srs_status,
    srsRejectionReason: employer.srs_rejection_reason,
    srsSubmittedAt: employer.srs_submitted_at,
    srsApprovedAt: employer.srs_approved_at,
    srsVersion: employer.srs_version ?? 1,
    documents: (docs ?? []).map((d) => ({ name: d.name, url: d.url, type: d.doc_type })),
  };

  return NextResponse.json({
    profile,
    history: (history ?? []).map((h) => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      adminName: h.admin_name,
      createdAt: h.created_at,
    })),
  });
}

// PATCH — approve or reject SRS
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, rejectionReason, adminNote } = parsed.data;
  const now = new Date().toISOString();

  // Update employer SRS status
  const updatePayload: Record<string, unknown> = {
    srs_status: action === "approve" ? "approved" : "rejected",
    updated_at: now,
  };
  if (action === "approve") updatePayload.srs_approved_at = now;
  if (action === "reject" && rejectionReason) updatePayload.srs_rejection_reason = rejectionReason;
  if (action === "approve") updatePayload.srs_rejection_reason = null;

  await supabaseAdmin.from("employers").update(updatePayload).eq("id", id);

  // If rejected, pause all active job postings
  if (action === "reject") {
    await supabaseAdmin
      .from("jobs")
      .update({ is_published: false, updated_at: now })
      .eq("employer_id", id)
      .eq("is_published", true);
  }

  // Log to approval history
  await supabaseAdmin.from("srs_approval_history").insert({
    employer_id: id,
    action,
    reason: rejectionReason ?? null,
    admin_note: adminNote ?? null,
    admin_id: user.id,
    admin_name: user.name ?? "Admin",
    created_at: now,
  });

  // Notify employer
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

  return NextResponse.json({ success: true, action });
}
