import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/utils";
import {
  accountDeletionRequestsTable,
  adminsTable,
  employersTable,
  usersTable,
} from "@/db/schema";

type AccountRole = "admin" | "employer" | "jobseeker";

const requestDeletionSchema = z
  .object({
    currentPassword: z.string().min(1),
    reason: z.string().max(2000).optional(),
  })
  .strict();

async function getSessionIdentity() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; email?: string | null } | undefined;
  if (!user?.id || !user.role || !user.email) return null;
  if (user.role !== "admin" && user.role !== "employer" && user.role !== "jobseeker") return null;
  return { userId: user.id, role: user.role as AccountRole, email: user.email };
}

async function verifyCurrentPassword(identity: { userId: string; role: AccountRole }, currentPassword: string) {
  if (identity.role === "admin") {
    const [row] = await db
      .select({ passwordHash: adminsTable.passwordHash })
      .from(adminsTable)
      .where(eq(adminsTable.id, identity.userId))
      .limit(1);
    return Boolean(row?.passwordHash && (await verifyPassword(currentPassword, row.passwordHash)));
  }

  if (identity.role === "employer") {
    const [row] = await db
      .select({ passwordHash: employersTable.passwordHash })
      .from(employersTable)
      .where(eq(employersTable.id, identity.userId))
      .limit(1);
    return Boolean(row?.passwordHash && (await verifyPassword(currentPassword, row.passwordHash)));
  }

  const [row] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, identity.userId))
    .limit(1);
  return Boolean(row?.passwordHash && (await verifyPassword(currentPassword, row.passwordHash)));
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
      key: `auth:account-deletion:request:${identity.userId}:${clientIp}`,
      maxRequests: 6,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const parsed = requestDeletionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    const passwordOk = await verifyCurrentPassword(identity, parsed.data.currentPassword);
    if (!passwordOk) {
      return NextResponse.json({ error: "Current password is incorrect", requestId }, { status: 400 });
    }

    const [existingPending] = await db
      .select({ id: accountDeletionRequestsTable.id, deleteAfter: accountDeletionRequestsTable.deleteAfter })
      .from(accountDeletionRequestsTable)
      .where(
        and(
          eq(accountDeletionRequestsTable.role, identity.role),
          eq(accountDeletionRequestsTable.userId, identity.userId),
          eq(accountDeletionRequestsTable.status, "pending")
        )
      )
      .limit(1);

    if (existingPending) {
      return NextResponse.json(
        {
          error: "Account deletion is already scheduled",
          deleteAfter: existingPending.deleteAfter,
          requestId,
        },
        { status: 409 }
      );
    }

    const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60_000);

    const [created] = await db
      .insert(accountDeletionRequestsTable)
      .values({
        role: identity.role,
        userId: identity.userId,
        email: identity.email,
        status: "pending",
        reason: parsed.data.reason?.trim() || null,
        requestedAt: new Date(),
        deleteAfter,
      })
      .returning({
        id: accountDeletionRequestsTable.id,
        deleteAfter: accountDeletionRequestsTable.deleteAfter,
      });

    return NextResponse.json(
      {
        message: "Account deletion scheduled. You can cancel before the deadline.",
        deletionRequest: created,
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Account deletion request error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
