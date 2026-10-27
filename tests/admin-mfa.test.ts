// Admin MFA (pilot constraint #7): policy helpers plus static checks that the
// middleware, auth() and the /auth/mfa page enforce aal2 for admins.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADMIN_MFA_PATH, adminMfaRequired, adminMfaSatisfied } from "../app/lib/admin-mfa";
import { decideNavigation } from "../app/lib/supabase-middleware";
import { totpCode } from "./e2e-setup";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("admin MFA policy", () => {
  it("is required by default and always in production", () => {
    assert.equal(adminMfaRequired({}), true);
    assert.equal(adminMfaRequired({ ADMIN_MFA_REQUIRED: "true" }), true);
    assert.equal(adminMfaRequired({ NODE_ENV: "production", ADMIN_MFA_REQUIRED: "false" }), true);
  });

  it("can be switched off only outside production with the exact value false", () => {
    assert.equal(adminMfaRequired({ NODE_ENV: "development", ADMIN_MFA_REQUIRED: "false" }), false);
    assert.equal(adminMfaRequired({ NODE_ENV: "development", ADMIN_MFA_REQUIRED: "0" }), true);
    assert.equal(adminMfaRequired({ NODE_ENV: "development", ADMIN_MFA_REQUIRED: "FALSE" }), true);
  });

  it("is satisfied only at aal2 (fails closed)", () => {
    assert.equal(adminMfaSatisfied("aal2"), true);
    assert.equal(adminMfaSatisfied("aal1"), false);
    assert.equal(adminMfaSatisfied(null), false);
    assert.equal(adminMfaSatisfied(undefined), false);
  });

  it("MFA page sits outside the role-gated /admin prefix", () => {
    assert.equal(ADMIN_MFA_PATH.startsWith("/admin"), false);
    assert.deepEqual(decideNavigation(ADMIN_MFA_PATH, true, "admin"), { action: "next" });
    assert.deepEqual(decideNavigation(ADMIN_MFA_PATH, false, null), { action: "next" });
  });
});

describe("e2e TOTP helper", () => {
  it("matches the RFC 6238 SHA-1 test vectors (6-digit truncation)", () => {
    // ASCII "12345678901234567890" in base32.
    const rfcSeedBase32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    assert.equal(totpCode(rfcSeedBase32, 59_000), "287082");
    assert.equal(totpCode(rfcSeedBase32, 1_111_111_109_000), "081804");
    assert.equal(totpCode(rfcSeedBase32, 1_234_567_890_000), "005924");
  });
});

describe("admin MFA enforcement wiring", () => {
  it("middleware redirects admin portal pages below aal2 to the MFA page", () => {
    const src = read("app/lib/supabase-middleware.ts");
    assert.match(src, /role === 'admin' && pathname\.startsWith\('\/admin'\) && adminMfaRequired\(\)/);
    assert.match(src, /getAuthenticatorAssuranceLevel\(\)/);
    assert.match(src, /error \|\| !adminMfaSatisfied\(data\?\.currentLevel\)/);
    assert.match(src, /NextResponse\.redirect\(new URL\(ADMIN_MFA_PATH/);
  });

  it("auth() returns no session for an admin below aal2", () => {
    const src = read("app/lib/auth.ts");
    assert.match(src, /session\?\.user\.role === "admin" && adminMfaRequired\(\)/);
    assert.match(src, /if \(aalError \|\| !adminMfaSatisfied\(aal\?\.currentLevel\)\) return null;/);
  });

  it("MFA page enrolls TOTP, verifies, and never shows the dashboard without aal2", () => {
    const src = read("app/auth/mfa/page.tsx");
    assert.match(src, /mfa\.enroll\(\{\s*factorType: "totp"/);
    assert.match(src, /mfa\.challengeAndVerify\(\{ factorId, code: trimmed \}\)/);
    assert.match(src, /status !== "verified"[\s\S]*mfa\.unenroll/);
    assert.match(src, /autoComplete="one-time-code"/);
    assert.match(src, /role="alert"/);
  });
});
