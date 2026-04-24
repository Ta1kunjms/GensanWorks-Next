import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PASSWORD_REGEX } from "@/lib/constants";
import { consumeLifecycleToken } from "@/lib/auth-account-tokens";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { hashPassword } from "@/lib/utils";

const confirmResetSchema = z
  .object({
    token: z.string().min(12).max(512),
    newPassword: z.string().regex(PASSWORD_REGEX),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:reset-confirm:ip:${clientIp}`,
      maxRequests: 15,
      windowMs: 60_000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: ipRateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const parsed = confirmResetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const tokenRateLimit = enforceRateLimit({
      key: `auth:reset-confirm:token:${parsed.data.token}`,
      maxRequests: 6,
      windowMs: 15 * 60_000,
    });

    if (!tokenRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: tokenRateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const tokenPayload = await consumeLifecycleToken(parsed.data.token, "password_reset");
    if (!tokenPayload) {
      return NextResponse.json({ error: "Invalid or expired token", requestId }, { status: 400 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    const now = new Date().toISOString();

    const tableMap: Record<string, string> = {
      admin: "admins",
      employer: "employers",
      jobseeker: "users",
    };
    const table = tableMap[tokenPayload.role] || "users";

    const { error } = await db
      .from(table)
      .update({ password_hash: newHash, updated_at: now })
      .eq("id", tokenPayload.userId);

    if (error) {
      console.error("Password reset error:", error);
      return NextResponse.json({ error: "Failed to reset password", requestId }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Password reset successfully", requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Reset password confirm error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}