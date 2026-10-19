// Pure, dependency-free role-profile decision shared by the server auth resolver
// (app/lib/auth.ts) and middleware navigation gating (app/lib/supabase-middleware.ts).
// It never reads user_metadata and never defaults a role: a role is granted only
// when exactly one role-profile row exists for the user and it is active.

export type ProfileRole = "admin" | "employer" | "jobseeker";

/** Every role-profile table, each checked exactly once per decision. */
export const ROLE_PROFILE_TABLES: ReadonlyArray<readonly [ProfileRole, string]> = [
  ["admin", "admins"],
  ["employer", "employers"],
  ["jobseeker", "jobseekers"],
];

/** The only profile columns a role decision needs. */
export type RoleProfileRow = { id: string; is_active: boolean | null };

/** Result of looking up the user's own row in one role-profile table. */
export type RoleProfileLookup = {
  role: ProfileRole;
  row: RoleProfileRow | null;
  failed: boolean;
};

export type ProfileRoleDecision =
  | { status: "ok"; role: ProfileRole }
  | { status: "none" | "inactive" | "conflict" | "error" };

/**
 * Decides the user's role from one lookup per role-profile table.
 * - any failed lookup, or a lookup set that does not cover each table exactly once -> "error"
 * - zero rows -> "none"
 * - more than one row -> "conflict"
 * - exactly one row that is not is_active === true -> "inactive"
 * - exactly one active row -> "ok" with that row's role
 */
export function decideProfileRole(lookups: ReadonlyArray<RoleProfileLookup>): ProfileRoleDecision {
  const coversEachTableOnce =
    lookups.length === ROLE_PROFILE_TABLES.length &&
    ROLE_PROFILE_TABLES.every(([role]) => lookups.filter((l) => l.role === role).length === 1);
  if (!coversEachTableOnce || lookups.some((l) => l.failed)) return { status: "error" };

  const found = lookups.filter((l) => l.row !== null);
  if (found.length === 0) return { status: "none" };
  if (found.length > 1) return { status: "conflict" };

  const profile = found[0];
  if (profile === undefined || profile.row === null) return { status: "error" };
  return profile.row.is_active === true ? { status: "ok", role: profile.role } : { status: "inactive" };
}

/** Convenience: the granted role, or null for every non-"ok" decision. */
export function roleFromDecision(decision: ProfileRoleDecision): ProfileRole | null {
  return decision.status === "ok" ? decision.role : null;
}
