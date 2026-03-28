import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  parseBoundedInt,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { adminAccessRequestsTable } from "@/db/schema";

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

    const query = db
      .select({
        id: adminAccessRequestsTable.id,
        name: adminAccessRequestsTable.name,
        email: adminAccessRequestsTable.email,
        phone: adminAccessRequestsTable.phone,
        organization: adminAccessRequestsTable.organization,
        status: adminAccessRequestsTable.status,
        notes: adminAccessRequestsTable.notes,
        createdAt: adminAccessRequestsTable.createdAt,
        reviewedAt: adminAccessRequestsTable.reviewedAt,
      })
      .from(adminAccessRequestsTable)
      .orderBy(desc(adminAccessRequestsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const requests =
      normalizedStatus === "all"
        ? await query
        : await query.where(eq(adminAccessRequestsTable.status, normalizedStatus));

    return NextResponse.json(
      {
        requests,
        status: normalizedStatus,
        pagination: {
          limit,
          offset,
        },
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin access requests list error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
