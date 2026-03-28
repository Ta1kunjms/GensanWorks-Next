import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { accountDeletionRequestsTable } from "@/db/schema";

type AccountRole = "admin" | "employer" | "jobseeker";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  if (user.role !== "admin" && user.role !== "employer" && user.role !== "jobseeker") return null;
  return { userId: user.id, role: user.role as AccountRole };
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `auth:account-deletion:cancel:${identity.userId}:${clientIp}`,
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(accountDeletionRequestsTable)
      .set({
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(accountDeletionRequestsTable.role, identity.role),
          eq(accountDeletionRequestsTable.userId, identity.userId),
          eq(accountDeletionRequestsTable.status, "pending")
        )
      )
      .returning({ id: accountDeletionRequestsTable.id });

    if (!updated) {
      return NextResponse.json(
        { error: "No pending account deletion request found", requestId },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Account deletion request cancelled",
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Account deletion cancel error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
