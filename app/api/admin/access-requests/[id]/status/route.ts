import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { tryCreateNotification } from "@/lib/notifications";
import { adminAccessRequestsTable, usersTable } from "@/db/schema";

const updateAccessRequestSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);

  try {
    if (!(await requireAdmin())) {
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

    const [existingRequest] = await db
      .select({
        id: adminAccessRequestsTable.id,
        email: adminAccessRequestsTable.email,
      })
      .from(adminAccessRequestsTable)
      .where(eq(adminAccessRequestsTable.id, id))
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(adminAccessRequestsTable)
      .set({
        status: parsed.data.status,
        notes: parsed.data.notes?.trim() || null,
        reviewedAt: parsed.data.status === "pending" ? null : new Date(),
      })
      .where(eq(adminAccessRequestsTable.id, id))
      .returning({
        id: adminAccessRequestsTable.id,
        status: adminAccessRequestsTable.status,
        reviewedAt: adminAccessRequestsTable.reviewedAt,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "Access request not found", requestId },
        { status: 404 }
      );
    }

    const [matchedUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, existingRequest.email))
      .limit(1);

    if (matchedUser) {
      await tryCreateNotification({
        userId: matchedUser.id,
        role: "jobseeker",
        type: "account",
        title: "Access Request Updated",
        message: `Your admin access request status is now ${updated.status}.`,
        relatedId: updated.id,
        relatedType: null,
      });
    }

    return NextResponse.json(
      { message: "Access request updated", request: updated, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin access request update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
