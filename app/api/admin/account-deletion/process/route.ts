import { NextResponse } from "next/server";
import { and, eq, inArray, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { db } from "@/lib/db";
import {
  accountDeletionRequestsTable,
  adminsTable,
  employersTable,
  usersTable,
} from "@/db/schema";

type AccountRole = "admin" | "employer" | "jobseeker";

async function isAdminSession() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function hasValidCronSecret(req: Request) {
  const expected = process.env.ACCOUNT_DELETION_CRON_SECRET;
  if (!expected) {
    return false;
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  return provided.length > 0 && provided === expected;
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:account-deletion:process:${clientIp}`,
      maxRequests: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", requestId, retryAfterSeconds: rateLimit.resetInSeconds },
        { status: 429 }
      );
    }

    const [adminOk, cronOk] = await Promise.all([isAdminSession(), Promise.resolve(hasValidCronSecret(req))]);

    if (!adminOk && !cronOk) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const now = new Date();
    const dueRequests = await db
      .select({
        id: accountDeletionRequestsTable.id,
        role: accountDeletionRequestsTable.role,
        userId: accountDeletionRequestsTable.userId,
      })
      .from(accountDeletionRequestsTable)
      .where(
        and(
          eq(accountDeletionRequestsTable.status, "pending"),
          lte(accountDeletionRequestsTable.deleteAfter, now)
        )
      )
      .limit(200);

    if (dueRequests.length === 0) {
      return NextResponse.json(
        {
          message: "No due account deletions",
          processedCount: 0,
          requestId,
        },
        { headers: { "x-request-id": requestId } }
      );
    }

    const byRole: Record<AccountRole, string[]> = {
      admin: [],
      employer: [],
      jobseeker: [],
    };

    dueRequests.forEach((item) => {
      const role = item.role as AccountRole;
      if (role === "admin" || role === "employer" || role === "jobseeker") {
        byRole[role].push(item.userId);
      }
    });

    await db.transaction(async (tx) => {
      if (byRole.admin.length > 0) {
        await tx
          .update(adminsTable)
          .set({ isActive: false, updatedAt: now })
          .where(inArray(adminsTable.id, byRole.admin));
      }

      if (byRole.employer.length > 0) {
        await tx
          .update(employersTable)
          .set({ isActive: false, accountStatus: "suspended", updatedAt: now })
          .where(inArray(employersTable.id, byRole.employer));
      }

      if (byRole.jobseeker.length > 0) {
        await tx
          .update(usersTable)
          .set({ isActive: false, updatedAt: now })
          .where(inArray(usersTable.id, byRole.jobseeker));
      }

      await tx
        .update(accountDeletionRequestsTable)
        .set({
          status: "processed",
          processedAt: now,
          updatedAt: now,
        })
        .where(
          inArray(
            accountDeletionRequestsTable.id,
            dueRequests.map((item) => item.id)
          )
        );
    });

    return NextResponse.json(
      {
        message: "Account deletions processed",
        processedCount: dueRequests.length,
        processedIds: dueRequests.map((item) => item.id),
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Account deletion processor error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
