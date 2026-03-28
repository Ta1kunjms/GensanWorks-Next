import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { FIELD_VALIDATION, PASSWORD_REGEX } from "@/lib/constants";
import { hashPassword } from "@/lib/utils";
import { employersTable, usersTable } from "@/db/schema";

const jobseekerSignupSchema = z
  .object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(FIELD_VALIDATION.email.maxLength),
    password: z.string().regex(PASSWORD_REGEX),
    phone: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:signup:jobseeker:ip:${clientIp}`,
      maxRequests: 10,
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

    const body = await req.json();
    const parsed = jobseekerSignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid signup data",
          details: parsed.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailRateLimit = enforceRateLimit({
      key: `auth:signup:jobseeker:email:${email}`,
      maxRequests: 4,
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

    const [existingUser, existingEmployer] = await Promise.all([
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1),
      db
        .select({ id: employersTable.id })
        .from(employersTable)
        .where(eq(employersTable.email, email))
        .limit(1),
    ]);

    if (existingUser.length > 0 || existingEmployer.length > 0) {
      return NextResponse.json(
        { error: "Email is already in use", requestId },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const [created] = await db
      .insert(usersTable)
      .values({
        email,
        passwordHash,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone?.trim() || null,
        isActive: true,
      })
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name });

    return NextResponse.json(
      {
        message: "Jobseeker account created",
        user: created,
        requestId,
      },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Jobseeker signup error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
