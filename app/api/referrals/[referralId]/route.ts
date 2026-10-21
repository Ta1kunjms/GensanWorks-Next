import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";
import { isUuid } from "@/lib/postgrest-safe";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

// "Deleting" a referral withdraws it (admin only). Recruitment records are never
// hard-deleted, and the linked application is left in place for the audit trail.
export async function DELETE(req: Request, context: { params: Promise<{ referralId: string }> }) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
    if (identity.role !== "admin") {
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `referrals:delete:${identity.userId}:${clientIp}`,
      maxRequests: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const { referralId } = await context.params;
    if (!isUuid(referralId)) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    const existing = await supabaseAdmin
      .from("referrals")
      .select("id, status")
      .eq("id", referralId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    const updated = await supabaseAdmin
      .from("referrals")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", referralId)
      .select("id")
      .maybeSingle();
    if (updated.error) throw updated.error;

    await logAuditAction({
      userId: identity.userId,
      role: identity.role,
      action: "referral_withdraw",
      resourceType: "referral",
      resourceId: referralId,
      payload: { from: existing.data.status, to: "withdrawn" },
      req,
    });

    return NextResponse.json(
      { success: true, referralId, status: "withdrawn" },
      {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error) {
    console.error("[DELETE /api/referrals/[referralId]] Failed:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
