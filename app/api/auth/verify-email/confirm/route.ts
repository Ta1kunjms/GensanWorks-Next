import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeLifecycleToken,
  markEmailVerified,
} from "@/lib/auth-account-tokens";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";

const verifyConfirmSchema = z
  .object({
    token: z.string().min(12).max(512),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:verify-confirm:ip:${clientIp}`,
      maxRequests: 20,
      windowMs: 60_000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: ipRateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const parsed = verifyConfirmSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const tokenRateLimit = enforceRateLimit({
      key: `auth:verify-confirm:token:${parsed.data.token}`,
      maxRequests: 8,
      windowMs: 24 * 60 * 60_000,
    });

    if (!tokenRateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: tokenRateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const tokenPayload = await consumeLifecycleToken(parsed.data.token, "email_verify");
    if (!tokenPayload) {
      return NextResponse.json({ error: "Invalid or expired token", requestId }, { status: 400 });
    }

    await markEmailVerified(tokenPayload.role, tokenPayload.userId, tokenPayload.email);

    return NextResponse.json(
      {
        message: "Email verified successfully",
        verifiedEmail: tokenPayload.email,
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Verify email confirm error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
