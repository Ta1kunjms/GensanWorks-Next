export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";

const updateAccessRequestSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id && user.role === "admin" ? user.id : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);

  try {
    const adminId = await requireAdmin();
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:access-requests:update:${clientIp}`,
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
        { status: 429 }
      );
    }

    const { id } = await params;
    const parsed = updateAccessRequestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const existing = await supabaseAdmin
      .from("admin_access_requests")
      .select("id, email")
      .eq("id", id)
      .single();

    if (existing.error || !existing.data) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    // Live columns: status, reviewed_by, reviewed_at (no notes column; the
    // admin's note is kept in the audit log).
    const updates: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status !== "pending") {
      updates.reviewed_at = new Date().toISOString();
      updates.reviewed_by = adminId;
    }

    const updated = await supabaseAdmin
      .from("admin_access_requests")
      .update(updates)
      .eq("id", id)
      .select("id, status, reviewed_at")
      .single();

    if (updated.error || !updated.data) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    await logAuditAction({
      userId: adminId,
      role: "admin",
      action: parsed.data.status === "approved" ? "admin_request_approve" : "admin_request_reject",
      resourceType: "admin_request",
      resourceId: id,
      payload: { status: parsed.data.status, note: parsed.data.notes?.trim() || null },
      req,
    });

    // No in-app notification is sent. admin_access_requests stores only an
    // email, and the requester has no role-profile identity (admins,
    // employers, jobseekers) established by this lifecycle, so there is no
    // supported recipient id. Do not resolve one by email here; recipient
    // delivery for access-request decisions is pending a product decision.

    return NextResponse.json(
      { message: "Access request updated", request: updated.data, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin access request update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}