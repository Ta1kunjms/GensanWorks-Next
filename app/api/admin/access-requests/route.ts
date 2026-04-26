import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  parseBoundedInt,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:access-requests:list:${clientIp}`,
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
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "pending";
    const limit = parseBoundedInt(searchParams.get("limit"), {
      fallback: 50,
      min: 1,
      max: 200,
    });
    const offset = parseBoundedInt(searchParams.get("offset"), {
      fallback: 0,
      min: 0,
      max: 10_000,
    });

    const validStatuses = ["pending", "approved", "rejected", "all"] as const;
    const normalizedStatus = validStatuses.includes(
      statusFilter as (typeof validStatuses)[number]
    )
      ? (statusFilter as (typeof validStatuses)[number])
      : "pending";

    let query = supabaseAdmin
      .from("admin_access_requests")
      .select(
        "id, name, email, phone, organization, status, notes, created_at, reviewed_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (normalizedStatus !== "all") {
      query = query.eq("status", normalizedStatus);
    }

    const result = await query;
    const requests = (result.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      organization: r.organization,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
    }));

    return NextResponse.json(
      {
        requests,
        status: normalizedStatus,
        pagination: { limit, offset },
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin access requests list error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}