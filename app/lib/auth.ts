import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase-server";
import { supabaseAdmin } from "./supabase";
import {
  ROLE_PROFILE_TABLES,
  decideProfileRole,
  roleFromDecision,
  type ProfileRole,
  type RoleProfileLookup,
  type RoleProfileRow,
} from "./profile-role";

export type { ProfileRole };

/** Session built for a verified Auth user whose role was resolved from the profile tables. */
export type AuthSession = {
  user: {
    id: string;
    email: string | undefined;
    name: string;
    role: ProfileRole;
    image: string | null;
  };
  expires: string;
};

/**
 * Test-only session shape, honored by auth() only when NODE_ENV === "test".
 * Fields stay optional so fixtures can exercise missing/unknown-role paths.
 */
export type MockAuthSession = {
  user?: { id?: string; role?: string; email?: string; name?: string; image?: string | null };
};

/**
 * Resolves the authorization role for a verified Auth user id from the
 * role-profile tables. Returns a role only when exactly one profile row exists
 * across admins/employers/jobseekers and it has is_active === true. Any lookup
 * error, missing profile, or conflicting profiles fails closed (null).
 * user_metadata is never consulted.
 */
export async function resolveProfileRole(userId: string): Promise<ProfileRole | null> {
  if (!userId) return null;

  try {
    const lookups = await Promise.all(
      ROLE_PROFILE_TABLES.map(async ([role, table]): Promise<RoleProfileLookup> => {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("id, is_active")
          .eq("id", userId)
          .maybeSingle();
        const row: RoleProfileRow | null = data ?? null;
        return { role, row: error ? null : row, failed: Boolean(error) };
      })
    );

    const decision = decideProfileRole(lookups);
    if (decision.status === "error") {
      console.warn("[auth] Role profile lookup failed; access denied.");
    } else if (decision.status === "conflict") {
      console.warn("[auth] Conflicting role profiles; access denied.");
    }
    return roleFromDecision(decision);
  } catch {
    console.warn("[auth] Role profile lookup failed; access denied.");
    return null;
  }
}

/**
 * Builds the app session for a user already verified by supabase.auth.getUser().
 * The role comes only from resolveProfileRole; metadata supplies display fields.
 */
export async function buildSessionForVerifiedUser(user: User): Promise<AuthSession | null> {
  const role = await resolveProfileRole(user.id);
  if (!role) return null;

  const name = user.user_metadata?.name ||
               user.user_metadata?.full_name ||
               `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
               user.email?.split('@')[0] ||
               "User";

  return {
    user: {
      id: user.id,
      email: user.email,
      name: name,
      role: role,
      image: user.user_metadata?.avatar_url || null,
    },
    expires: new Date(Date.now() + 3600 * 1000).toISOString(), // Mock expiry
  };
}

let mockSessionStore: MockAuthSession | null | undefined = undefined;

export const __setMockAuthSession = (session: MockAuthSession | null | undefined) => {
  mockSessionStore = session;
};

/**
 * Compatibility layer to replace NextAuth auth() call.
 * This checks the Supabase session and returns a session object
 * compatible with the existing codebase.
 */
export const auth = async (): Promise<AuthSession | MockAuthSession | null> => {
  if (process.env.NODE_ENV === "test" && mockSessionStore !== undefined) {
    return mockSessionStore;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Map the verified Supabase user to the session format the app expects.
    // The role comes from the role-profile tables, never from user_metadata.
    return await buildSessionForVerifiedUser(user);
  } catch (error: any) {
    const isOutOfRequestScope =
      error?.message?.includes("cookies") ||
      error?.message?.includes("outside a request scope") ||
      error?.digest === "DYNAMIC_SERVER_USAGE";
    if (!isOutOfRequestScope) {
      console.error("[auth] Compatibility layer error:", error);
    }
    return null;
  }
};

// Mock handlers for NextAuth route compatibility (can be removed later)
export const handlers = {
  GET: () => new Response("NextAuth is migrated to Supabase", { status: 200 }),
  POST: () => new Response("NextAuth is migrated to Supabase", { status: 200 }),
};

// Mock signIn/signOut for server-side if needed
export const signIn = async () => {};
export const signOut = async () => {};