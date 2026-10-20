// Consent gate for OAuth (Google) users.
//
// Google sign-in creates the auth user. Since Option C the signup trigger creates
// no profile for OAuth users; they are held at /auth/consent, where accepting
// creates a jobseeker or (pending) employer profile with consent. Consent is mirrored
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

/**
 * True only when this user deactivated themselves by declining consent. This
 * marker (service-role-only app_metadata) distinguishes a decline, which the user
 * may reconsider, from a deactivation by an administrator or deletion processing,
 * which consent must never undo.
 */
export function hasDeclinedOAuthConsent(user: ConsentGateUser | null | undefined): boolean {
  const declinedAt = user?.app_metadata?.consent_declined_at;
  return typeof declinedAt === "string" && declinedAt.length > 0;
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
    // The employer area leads to the employer version of the consent page.
    const employerArea = pathname === "/employer" || pathname.startsWith("/employer/");
    return employerArea ? `${CONSENT_PAGE_PATH}?role=employer` : CONSENT_PAGE_PATH;
  }
  return null;
}

export type OAuthProfileRole = "jobseeker" | "employer";

/**
 * Cookie that carries the portal a NEW Google user chose (login/signup tab)
 * through the OAuth round trip. It only picks the role when the user has no
 * profile yet; an existing profile always decides the role.
 */
export const OAUTH_ROLE_COOKIE = "gw_oauth_role";

export function parseOAuthRole(value: unknown): OAuthProfileRole {
  return value === "employer" ? "employer" : "jobseeker";
}

/** Consent page URL, carrying the requested role for a user without a profile. */
export function consentPagePath(role: OAuthProfileRole): string {
  return role === "employer" ? `${CONSENT_PAGE_PATH}?role=employer` : CONSENT_PAGE_PATH;
}

const DASHBOARDS: Record<OAuthProfileRole, string> = {
  jobseeker: "/jobseeker/dashboard",
  employer: "/employer/dashboard",
};

/** OAuth callback decision after the session exchange. */
export function resolveCallbackDestination(input: {
  user: ConsentGateUser;
  role: OAuthProfileRole | null;
  profileHasConsent: boolean;
  requestedRole?: OAuthProfileRole;
}): string {
  const { user, role, profileHasConsent } = input;

  if (isOAuthUser(user)) {
    if (role && profileHasConsent && hasRecordedOAuthConsent(user)) {
      return DASHBOARDS[role];
    }
    // An existing profile keeps its role; only a user with no profile uses the requested role.
    return consentPagePath(role ?? input.requestedRole ?? "jobseeker");
  }

  return role ? DASHBOARDS[role] : "/auth/auth-code-error";
}

/** What the store finds for a user id across admins, employers and jobseekers. */
export type StoredProfileRole = OAuthProfileRole | "admin" | "conflict" | null;

export interface ConsentStore {
  /** The caller's existing profile: a role, "admin", "conflict" (more than one row), or null. */
  getProfileRole(id: string): Promise<StoredProfileRole>;
  /** Removes a profile row this request just created (used only to undo a lost race). */
  deleteProfile(role: OAuthProfileRole, id: string): Promise<void>;
  /** Updates the caller's own profile row; returns the number of rows updated. */
  updateProfile(role: OAuthProfileRole, id: string, values: Record<string, unknown>): Promise<number>;
  /** Deactivates the caller's profile only if it is currently active; returns rows changed. */
  deactivateActiveProfile(role: OAuthProfileRole, id: string, updatedAt: string): Promise<number>;
  insertJobseeker(values: Record<string, unknown>): Promise<void>;
  insertEmployer(values: Record<string, unknown>): Promise<void>;
  setAppMetadata(id: string, appMetadata: Record<string, unknown>): Promise<void>;
}

export type ConsentActionResult =
  | { status: 200; redirectTo: string; signOut: boolean }
  | { status: 400 | 401 | 403 | 409; error: string };

export interface ConsentActionOptions {
  /** Portal chosen by a NEW user; ignored when a profile already exists. */
  requestedRole?: OAuthProfileRole;
  /** Required to create a new employer profile. */
  establishmentName?: string;
}

function splitName(user: ConsentGateUser): { firstName: string; lastName: string; fullName: string } {
  const meta = user.user_metadata ?? {};
  const fullName = String(meta.full_name ?? meta.name ?? "").trim();
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
  return { firstName: first || "User", lastName: rest.join(" "), fullName };
}

/**
 * Records or declines consent for the signed-in OAuth user. The user always
 * comes from the server session, never from the request body.
 */
export async function applyConsentAction(
  user: ConsentGateUser | null,
  action: "accept" | "decline",
  store: ConsentStore,
  now: Date = new Date(),
  options: ConsentActionOptions = {}
): Promise<ConsentActionResult> {
  if (!user) return { status: 401, error: "Authentication required" };
  if (!isOAuthUser(user)) return { status: 403, error: "Consent gate applies to Google accounts only" };

  const stored = await store.getProfileRole(user.id);
  // Administrators never use Google, and a conflicting account is never resolved here.
  if (stored === "admin") return { status: 403, error: "Administrator accounts sign in with email and password only." };
  if (stored === "conflict") {
    return { status: 409, error: "This account has more than one profile. Please contact PESO General Santos." };
  }
  const existingRole = stored;

  // Already consented: no-op, so a repeat call cannot reactivate a profile
  // that was deactivated after consent was recorded.
  if (hasRecordedOAuthConsent(user)) {
    return { status: 200, redirectTo: DASHBOARDS[existingRole ?? "jobseeker"], signOut: false };
  }

  if (action === "decline") {
    // The decline marker is written only when this decline is what deactivated
    // an active profile, so an already-deactivated account cannot use
    // decline-then-accept to reactivate itself. Without a profile, nothing is kept.
    const deactivated = existingRole
      ? await store.deactivateActiveProfile(existingRole, user.id, now.toISOString())
      : 0;
    if (deactivated > 0) {
      await store.setAppMetadata(user.id, {
        ...(user.app_metadata ?? {}),
        consent_declined_at: now.toISOString(),
      });
    }
    return { status: 200, redirectTo: CONSENT_DECLINED_PATH, signOut: true };
  }

  const role = existingRole ?? options.requestedRole ?? "jobseeker";
  const establishmentName = (options.establishmentName ?? "").trim();
  if (!existingRole && role === "employer" && establishmentName.length < 2) {
    return { status: 400, error: "Enter your establishment name to create an employer account." };
  }

  const consentValues = {
    consent_given_at: now.toISOString(),
    consent_privacy_notice_version: PRIVACY_NOTICE_VERSION,
  };

  if (existingRole) {
    // Only a profile this user deactivated by declining is reactivated here; any
    // other deactivation (admin action, deletion processing) is left unchanged.
    await store.updateProfile(existingRole, user.id, {
      ...consentValues,
      ...(hasDeclinedOAuthConsent(user) ? { is_active: true } : {}),
      updated_at: now.toISOString(),
    });
  } else {
    if (role === "employer") {
      const { fullName, firstName } = splitName(user);
      // New employers start pending: PESO approval is still required, as with email signup.
      await store.insertEmployer({
        id: user.id,
        email: user.email ?? null,
        establishment_name: establishmentName,
        contact_person: fullName || firstName,
        password_hash: "auth_managed",
        account_status: "pending",
        ...consentValues,
      });
    } else {
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

    // Two simultaneous accepts (e.g. one per portal) could each insert a profile.
    // Keep exactly one: if this account no longer resolves to the role just
    // created, undo this request's insert and ask the user to retry.
    const after = await store.getProfileRole(user.id);
    if (after !== role) {
      await store.deleteProfile(role, user.id);
      return { status: 409, error: "Another sign-up for this account is in progress. Please refresh and try again." };
    }
  }

  await store.setAppMetadata(user.id, {
    ...(user.app_metadata ?? {}),
    consent_version: PRIVACY_NOTICE_VERSION,
    consent_given_at: consentValues.consent_given_at,
    consent_declined_at: null,
  });

  return { status: 200, redirectTo: DASHBOARDS[role], signOut: false };
}

/**
 * Browser cookie string recording the portal chosen before a Google redirect
 * (10 minutes). `Secure` is set on https only, so local http testing still works.
 */
export function oauthRoleCookie(role: OAuthProfileRole, secure = true): string {
  return `${OAUTH_ROLE_COOKIE}=${role}; Path=/; Max-Age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
}
