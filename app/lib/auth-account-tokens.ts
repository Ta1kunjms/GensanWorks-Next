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

// Live auth_lifecycle_tokens columns: id, user_id, role, token_hash, type,
// expires_at, used_at, created_at (no kind/email/consumed_at/updated_at).
const PROFILE_TABLE: Record<AccountRole, "admins" | "employers" | "jobseekers"> = {
  admin: "admins",
  employer: "employers",
  jobseeker: "jobseekers",
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

  // Retire previous unused tokens of the same kind for this account
  const { error: retireError } = await db
    .from("auth_lifecycle_tokens")
    .update({ used_at: now.toISOString() })
    .eq("type", params.kind)
    .eq("role", params.role)
    .eq("user_id", params.userId)
    .is("used_at", null);
  if (retireError) throw retireError;

  const token = makeToken();
  const { error } = await db
    .from("auth_lifecycle_tokens")
    .insert({
      type: params.kind,
      role: params.role,
      user_id: params.userId,
      token_hash: hashToken(token),
      expires_at: expiresAt.toISOString(),
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

  // Single use: the conditional update only succeeds for the first caller.
  const { data: rows, error } = await db
    .from("auth_lifecycle_tokens")
    .update({ used_at: now.toISOString() })
    .eq("token_hash", tokenHash)
    .eq("type", expectedKind)
    .is("used_at", null)
    .gt("expires_at", now.toISOString())
    .select("id, type, role, user_id, expires_at");
  if (error) throw error;

  const row = rows?.[0];
  if (!row) {
    return null;
  }

  const role = row.role as AccountRole;
  const table = PROFILE_TABLE[role];
  if (!table) return null;
  const { data: profile, error: profileError } = await db
    .from(table)
    .select("email")
    .eq("id", row.user_id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.email) return null;

  return {
    token,
    kind: row.type as TokenKind,
    role,
    userId: row.user_id,
    email: profile.email,
    expiresAtMs: new Date(row.expires_at).getTime(),
  } satisfies TokenPayload;
}

// Email verification state lives in Supabase Auth (auth.users.email_confirmed_at);
// there is no account_email_verifications table.
export async function markEmailVerified(_role: AccountRole, userId: string, email: string) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) throw error;
  // Only confirm the address the token was issued for.
  if (!data.user || (data.user.email ?? "").toLowerCase() !== email.toLowerCase()) {
    throw new Error("Email verification target does not match the account");
  }
  if (data.user.email_confirmed_at) return;

  const { error: updateError } = await db.auth.admin.updateUserById(userId, { email_confirm: true });
  if (updateError) throw updateError;
}

export async function isEmailVerified(_role: AccountRole, userId: string) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) throw error;
  return Boolean(data.user?.email_confirmed_at);
}
