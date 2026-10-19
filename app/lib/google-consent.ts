// Consent gate for OAuth (Google) users.
//
// Google sign-in creates the auth user, and the on_auth_user_created trigger
// creates a jobseeker profile, before any privacy consent exists. These users
// are held at /auth/consent until consent is recorded. Consent state is mirrored
// into app_metadata (writable only with the service role) so middleware can
// check it without a database query.
//
// This module has no Supabase imports so it can be unit tested offline.

import { PRIVACY_NOTICE_VERSION } from "./privacy-notice-version";

export const CONSENT_PAGE_PATH = "/auth/consent";
export const CONSENT_DECLINED_PATH = "/auth/auth-code-error?reason=consent_declined";

export interface ConsentGateUser {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

export function isOAuthUser(user: ConsentGateUser | null | undefined): boolean {
  if (!user) return false;
  const provider = user.app_metadata?.provider;
  return typeof provider === "string" && provider !== "email";
}

export function hasRecordedOAuthConsent(user: ConsentGateUser | null | undefined): boolean {
  const version = user?.app_metadata?.consent_version;
  return typeof version === "string" && version.length > 0;
}

/** True when an OAuth user without recorded consent must be held at the consent page. */
export function needsOAuthConsent(user: ConsentGateUser | null | undefined): boolean {
  return isOAuthUser(user) && !hasRecordedOAuthConsent(user);
}

const GATED_PREFIXES = ["/jobseeker", "/employer"];

/** Middleware decision: where to redirect, or null to continue. */
export function consentGateRedirect(
  pathname: string,
  user: ConsentGateUser | null | undefined
): string | null {
  if (pathname === CONSENT_PAGE_PATH) {
    return user ? null : "/login?role=jobseeker";
  }
  if (!needsOAuthConsent(user)) return null;
  if (GATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return CONSENT_PAGE_PATH;
  }
  return null;
}

/** OAuth callback decision after the session exchange. */
export function resolveCallbackDestination(input: {
  user: ConsentGateUser;
  role: "jobseeker" | "employer" | null;
  profileHasConsent: boolean;
}): string {
  const { user, role, profileHasConsent } = input;

  if (isOAuthUser(user)) {
    if (role === "jobseeker" && profileHasConsent && hasRecordedOAuthConsent(user)) {
      return "/jobseeker/dashboard";
    }
    if (role === "employer" && profileHasConsent) {
      return "/employer/dashboard";
    }
    return CONSENT_PAGE_PATH;
  }

  return role ? `/${role}/dashboard` : "/auth/auth-code-error";
}

export interface ConsentStore {
  /** Updates the caller's jobseeker row; returns the number of rows updated. */
  updateJobseeker(id: string, values: Record<string, unknown>): Promise<number>;
  insertJobseeker(values: Record<string, unknown>): Promise<void>;
  setAppMetadata(id: string, appMetadata: Record<string, unknown>): Promise<void>;
}

export type ConsentActionResult =
  | { status: 200; redirectTo: string; signOut: boolean }
  | { status: 401 | 403; error: string };

function splitName(user: ConsentGateUser): { firstName: string; lastName: string } {
  const meta = user.user_metadata ?? {};
  const fullName = String(meta.full_name ?? meta.name ?? "").trim();
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
  return { firstName: first || "User", lastName: rest.join(" ") };
}

/**
 * Records or declines consent for the signed-in OAuth user. The user always
 * comes from the server session, never from the request body.
 */
export async function applyConsentAction(
  user: ConsentGateUser | null,
  action: "accept" | "decline",
  store: ConsentStore,
  now: Date = new Date()
): Promise<ConsentActionResult> {
  if (!user) return { status: 401, error: "Authentication required" };
  if (!isOAuthUser(user)) return { status: 403, error: "Consent gate applies to Google accounts only" };

  // Already consented: no-op, so a repeat call cannot reactivate a profile
  // that was deactivated after consent was recorded.
  if (hasRecordedOAuthConsent(user)) {
    return { status: 200, redirectTo: "/jobseeker/dashboard", signOut: false };
  }

  if (action === "decline") {
    await store.updateJobseeker(user.id, { is_active: false, updated_at: now.toISOString() });
    return { status: 200, redirectTo: CONSENT_DECLINED_PATH, signOut: true };
  }

  const consentValues = {
    consent_given_at: now.toISOString(),
    consent_privacy_notice_version: PRIVACY_NOTICE_VERSION,
  };

  const updated = await store.updateJobseeker(user.id, {
    ...consentValues,
    is_active: true,
    updated_at: now.toISOString(),
  });

  if (updated === 0) {
    const { firstName, lastName } = splitName(user);
    await store.insertJobseeker({
      id: user.id,
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
      password_hash: "auth_managed",
      ...consentValues,
    });
  }

  await store.setAppMetadata(user.id, {
    ...(user.app_metadata ?? {}),
    consent_version: PRIVACY_NOTICE_VERSION,
    consent_given_at: consentValues.consent_given_at,
  });

  return { status: 200, redirectTo: "/jobseeker/dashboard", signOut: false };
}
