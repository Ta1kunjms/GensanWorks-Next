import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accountEmailVerificationsTable,
  authLifecycleTokensTable,
} from "@/db/schema";

export type AccountRole = "admin" | "employer" | "jobseeker";
export type TokenKind = "password_reset" | "email_verify";

export type TokenPayload = {
  token: string;
  kind: TokenKind;
  role: AccountRole;
  userId: string;
  email: string;
  expiresAtMs: number;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return `${randomUUID()}-${randomBytes(24).toString("hex")}`;
}

export async function issueLifecycleToken(params: {
  kind: TokenKind;
  role: AccountRole;
  userId: string;
  email: string;
  ttlMs: number;
}) {
  const now = new Date();
  const expiresAt = new Date(Date.now() + params.ttlMs);

  await db
    .delete(authLifecycleTokensTable)
    .where(lt(authLifecycleTokensTable.expiresAt, now));

  await db
    .update(authLifecycleTokensTable)
    .set({ consumedAt: now, updatedAt: now })
    .where(
      and(
        eq(authLifecycleTokensTable.kind, params.kind),
        eq(authLifecycleTokensTable.role, params.role),
        eq(authLifecycleTokensTable.userId, params.userId),
        isNull(authLifecycleTokensTable.consumedAt)
      )
    );

  const token = makeToken();
  await db.insert(authLifecycleTokensTable).values({
    kind: params.kind,
    role: params.role,
    userId: params.userId,
    email: params.email,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    token,
    kind: params.kind,
    role: params.role,
    userId: params.userId,
    email: params.email,
    expiresAtMs: expiresAt.getTime(),
  } satisfies TokenPayload;
}

export async function consumeLifecycleToken(token: string, expectedKind: TokenKind) {
  const now = new Date();
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({
      id: authLifecycleTokensTable.id,
      kind: authLifecycleTokensTable.kind,
      role: authLifecycleTokensTable.role,
      userId: authLifecycleTokensTable.userId,
      email: authLifecycleTokensTable.email,
      expiresAt: authLifecycleTokensTable.expiresAt,
    })
    .from(authLifecycleTokensTable)
    .where(
      and(
        eq(authLifecycleTokensTable.tokenHash, tokenHash),
        eq(authLifecycleTokensTable.kind, expectedKind),
        isNull(authLifecycleTokensTable.consumedAt),
        gt(authLifecycleTokensTable.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [updated] = await db
    .update(authLifecycleTokensTable)
    .set({ consumedAt: now, updatedAt: now })
    .where(
      and(
        eq(authLifecycleTokensTable.id, row.id),
        isNull(authLifecycleTokensTable.consumedAt)
      )
    )
    .returning({ id: authLifecycleTokensTable.id });

  if (!updated) {
    return null;
  }

  return {
    token,
    kind: row.kind,
    role: row.role,
    userId: row.userId,
    email: row.email,
    expiresAtMs: row.expiresAt.getTime(),
  } satisfies TokenPayload;
}

export async function markEmailVerified(role: AccountRole, userId: string, email: string) {
  const now = new Date();
  await db
    .insert(accountEmailVerificationsTable)
    .values({
      role,
      userId,
      email,
      verifiedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [accountEmailVerificationsTable.role, accountEmailVerificationsTable.userId],
      set: {
        email,
        verifiedAt: now,
        updatedAt: now,
      },
    });
}

export async function isEmailVerified(role: AccountRole, userId: string) {
  const [row] = await db
    .select({ id: accountEmailVerificationsTable.id })
    .from(accountEmailVerificationsTable)
    .where(
      and(
        eq(accountEmailVerificationsTable.role, role),
        eq(accountEmailVerificationsTable.userId, userId)
      )
    )
    .limit(1);

  return Boolean(row);
}
