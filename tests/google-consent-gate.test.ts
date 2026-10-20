// Synthetic, offline tests for the Google (OAuth) consent gate.
// No live Supabase calls: decision logic is tested directly with fake users and
// an in-memory store; route/middleware wiring is checked by static source reads.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applyConsentAction,
  consentGateRedirect,
  oauthRoleCookie,
  parseOAuthRole,
  resolveCallbackDestination,
  CONSENT_PAGE_PATH,
  CONSENT_DECLINED_PATH,
  type ConsentGateUser,
  type ConsentStore,
  type OAuthProfileRole,
} from "../app/lib/google-consent";
import { PRIVACY_NOTICE_VERSION } from "../app/lib/privacy-notice-version";
import { oauthConsentRequestSchema } from "../app/lib/validation-schemas";

const readSource = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const googleUser = (extra: Record<string, unknown> = {}): ConsentGateUser => ({
  id: "00000000-0000-4000-8000-000000000001",
  email: "google.synthetic@example.test",
  app_metadata: { provider: "google", providers: ["google"], ...extra },
  user_metadata: { full_name: "Synthetic Google User" },
});

const emailUser = (): ConsentGateUser => ({
  id: "00000000-0000-4000-8000-000000000002",
  email: "email.synthetic@example.test",
  app_metadata: { provider: "email", providers: ["email"] },
});

/** In-memory store. `existingRows` are jobseeker profiles; `employerRows` employer; `adminRows` admin. */
function fakeStore(existingRows: string[] = [], employerRows: string[] = [], adminRows: string[] = []) {
  const rows = new Map<string, Record<string, unknown>>(
    [...existingRows, ...employerRows].map((id) => [id, { id }])
  );
  const roles = new Map<string, OAuthProfileRole>([
    ...existingRows.map((id) => [id, "jobseeker"] as const),
    ...employerRows.map((id) => [id, "employer"] as const),
  ]);
  const metadata = new Map<string, Record<string, unknown>>();
  // Profiles created concurrently by "another request" (used to simulate a race).
  const extraRoles = new Map<string, OAuthProfileRole[]>();
  const calls: string[] = [];
  const store: ConsentStore = {
    async getProfileRole(id) {
      calls.push(`role:${id}`);
      const hits = (roles.has(id) ? 1 : 0) + (adminRows.includes(id) ? 1 : 0) + (extraRoles.get(id)?.length ?? 0);
      if (hits > 1) return "conflict";
      if (adminRows.includes(id)) return "admin";
      return roles.get(id) ?? null;
    },
    async deleteProfile(role, id) {
      calls.push(`delete:${role}:${id}`);
      if (roles.get(id) === role) {
        roles.delete(id);
        rows.delete(id);
      }
    },
    async updateProfile(role, id, values) {
      calls.push(`update:${role}:${id}`);
      const row = rows.get(id);
      if (!row || roles.get(id) !== role) return 0;
      rows.set(id, { ...row, ...values });
      return 1;
    },
    async deactivateActiveProfile(role, id, updatedAt) {
      calls.push(`deactivate:${role}:${id}`);
      const row = rows.get(id);
      if (!row || roles.get(id) !== role || row.is_active !== true) return 0;
      rows.set(id, { ...row, is_active: false, updated_at: updatedAt });
      return 1;
    },
    async insertJobseeker(values) {
      calls.push(`insert:jobseeker:${values.id}`);
      rows.set(String(values.id), { ...values });
      roles.set(String(values.id), "jobseeker");
    },
    async insertEmployer(values) {
      calls.push(`insert:employer:${values.id}`);
      rows.set(String(values.id), { ...values });
      roles.set(String(values.id), "employer");
    },
    async setAppMetadata(id, appMetadata) {
      calls.push(`metadata:${id}`);
      metadata.set(id, appMetadata);
    },
  };
  const writes = () => calls.filter((c) => !c.startsWith("role:"));
  return { store, rows, roles, metadata, calls, writes, extraRoles };
}

describe("Google consent gate — consent API action", () => {
  it("rejects requests without a session (401) and writes nothing", async () => {
    const { store, calls } = fakeStore();
    const result = await applyConsentAction(null, "accept", store);
    assert.equal(result.status, 401);
    assert.deepEqual(calls, []);
  });

  it("rejects email/password users (403) and writes nothing", async () => {
    const { store, calls } = fakeStore([emailUser().id]);
    const result = await applyConsentAction(emailUser(), "accept", store);
    assert.equal(result.status, 403);
    assert.deepEqual(calls, []);
  });

  it("accept records consent on the caller's own row and mirrors app_metadata", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([user.id, "other-user"]);
    const now = new Date("2026-10-20T00:00:00.000Z");
    const result = await applyConsentAction(user, "accept", store, now);

    assert.deepEqual(result, { status: 200, redirectTo: "/jobseeker/dashboard", signOut: false });
    assert.equal(rows.get(user.id)?.consent_given_at, now.toISOString());
    assert.equal(rows.get(user.id)?.consent_privacy_notice_version, PRIVACY_NOTICE_VERSION);
    assert.deepEqual(rows.get("other-user"), { id: "other-user" }, "another user's row must not change");
    assert.equal(metadata.get(user.id)?.consent_version, PRIVACY_NOTICE_VERSION);
    assert.equal(metadata.get(user.id)?.provider, "google", "existing app_metadata must be preserved");
  });

  it("decline on an already-deactivated profile writes no marker, so decline-then-accept cannot reactivate it", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([user.id]);
    rows.set(user.id, { id: user.id, is_active: false });
    await applyConsentAction(user, "decline", store);
    assert.equal(metadata.size, 0);

    await applyConsentAction(user, "accept", store);
    assert.equal(rows.get(user.id)?.is_active, false);
  });

  it("accept never reactivates a profile deactivated by someone else (no decline marker)", async () => {
    const user = googleUser();
    const { store, rows } = fakeStore([user.id]);
    rows.set(user.id, { id: user.id, is_active: false });
    await applyConsentAction(user, "accept", store);
    assert.equal(rows.get(user.id)?.is_active, false);
  });

  it("accept after the user's own decline reactivates the profile and clears the marker", async () => {
    const user = googleUser({ consent_declined_at: "2026-10-19T00:00:00.000Z" });
    const { store, rows, metadata } = fakeStore([user.id]);
    rows.set(user.id, { id: user.id, is_active: false });
    await applyConsentAction(user, "accept", store);
    assert.equal(rows.get(user.id)?.is_active, true);
    assert.equal(metadata.get(user.id)?.consent_declined_at, null);
    assert.equal(metadata.get(user.id)?.consent_version, PRIVACY_NOTICE_VERSION);
  });

  it("accept creates a minimal jobseeker row with consent when no profile exists", async () => {
    const user = googleUser();
    const { store, rows, calls } = fakeStore();
    await applyConsentAction(user, "accept", store);

    // role lookup, insert, conflict re-check, consent metadata
    assert.deepEqual(calls, [`role:${user.id}`, `insert:jobseeker:${user.id}`, `role:${user.id}`, `metadata:${user.id}`]);
    const row = rows.get(user.id);
    assert.equal(row?.first_name, "Synthetic");
    assert.equal(row?.last_name, "Google User");
    assert.equal(row?.password_hash, "auth_managed");
    assert.ok(row?.consent_given_at);
  });

  it("decline deactivates the profile, records a decline marker, and signs out, without recording consent", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([user.id]);
    rows.set(user.id, { id: user.id, is_active: true });
    const now = new Date("2026-10-20T00:00:00.000Z");
    const result = await applyConsentAction(user, "decline", store, now);

    assert.deepEqual(result, { status: 200, redirectTo: CONSENT_DECLINED_PATH, signOut: true });
    assert.equal(rows.get(user.id)?.is_active, false);
    assert.equal(rows.get(user.id)?.consent_given_at, undefined);
    assert.equal(metadata.get(user.id)?.consent_declined_at, now.toISOString());
    assert.equal(metadata.get(user.id)?.consent_version, undefined, "declining must not record consent");
    assert.equal(metadata.get(user.id)?.provider, "google", "existing app_metadata must be preserved");
  });

  it("is a no-op for a user who already consented (cannot reactivate a deactivated profile)", async () => {
    const user = googleUser({ consent_version: PRIVACY_NOTICE_VERSION });
    const { store, writes } = fakeStore([user.id]);
    const result = await applyConsentAction(user, "accept", store);
    assert.equal(result.status, 200);
    assert.deepEqual(writes(), []);
  });

  it("request schema accepts only accept/decline (+ optional role/establishment) and ignores any user id in the body", () => {
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "accept" }).success, true);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "decline" }).success, true);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "approve" }).success, false);
    assert.equal(oauthConsentRequestSchema.safeParse({}).success, false);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "accept", role: "employer", establishmentName: "Synthetic Co" }).success, true);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "accept", role: "admin" }).success, false, "admin is never a Google role");
    const parsed = oauthConsentRequestSchema.parse({ action: "accept", userId: "someone-else" });
    assert.equal("userId" in parsed, false);
  });
});

describe("Google consent gate — employers (owner decision 2026-10-21)", () => {
  const NOW = new Date("2026-10-21T00:00:00.000Z");

  it("a new Google user who chose Employer gets a PENDING employer profile with consent", async () => {
    const user = googleUser();
    const { store, rows, roles, metadata, calls } = fakeStore();
    const result = await applyConsentAction(user, "accept", store, NOW, {
      requestedRole: "employer",
      establishmentName: "  Synthetic Trading Co  ",
    });

    assert.deepEqual(result, { status: 200, redirectTo: "/employer/dashboard", signOut: false });
    assert.deepEqual(calls, [`role:${user.id}`, `insert:employer:${user.id}`, `role:${user.id}`, `metadata:${user.id}`]);
    assert.equal(roles.get(user.id), "employer");
    const row = rows.get(user.id);
    assert.equal(row?.establishment_name, "Synthetic Trading Co");
    assert.equal(row?.account_status, "pending", "PESO approval is still required");
    assert.equal(row?.contact_person, "Synthetic Google User");
    assert.equal(row?.consent_given_at, NOW.toISOString());
    assert.equal(metadata.get(user.id)?.consent_version, PRIVACY_NOTICE_VERSION);
  });

  it("refuses to create an employer without an establishment name, and writes nothing", async () => {
    const user = googleUser();
    const { store, writes } = fakeStore();
    for (const establishmentName of [undefined, "", " x "]) {
      const result = await applyConsentAction(user, "accept", store, NOW, { requestedRole: "employer", establishmentName });
      assert.equal(result.status, 400);
    }
    assert.deepEqual(writes(), []);
  });

  it("an existing jobseeker cannot become an employer by choosing the Employer tab", async () => {
    const user = googleUser();
    const { store, roles, writes } = fakeStore([user.id]);
    const result = await applyConsentAction(user, "accept", store, NOW, { requestedRole: "employer", establishmentName: "Synthetic Co" });
    assert.deepEqual(result, { status: 200, redirectTo: "/jobseeker/dashboard", signOut: false });
    assert.equal(roles.get(user.id), "jobseeker");
    assert.ok(!writes().some((c) => c.startsWith("insert:")), "no new profile may be created");
  });

  it("an existing employer cannot become a jobseeker by choosing the Jobseeker tab", async () => {
    const user = googleUser();
    const { store, roles, writes } = fakeStore([], [user.id]);
    const result = await applyConsentAction(user, "accept", store, NOW, { requestedRole: "jobseeker" });
    assert.deepEqual(result, { status: 200, redirectTo: "/employer/dashboard", signOut: false });
    assert.equal(roles.get(user.id), "employer");
    assert.ok(writes().includes(`update:employer:${user.id}`));
    assert.ok(!writes().some((c) => c.startsWith("insert:")));
  });

  it("an existing employer who declines is deactivated with a decline marker; accepting later reactivates", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([], [user.id]);
    rows.set(user.id, { id: user.id, is_active: true });
    await applyConsentAction(user, "decline", store, NOW);
    assert.equal(rows.get(user.id)?.is_active, false);
    assert.equal(metadata.get(user.id)?.consent_declined_at, NOW.toISOString());

    const declinedUser = googleUser({ consent_declined_at: NOW.toISOString() });
    await applyConsentAction(declinedUser, "accept", store, NOW);
    assert.equal(rows.get(user.id)?.is_active, true);
  });

  it("declining before any profile exists keeps nothing", async () => {
    const user = googleUser();
    const { store, writes } = fakeStore();
    const result = await applyConsentAction(user, "decline", store, NOW, { requestedRole: "employer" });
    assert.deepEqual(result, { status: 200, redirectTo: CONSENT_DECLINED_PATH, signOut: true });
    assert.deepEqual(writes(), []);
  });

  it("callback routing honours the chosen portal only for users with no profile", () => {
    const fresh = googleUser();
    assert.equal(resolveCallbackDestination({ user: fresh, role: null, profileHasConsent: false, requestedRole: "employer" }), "/auth/consent?role=employer");
    assert.equal(resolveCallbackDestination({ user: fresh, role: "jobseeker", profileHasConsent: false, requestedRole: "employer" }), CONSENT_PAGE_PATH);
    assert.equal(
      resolveCallbackDestination({ user: googleUser({ consent_version: PRIVACY_NOTICE_VERSION }), role: "employer", profileHasConsent: true }),
      "/employer/dashboard"
    );
    assert.equal(resolveCallbackDestination({ user: fresh, role: "employer", profileHasConsent: false }), "/auth/consent?role=employer");
  });

  it("parses the role cookie safely: only 'employer' selects employer", () => {
    assert.equal(parseOAuthRole("employer"), "employer");
    for (const v of ["admin", "jobseeker", "", undefined, "EMPLOYER"]) assert.equal(parseOAuthRole(v), "jobseeker");
    assert.match(oauthRoleCookie("employer"), /^gw_oauth_role=employer; Path=\/; Max-Age=600; SameSite=Lax; Secure$/);
    assert.equal(oauthRoleCookie("employer", false), "gw_oauth_role=employer; Path=/; Max-Age=600; SameSite=Lax");
  });

  it("an administrator account can never gain a jobseeker/employer profile through consent (403, no writes)", async () => {
    const user = googleUser();
    const { store, writes } = fakeStore([], [], [user.id]);
    for (const requestedRole of ["jobseeker", "employer"] as const) {
      const result = await applyConsentAction(user, "accept", store, NOW, { requestedRole, establishmentName: "Synthetic Co" });
      assert.equal(result.status, 403);
    }
    assert.deepEqual(writes(), []);
  });

  it("an account that already has two profiles is reported (409), never resolved silently", async () => {
    const user = googleUser();
    const { store, writes } = fakeStore([user.id], [], [user.id]);
    const result = await applyConsentAction(user, "accept", store, NOW);
    assert.equal(result.status, 409);
    assert.deepEqual(writes(), []);
  });

  it("a concurrent accept that created the other profile makes this request undo its own insert (409)", async () => {
    const user = googleUser();
    const { store, roles, metadata, extraRoles, calls } = fakeStore();
    // Simulate the other tab's employer insert landing between our check and our re-check.
    const realInsert = store.insertJobseeker.bind(store);
    store.insertJobseeker = async (values) => {
      await realInsert(values);
      extraRoles.set(user.id, ["employer"]);
    };
    const result = await applyConsentAction(user, "accept", store, NOW, { requestedRole: "jobseeker" });
    assert.equal(result.status, 409);
    assert.ok(calls.includes(`delete:jobseeker:${user.id}`), "this request's insert is undone");
    assert.equal(roles.get(user.id), undefined);
    assert.equal(metadata.size, 0, "no consent is recorded for a lost race");
  });
});

describe("Google consent gate — OAuth callback routing", () => {
  it("sends a Google user without consent to the consent page", () => {
    assert.equal(
      resolveCallbackDestination({ user: googleUser(), role: "jobseeker", profileHasConsent: false }),
      CONSENT_PAGE_PATH
    );
  });

  it("sends a Google user with no profile to the consent page (never auto-creates)", () => {
    assert.equal(
      resolveCallbackDestination({ user: googleUser(), role: null, profileHasConsent: false }),
      CONSENT_PAGE_PATH
    );
  });

  it("sends a consented Google user to the jobseeker dashboard", () => {
    assert.equal(
      resolveCallbackDestination({
        user: googleUser({ consent_version: PRIVACY_NOTICE_VERSION }),
        role: "jobseeker",
        profileHasConsent: true,
      }),
      "/jobseeker/dashboard"
    );
  });

  it("leaves email users unchanged", () => {
    assert.equal(
      resolveCallbackDestination({ user: emailUser(), role: "employer", profileHasConsent: false }),
      "/employer/dashboard"
    );
    assert.equal(
      resolveCallbackDestination({ user: emailUser(), role: null, profileHasConsent: false }),
      "/auth/auth-code-error"
    );
  });
});

describe("Google consent gate — middleware", () => {
  it("blocks jobseeker and employer areas for a Google user without consent", () => {
    for (const p of ["/jobseeker", "/jobseeker/dashboard"]) {
      assert.equal(consentGateRedirect(p, googleUser()), CONSENT_PAGE_PATH, p);
    }
    for (const p of ["/employer", "/employer/jobs"]) {
      assert.equal(consentGateRedirect(p, googleUser()), `${CONSENT_PAGE_PATH}?role=employer`, p);
    }
  });

  it("allows the consent page, consent API, callback and privacy notice", () => {
    for (const p of [CONSENT_PAGE_PATH, "/api/auth/consent", "/auth/callback", "/privacy"]) {
      assert.equal(consentGateRedirect(p, googleUser()), null, p);
    }
  });

  it("does not gate consented Google users, email users, or anonymous visitors on public pages", () => {
    const consented = googleUser({ consent_version: PRIVACY_NOTICE_VERSION });
    assert.equal(consentGateRedirect("/jobseeker/dashboard", consented), null);
    assert.equal(consentGateRedirect("/jobseeker/dashboard", emailUser()), null);
    assert.equal(consentGateRedirect("/jobs", null), null);
  });

  it("sends anonymous visitors on the consent page to login", () => {
    assert.equal(consentGateRedirect(CONSENT_PAGE_PATH, null), "/login?role=jobseeker");
  });

  it("does not trust user_metadata (user-editable) as consent", () => {
    const spoofed: ConsentGateUser = { ...googleUser(), user_metadata: { consent_version: PRIVACY_NOTICE_VERSION } };
    assert.equal(consentGateRedirect("/jobseeker/dashboard", spoofed), CONSENT_PAGE_PATH);
  });
});

describe("Google consent gate — static wiring checks", () => {
  it("middleware applies the consent gate", () => {
    const s = readSource("app/lib/supabase-middleware.ts");
    assert.match(s, /import \{ consentGateRedirect \} from '@\/lib\/google-consent'/);
    assert.match(s, /consentGateRedirect\(pathname, user\)/);
  });

  it("callback never inserts profiles and uses the shared routing decision", () => {
    const s = readSource("app/auth/callback/route.ts");
    assert.ok(!/\.insert\(/.test(s));
    assert.match(s, /resolveCallbackDestination\(/);
  });

  it("consent API reports an email already used by another profile (23505) as a clear 409, never auto-linking", () => {
    const s = readSource("app/api/auth/consent/route.ts");
    assert.match(s, /code === "23505"/);
    assert.match(s, /status: 409/);
    assert.ok(!/\.update\([^)]*\)\s*\.eq\("email"/.test(s), "must not link profiles by email");
  });

  it("privacy checkboxes use a neutral DOM id, because content blockers (e.g. Brave cookie-notice blocking) hide ids containing 'consent' or 'cookie'", () => {
    for (const rel of ["app/auth/consent/page.tsx", "app/signup/page.tsx", "app/signup/jobseeker/page.tsx", "app/signup/employer/page.tsx"]) {
      const s = readSource(rel);
      assert.match(s, /id="privacy-ack"/, `${rel} must use id="privacy-ack"`);
      const ids = Array.from(s.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]);
      for (const id of ids) {
        assert.ok(!/consent|cookie/i.test(id), `${rel}: id="${id}" must not contain consent/cookie`);
      }
    }
  });

  it("consent page renders a visible checkbox below both buttons", () => {
    const s = readSource("app/auth/consent/page.tsx");
    const accept = s.indexOf('submit("accept")');
    const decline = s.indexOf('submit("decline")');
    const checkbox = s.indexOf('id="privacy-ack"');
    assert.ok(accept > 0 && decline > accept && checkbox > decline, "order: accept, decline, checkbox");
    assert.match(s, /h-4 w-4 shrink-0/);
  });

  it("callback admits Google users only as jobseekers or employers (never admin), and lets only self-declined users reconsider", () => {
    const s = readSource("app/auth/callback/route.ts").replace(/\r\n/g, "\n");
    assert.match(s, /\(decisionStatus === 'ok' && \(role === 'jobseeker' \|\| role === 'employer'\)\) \|\|\s*decisionStatus === 'none' \|\|\s*mayReconsider/);
    assert.match(s, /hasDeclinedOAuthConsent\(user\)/);
    assert.ok(!/role !== 'admin'/.test(s), "admin must never be admitted by exclusion");
    assert.match(s, /response\.cookies\.set\(OAUTH_ROLE_COOKIE, '', \{ path: '\/', maxAge: 0 \}\)/, "role cookie is cleared after use");
    assert.match(s, /failure\.cookies\.set\(OAUTH_ROLE_COOKIE, '', \{ path: '\/', maxAge: 0 \}\)/, "role cookie is cleared on failure too");
    assert.match(s, /if \(role === 'admin'\) \{[\s\S]*?supabase\.auth\.signOut\(\)[\s\S]*?return failure/, "this callback never completes an admin session");
  });

  it("consent API takes the user from the server session, not the request body", () => {
    const s = readSource("app/api/auth/consent/route.ts");
    assert.match(s, /supabase\.auth\.getUser\(\)/);
    assert.match(s, /applyConsentAction\(user, body!\.action, store, new Date\(\), \{/);
    assert.match(s, /bodySchema: oauthConsentRequestSchema/);
    assert.match(s, /if \(found > 1\) return "conflict";/, "a user with more than one profile is never resolved silently");
    assert.match(s, /from\("admins"\)/, "admin accounts are detected before any profile is created");
  });

  for (const rel of ["app/login/page.tsx", "app/signup/page.tsx"]) {
    it(`${rel} offers Google on both portals, remembers the portal in the role cookie, and adds no extra OAuth scopes`, () => {
      const s = readSource(rel);
      assert.match(s, /Continue with Google/);
      const googleAt = s.indexOf("Continue with Google");
      assert.ok(!/role === "jobseeker" \? \(/.test(s.slice(Math.max(0, googleAt - 600), googleAt)), "Google must not be jobseeker-only");
      assert.match(s, /document\.cookie = oauthRoleCookie\(role, window\.location\.protocol === "https:"\);/);
      assert.ok(!/access_type|prompt:\s*["']consent["']|auth\/callback\?next=/.test(s));
    });
  }

  it("admin login page does not offer Google", () => {
    const s = readSource("app/login/admin/page.tsx");
    assert.ok(!/signInWithOAuth|provider:\s*["']google["']|handleGoogleSignIn/.test(s));
  });
});
