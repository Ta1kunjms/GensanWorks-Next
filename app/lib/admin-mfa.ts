// Admin MFA policy (pilot constraint #7). Admin portal pages and admin API
// sessions require Supabase Auth assurance level aal2 (a verified TOTP factor
// used in this session). Enforced in middleware (navigation) and in auth()
// (server authorization); the /auth/mfa page only enrolls and verifies.

export const ADMIN_MFA_PATH = "/auth/mfa";

export type AssuranceLevel = "aal1" | "aal2" | null | undefined;

/**
 * True unless ADMIN_MFA_REQUIRED is exactly "false" outside production.
 * Production always requires admin MFA.
 */
export function adminMfaRequired(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.NODE_ENV === "production") return true;
  return env.ADMIN_MFA_REQUIRED !== "false";
}

/** Fails closed: only a session already at aal2 passes. */
export function adminMfaSatisfied(currentLevel: AssuranceLevel): boolean {
  return currentLevel === "aal2";
}
