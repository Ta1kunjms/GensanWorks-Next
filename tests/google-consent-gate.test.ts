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
  resolveCallbackDestination,
  CONSENT_PAGE_PATH,
  CONSENT_DECLINED_PATH,
  type ConsentGateUser,
  type ConsentStore,
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

function fakeStore(existingRows: string[] = []) {
  const rows = new Map<string, Record<string, unknown>>(existingRows.map((id) => [id, { id }]));
  const metadata = new Map<string, Record<string, unknown>>();
  const calls: string[] = [];
  const store: ConsentStore = {
    async updateJobseeker(id, values) {
      calls.push(`update:${id}`);
      const row = rows.get(id);
      if (!row) return 0;
      rows.set(id, { ...row, ...values });
      return 1;
    },
    async insertJobseeker(values) {
      calls.push(`insert:${values.id}`);
      rows.set(String(values.id), { ...values });
    },
    async setAppMetadata(id, appMetadata) {
      calls.push(`metadata:${id}`);
      metadata.set(id, appMetadata);
    },
  };
  return { store, rows, metadata, calls };
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

  it("accept records consent on the caller's own row, reactivates it, and mirrors app_metadata", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([user.id, "other-user"]);
    const now = new Date("2026-10-20T00:00:00.000Z");
    const result = await applyConsentAction(user, "accept", store, now);

    assert.deepEqual(result, { status: 200, redirectTo: "/jobseeker/dashboard", signOut: false });
    assert.equal(rows.get(user.id)?.consent_given_at, now.toISOString());
    assert.equal(rows.get(user.id)?.consent_privacy_notice_version, PRIVACY_NOTICE_VERSION);
    assert.equal(rows.get(user.id)?.is_active, true);
    assert.deepEqual(rows.get("other-user"), { id: "other-user" }, "another user's row must not change");
    assert.equal(metadata.get(user.id)?.consent_version, PRIVACY_NOTICE_VERSION);
    assert.equal(metadata.get(user.id)?.provider, "google", "existing app_metadata must be preserved");
  });

  it("accept creates a minimal jobseeker row with consent when no profile exists", async () => {
    const user = googleUser();
    const { store, rows, calls } = fakeStore();
    await applyConsentAction(user, "accept", store);

    assert.deepEqual(calls, [`update:${user.id}`, `insert:${user.id}`, `metadata:${user.id}`]);
    const row = rows.get(user.id);
    assert.equal(row?.first_name, "Synthetic");
    assert.equal(row?.last_name, "Google User");
    assert.equal(row?.password_hash, "auth_managed");
    assert.ok(row?.consent_given_at);
  });

  it("decline deactivates the profile and signs out, without recording consent", async () => {
    const user = googleUser();
    const { store, rows, metadata } = fakeStore([user.id]);
    const result = await applyConsentAction(user, "decline", store);

    assert.deepEqual(result, { status: 200, redirectTo: CONSENT_DECLINED_PATH, signOut: true });
    assert.equal(rows.get(user.id)?.is_active, false);
    assert.equal(rows.get(user.id)?.consent_given_at, undefined);
    assert.equal(metadata.size, 0);
  });

  it("is a no-op for a user who already consented (cannot reactivate a deactivated profile)", async () => {
    const user = googleUser({ consent_version: PRIVACY_NOTICE_VERSION });
    const { store, calls } = fakeStore([user.id]);
    const result = await applyConsentAction(user, "accept", store);
    assert.equal(result.status, 200);
    assert.deepEqual(calls, []);
  });

  it("request schema accepts only accept/decline and ignores any user id in the body", () => {
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "accept" }).success, true);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "decline" }).success, true);
    assert.equal(oauthConsentRequestSchema.safeParse({ action: "approve" }).success, false);
    assert.equal(oauthConsentRequestSchema.safeParse({}).success, false);
    const parsed = oauthConsentRequestSchema.parse({ action: "accept", userId: "someone-else" });
    assert.equal("userId" in parsed, false);
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
    for (const p of ["/jobseeker", "/jobseeker/dashboard", "/employer/jobs"]) {
      assert.equal(consentGateRedirect(p, googleUser()), CONSENT_PAGE_PATH, p);
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

  it("consent API takes the user from the server session, not the request body", () => {
    const s = readSource("app/api/auth/consent/route.ts");
    assert.match(s, /supabase\.auth\.getUser\(\)/);
    assert.match(s, /applyConsentAction\(user, body!\.action, store\)/);
    assert.match(s, /bodySchema: oauthConsentRequestSchema/);
  });

  it("login page offers Google to jobseekers only, without extra OAuth scopes", () => {
    const s = readSource("app/login/page.tsx");
    assert.match(s, /\{role === "jobseeker" \? \([\s\S]*Continue with Google[\s\S]*\) : null\}/);
    assert.ok(!/access_type|prompt:\s*["']consent["']|auth\/callback\?next=/.test(s));
  });

  it("admin login page does not offer Google", () => {
    const s = readSource("app/login/admin/page.tsx");
    assert.ok(!/signInWithOAuth|provider:\s*["']google["']|handleGoogleSignIn/.test(s));
  });
});
