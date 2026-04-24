import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { auth } from "@/lib/auth";
import { getTypingTtlMs, setTypingState } from "@/lib/message-typing-state";
import { publishRealtimeEvent } from "@/lib/realtime-events";

const setTypingSchema = z
  .object({
    peerId: z.string().min(1).max(64),
    isTyping: z.boolean().optional(),
  })
  .strict();

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, userName: user.name ?? null };
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
      key: `messages:typing:${identity.userId}:${clientIp}`,
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

    const parsed = setTypingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    if (payload.peerId === identity.userId) {
      return NextResponse.json({ error: "Cannot set typing status for self", requestId }, { status: 400 });
    }

    const isTyping = payload.isTyping ?? true;
    const updatedAt = new Date().toISOString();
    setTypingState({
      sourceUserId: identity.userId,
      sourceUserName: identity.userName,
      targetUserId: payload.peerId,
      isTyping,
    });

    publishRealtimeEvent({
      type: "message:typing",
      userId: payload.peerId,
      payload: {
        sourceUserId: identity.userId,
        sourceUserName: identity.userName,
        isTyping,
        updatedAt,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        isTyping,
        peerId: payload.peerId,
        expiresInMs: isTyping ? getTypingTtlMs() : 0,
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "x-ratelimit-remaining": String(rateLimit.remaining),
          "x-ratelimit-reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error) {
    console.error("Message typing update error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
