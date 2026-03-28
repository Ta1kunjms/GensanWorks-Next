import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { PASSWORD_REGEX } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/utils";
import { adminsTable, employersTable, usersTable } from "@/db/schema";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().regex(PASSWORD_REGEX),
  })
  .strict();

type UserRole = "admin" | "employer" | "jobseeker";

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role) return null;
  return { userId: user.id, role: user.role as UserRole };
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
      key: `auth:change-password:${identity.userId}:${clientIp}`,
      maxRequests: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    const parsed = changePasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (identity.role === "admin") {
      const [admin] = await db
        .select({ passwordHash: adminsTable.passwordHash })
        .from(adminsTable)
        .where(eq(adminsTable.id, identity.userId))
        .limit(1);

      if (!admin?.passwordHash || !(await verifyPassword(currentPassword, admin.passwordHash))) {
        return NextResponse.json({ error: "Current password is incorrect", requestId }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(adminsTable)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(adminsTable.id, identity.userId));
    } else if (identity.role === "employer") {
      const [employer] = await db
        .select({ passwordHash: employersTable.passwordHash })
        .from(employersTable)
        .where(eq(employersTable.id, identity.userId))
        .limit(1);

      if (!employer?.passwordHash || !(await verifyPassword(currentPassword, employer.passwordHash))) {
        return NextResponse.json({ error: "Current password is incorrect", requestId }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(employersTable)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(employersTable.id, identity.userId));
    } else {
      const [user] = await db
        .select({ passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.id, identity.userId))
        .limit(1);

      if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: "Current password is incorrect", requestId }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(usersTable)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(usersTable.id, identity.userId));
    }

    return NextResponse.json(
      { message: "Password changed successfully", requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Change password error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
