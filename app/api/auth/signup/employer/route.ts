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

const employerSignupSchema = z
  .object({
    contactPerson: z.string().min(2).max(255),
    contactPhone: z.string().min(7).max(20),
    establishmentName: z.string().min(2).max(255),
    address: z.string().min(5),
    city: z.string().min(2).max(100),
    province: z.string().min(2).max(100),
    email: z.string().email().max(FIELD_VALIDATION.email.maxLength),
    password: z.string().regex(PASSWORD_REGEX),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const ipRateLimit = enforceRateLimit({
      key: `auth:signup:employer:ip:${clientIp}`,
      maxRequests: 8,
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
    const parsed = employerSignupSchema.safeParse(body);

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
      key: `auth:signup:employer:email:${email}`,
      maxRequests: 3,
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

    const [existingEmployer, existingUser] = await Promise.all([
      db
        .select({ id: employersTable.id })
        .from(employersTable)
        .where(eq(employersTable.email, email))
        .limit(1),
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1),
    ]);

    if (existingEmployer.length > 0 || existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email is already in use", requestId },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const [created] = await db
      .insert(employersTable)
      .values({
        email,
        passwordHash,
        contactPerson: parsed.data.contactPerson.trim(),
        contactPhone: parsed.data.contactPhone.trim(),
        establishmentName: parsed.data.establishmentName.trim(),
        address: parsed.data.address.trim(),
        city: parsed.data.city.trim(),
        province: parsed.data.province.trim(),
        accountStatus: "pending",
        hasAccount: true,
        isActive: true,
      })
      .returning({
        id: employersTable.id,
        email: employersTable.email,
        contactPerson: employersTable.contactPerson,
        accountStatus: employersTable.accountStatus,
      });

    return NextResponse.json(
      {
        message: "Employer account submitted for review",
        employer: created,
        requestId,
      },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Employer signup error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
