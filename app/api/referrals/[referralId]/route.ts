import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role };
}

export async function DELETE(req: Request, context: { params: Promise<{ referralId: string }> }) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
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

    const existing = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (!existing.data) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    await supabaseAdmin.from("referrals").delete().eq("id", referralId);

    if (existing.data.application_id) {
      await supabaseAdmin.from("applications").delete().eq("id", existing.data.application_id);
    }

    return NextResponse.json(
      { success: true, referralId },
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