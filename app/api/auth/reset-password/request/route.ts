import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { issueLifecycleToken } from "@/lib/auth-account-tokens";
import { sendAuthLifecycleEmail } from "@/lib/auth-email";
import { adminsTable, employersTable, usersTable } from "@/db/schema";

const requestResetSchema = z
  .object({
    email: z.string().email().max(255),
    role: z.enum(["admin", "employer", "jobseeker"]).optional(),
  })
  .strict();

type AccountMatch = {
  userId: string;
  role: "admin" | "employer" | "jobseeker";
  email: string;
};

async function findAccount(email: string, role?: "admin" | "employer" | "jobseeker") {
  if (role === "admin") {
    const [row] = await db
      .select({ id: adminsTable.id, email: adminsTable.email })
      .from(adminsTable)
      .where(eq(adminsTable.email, email))
      .limit(1);
    return row ? ({ userId: row.id, role: "admin", email: row.email } satisfies AccountMatch) : null;
  }

  if (role === "employer") {
    const [row] = await db
      .select({ id: employersTable.id, email: employersTable.email })
      .from(employersTable)
      .where(eq(employersTable.email, email))
      .limit(1);
    return row ? ({ userId: row.id, role: "employer", email: row.email } satisfies AccountMatch) : null;
  }

  if (role === "jobseeker") {
    const [row] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return row ? ({ userId: row.id, role: "jobseeker", email: row.email } satisfies AccountMatch) : null;
  }

  const [admin, employer, user] = await Promise.all([
    db.select({ id: adminsTable.id, email: adminsTable.email }).from(adminsTable).where(eq(adminsTable.email, email)).limit(1),
    db.select({ id: employersTable.id, email: employersTable.email }).from(employersTable).where(eq(employersTable.email, email)).limit(1),
    db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email)).limit(1),
  ]);

  if (admin[0]) return { userId: admin[0].id, role: "admin", email: admin[0].email } as const;
  if (employer[0]) return { userId: employer[0].id, role: "employer", email: employer[0].email } as const;
  if (user[0]) return { userId: user[0].id, role: "jobseeker", email: user[0].email } as const;
  return null;
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:reset-request:ip:${clientIp}`,
      maxRequests: 12,
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

    const parsed = requestResetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const emailRateLimit = enforceRateLimit({
      key: `auth:reset-request:email:${normalizedEmail}`,
      maxRequests: 5,
      windowMs: 15 * 60_000,
    });

    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: emailRateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const account = await findAccount(normalizedEmail, parsed.data.role);

    if (account) {
      const tokenPayload = await issueLifecycleToken({
        kind: "password_reset",
        role: account.role,
        userId: account.userId,
        email: account.email,
        ttlMs: 15 * 60_000,
      });

      try {
        await sendAuthLifecycleEmail({
          kind: "password_reset",
          to: account.email,
          token: tokenPayload.token,
          requestId,
        });
      } catch (emailError) {
        console.error("Password reset email send error:", {
          requestId,
          role: account.role,
          email: account.email,
          error: emailError,
        });
      }
    }

    return NextResponse.json(
      {
        message: "If an account exists, password reset instructions were sent.",
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Reset password request error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
