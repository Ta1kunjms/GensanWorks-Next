export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

type AccountRole = "admin" | "employer" | "jobseeker";

async function isAdminSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function hasValidCronSecret(req: Request) {
  const expected = process.env.ACCOUNT_DELETION_CRON_SECRET;
  if (!expected) {
    return false;
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  return provided.length > 0 && provided === expected;
}

function hasE2EMutationSignal(req: Request) {
  return req.headers.get("x-e2e-mutations") === "1" || process.env.E2E_ALLOW_MUTATIONS === "1";
}

function shouldIncludePendingForE2E(req: Request, isAdmin: boolean) {
  if (!isAdmin) return false;
  const includePendingRequested = new URL(req.url).searchParams.get("includePending") === "1";
  if (!includePendingRequested) return false;
  return process.env.NODE_ENV !== "production" && hasE2EMutationSignal(req);
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:account-deletion:process:${clientIp}`,
      maxRequests: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const [adminOk, cronOk] = await Promise.all([isAdminSession(), Promise.resolve(hasValidCronSecret(req))]);

    if (!adminOk && !cronOk) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const includePending = shouldIncludePendingForE2E(req, adminOk);
    const targetEmail = includePending
      ? new URL(req.url).searchParams.get("targetEmail")?.trim().toLowerCase() || null
      : null;

    const now = new Date();
    let query = supabaseAdmin
      .from("account_deletion_requests")
      .select("id, role, user_id")
      .eq("status", "pending")
      .order("delete_after", { ascending: true })
      .limit(200);

    if (!includePending) {
      query = query.lte("delete_after", now.toISOString());
    }

    if (targetEmail) {
      query = query.eq("email", targetEmail);
    }

    const dueRequests = await query;
    const rows = dueRequests.data ?? [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          message: includePending ? "No pending account deletions" : "No due account deletions",
          processedCount: 0,
          mode: includePending ? "includePending" : "dueOnly",
          targetEmail,
          requestId,
        },
        { headers: { "x-request-id": requestId } }
      );
    }

    const byRole: Record<AccountRole, string[]> = {
      admin: [],
      employer: [],
      jobseeker: [],
    };

    rows.forEach((item: Record<string, unknown>) => {
      const role = item.role as AccountRole;
      if (role === "admin" || role === "employer" || role === "jobseeker") {
        byRole[role].push(String(item.user_id));
      }
    });

    const nowIso = now.toISOString();

    await Promise.all([
      byRole.admin.length > 0
        ? supabaseAdmin
            .from("admins")
            .update({ is_active: false, updated_at: nowIso })
            .in("id", byRole.admin)
        : Promise.resolve(),
      byRole.employer.length > 0
        ? supabaseAdmin
            .from("employers")
            .update({ is_active: false, account_status: "suspended", updated_at: nowIso })
            .in("id", byRole.employer)
        : Promise.resolve(),
      byRole.jobseeker.length > 0
        ? supabaseAdmin
            .from("users")
            .update({ is_active: false, updated_at: nowIso })
            .in("id", byRole.jobseeker)
        : Promise.resolve(),
    ]);

    await supabaseAdmin
      .from("account_deletion_requests")
      .update({
        status: "processed",
        processed_at: nowIso,
        updated_at: nowIso,
      })
      .in(
        "id",
        rows.map((item: Record<string, unknown>) => String(item.id))
      );

    return NextResponse.json(
      {
        message: "Account deletions processed",
        processedCount: rows.length,
        processedIds: rows.map((item: Record<string, unknown>) => String(item.id)),
        mode: includePending ? "includePending" : "dueOnly",
        targetEmail,
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Account deletion processor error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}