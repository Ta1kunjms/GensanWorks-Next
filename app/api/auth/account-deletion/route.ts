import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

type AccountRole = "admin" | "employer" | "jobseeker";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  if (user.role !== "admin" && user.role !== "employer" && user.role !== "jobseeker") return null;
  return { userId: user.id, role: user.role as AccountRole };
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
      key: `auth:account-deletion:status:${identity.userId}:${clientIp}`,
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const result = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id, status, requested_at, delete_after, processed_at, updated_at")
      .eq("role", identity.role)
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;

    // No cancelled_at column: a cancelled request's last update is its cancellation time.
    const latest = result.data
      ? { ...result.data, cancelled_at: result.data.status === "cancelled" ? result.data.updated_at : null }
      : null;

    return NextResponse.json(
      {
        deletionRequest: latest ?? null,
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Account deletion status error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}