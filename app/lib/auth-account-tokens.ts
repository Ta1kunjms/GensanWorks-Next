import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";

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

  // Clean up expired tokens
  await db
    .from("auth_lifecycle_tokens")
    .delete()
    .lt("expires_at", now.toISOString());

  // Mark previous unused tokens as consumed
  await db
    .from("auth_lifecycle_tokens")
    .update({ consumed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("kind", params.kind)
    .eq("role", params.role)
    .eq("user_id", params.userId)
    .is("consumed_at", null);

  const token = makeToken();
  const { error } = await db
    .from("auth_lifecycle_tokens")
    .insert({
      kind: params.kind,
      role: params.role,
      user_id: params.userId,
      email: params.email,
      token_hash: hashToken(token),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

  if (error) {
    throw error;
  }

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

  const { data: row } = await db
    .from("auth_lifecycle_tokens")
    .select("id, kind, role, user_id, email, expires_at")
    .eq("token_hash", tokenHash)
    .eq("kind", expectedKind)
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .single();

  if (!row) {
    return null;
  }

  await db
    .from("auth_lifecycle_tokens")
    .update({ consumed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null);

  return {
    token,
    kind: row.kind as TokenKind,
    role: row.role as AccountRole,
    userId: row.user_id,
    email: row.email,
    expiresAtMs: new Date(row.expires_at).getTime(),
  } satisfies TokenPayload;
}

export async function markEmailVerified(role: AccountRole, userId: string, email: string) {
  const now = new Date().toISOString();
  
  const { error } = await db
    .from("account_email_verifications")
    .upsert({
      role,
      user_id: userId,
      email,
      verified_at: now,
      created_at: now,
      updated_at: now,
    }, { onConflict: "role,user_id" });

  if (error) {
    throw error;
  }
}

export async function isEmailVerified(role: AccountRole, userId: string) {
  const { data } = await db
    .from("account_email_verifications")
    .select("id")
    .eq("role", role)
    .eq("user_id", userId)
    .single();

  return !!data;
}