import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { signRealtimeSocketToken } from "@/lib/realtime-socket-auth";

export const runtime = "nodejs";

const SOCKET_SESSION_LIMIT_PER_MINUTE = 30;

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; role?: string }
    | undefined;

  if (!user?.id || !user.role) {
    return null;
  }

  if (
    user.role !== "admin" &&
    user.role !== "employer" &&
    user.role !== "jobseeker"
  ) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role as "admin" | "employer" | "jobseeker",
  };
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const identity = await getSessionIdentity();

  if (!identity) {
    return NextResponse.json(
      { error: "Authentication required", requestId },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const clientIp = getClientIp(request);
  const limitResult = enforceRateLimit({
    key: `realtime-socket-session:${identity.userId}:${clientIp}`,
    maxRequests: SOCKET_SESSION_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        error: "Too many realtime session requests",
        requestId,
        retryAfterSeconds: limitResult.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "x-request-id": requestId,
          "retry-after": String(limitResult.resetInSeconds),
          "x-ratelimit-limit": String(SOCKET_SESSION_LIMIT_PER_MINUTE),
          "x-ratelimit-remaining": String(limitResult.remaining),
          "x-ratelimit-reset": String(limitResult.resetInSeconds),
        },
      }
    );
  }

  const token = signRealtimeSocketToken({
    userId: identity.userId,
    role: identity.role,
    ttlSeconds: 300,
  });

  if (!token) {
    return NextResponse.json(
      {
        error: "Realtime session signing is unavailable",
        requestId,
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  return NextResponse.json(
    {
      token,
      role: identity.role,
      userId: identity.userId,
      expiresInSeconds: 300,
      requestId,
    },
    {
      headers: {
        "x-request-id": requestId,
        "x-ratelimit-limit": String(SOCKET_SESSION_LIMIT_PER_MINUTE),
        "x-ratelimit-remaining": String(limitResult.remaining),
        "x-ratelimit-reset": String(limitResult.resetInSeconds),
      },
    },
  );
}
