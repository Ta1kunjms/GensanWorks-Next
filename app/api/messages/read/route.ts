import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { incrementRealtimeMetric } from "@/lib/realtime-metrics";
import { messagesTable } from "@/db/schema";

const markReadSchema = z
  .object({
    peerId: z.string().min(1).max(64).optional(),
    messageIds: z.array(z.string().min(1)).max(200).optional(),
  })
  .strict()
  .refine((payload) => Boolean(payload.peerId || payload.messageIds?.length), {
    message: "Provide peerId or messageIds",
  });

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id };
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `messages:read:${identity.userId}:${clientIp}`,
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "x-ratelimit-remaining": String(rateLimit.remaining),
            "x-ratelimit-reset": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const parsed = markReadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const now = new Date();

    const filters = [
      eq(messagesTable.recipientId, identity.userId),
      eq(messagesTable.read, false),
    ];

    if (payload.peerId) {
      filters.push(eq(messagesTable.senderId, payload.peerId));
    }

    if (payload.messageIds?.length) {
      filters.push(inArray(messagesTable.id, payload.messageIds));
    }

    const updatedRows = await db
      .update(messagesTable)
      .set({ read: true, readAt: now, updatedAt: now })
      .where(and(...filters))
      .returning({ id: messagesTable.id });

    if (updatedRows.length > 0) {
      incrementRealtimeMetric("messages_read_updates", updatedRows.length);
    }

    const [unreadRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(and(eq(messagesTable.recipientId, identity.userId), eq(messagesTable.read, false)));

    return NextResponse.json({
      updatedCount: updatedRows.length,
      updatedIds: updatedRows.map((row) => row.id),
      unreadCount: Number(unreadRow?.count ?? 0),
      requestId,
    }, {
      headers: {
        "x-request-id": requestId,
        "x-ratelimit-remaining": String(rateLimit.remaining),
        "x-ratelimit-reset": String(rateLimit.resetInSeconds),
      },
    });
  } catch (error) {
    console.error("Message mark-read error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
