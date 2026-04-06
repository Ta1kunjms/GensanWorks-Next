import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { applicationsTable, referralsTable } from "@/db/schema";

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
        {
          status: 429,
          headers: {
            "X-Request-ID": requestId,
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const { referralId } = await context.params;

    const existing = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.id, referralId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      return NextResponse.json({ error: "Referral not found", requestId }, { status: 404 });
    }

    await db.delete(referralsTable).where(eq(referralsTable.id, referralId));

    if (existing.applicationId) {
      await db.delete(applicationsTable).where(eq(applicationsTable.id, existing.applicationId));
    }

    return NextResponse.json(
      {
        success: true,
        referralId,
      },
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
