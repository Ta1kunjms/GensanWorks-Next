// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-S:
// A. RUNTIME checks of sanitizeNextPath (app/lib/supabase-middleware.ts), used by
//    the OAuth callback for its `next` redirect.
// B. STATIC SOURCE CHECKS of app/auth/callback/route.ts. The route itself is not
//    executed here: it needs next/headers cookies() inside a request scope, which is
//    not available offline without module mocking.
// C. STATIC SOURCE CHECKS that the pilot signup/login UI has no Google path and
//    keeps the email/password flows.
// D. Task 13Z-T admin-callback section:
//    D1. RUNTIME checks of resolveProfileRole, the admin decision the admin callback
//        uses (in-memory fake on supabaseAdmin.from; fetch blocked).
//    D2. STATIC SOURCE CHECKS of app/api/auth/callback/admin/route.ts (not executed:
//        it needs next/headers cookies() inside a request scope).
//    D3. STATIC SOURCE CHECKS that app/login/admin/page.tsx has no Google path.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder";

const repoRoot = path.resolve(__dirname, "..");
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const ORIGIN = "https://app.example.test";

describe("Task 13Z-S — OAuth callback hardening and Google-disabled UI", () => {
  let sanitizeNextPath: (next: string | null, origin: string) => string | null;
  let origFetch: typeof globalThis.fetch;
  let fetchCalls: number;

  before(async () => {
    ({ sanitizeNextPath } = await import("@/lib/supabase-middleware"));
  });

  beforeEach(() => {
    fetchCalls = 0;
    origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalls++;
      throw new Error("unexpected network call in offline test");
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    assert.equal(fetchCalls, 0, "no network request may be made");
  });

  describe("A. RUNTIME — next sanitizer", () => {
    for (const valid of ["/jobseeker/dashboard", "/employer/jobs?tab=open", "/admin/dashboard#top", "/"]) {
      it(`accepts same-origin relative path ${valid}`, () => {
        assert.equal(sanitizeNextPath(valid, ORIGIN), valid);
      });
    }

    const rejected: Array<[string, string | null]> = [
      ["missing", null],
      ["empty", ""],
      ["absolute external URL", "https://evil.example/phish"],
      ["absolute same-origin URL", `${ORIGIN}/jobseeker/dashboard`],
      ["protocol-relative", "//evil.example/phish"],
      ["backslash protocol-relative", "/\\evil.example"],
      ["userinfo trick", "@evil.example"],
      ["javascript scheme", "javascript:alert(1)"],
      ["relative without slash", "jobseeker/dashboard"],
      ["embedded whitespace", "/jobseeker /dashboard"],
      ["control character", "/jobseeker\n/dashboard"],
      ["tab-prefixed protocol-relative", "/\t/evil.example"],
    ];
    for (const [label, value] of rejected) {
      it(`rejects ${label}`, () => {
        assert.equal(sanitizeNextPath(value, ORIGIN), null);
      });
    }

    it("rejects malformed origin input without throwing", () => {
      assert.equal(sanitizeNextPath("/jobseeker", "not a url"), null);
    });
  });

  describe("B. STATIC SOURCE CHECKS — app/auth/callback/route.ts", () => {
    const src = () => readSource("app/auth/callback/route.ts");

    it("static: no profile INSERT/UPSERT of any kind", () => {
      const s = src();
      assert.ok(!/\.insert\(|\.upsert\(/.test(s));
      assert.ok(!/password_hash|auth_managed/.test(s));
    });

    it("static: no metadata-based role or authorization", () => {
      assert.ok(!/user_metadata|raw_user_meta_data|app_metadata/.test(src()));
    });

    it("static: role comes from the shared exactly-one-active decision on own-row id/is_active", () => {
      const s = src();
      assert.match(s, /from '@\/lib\/profile-role'/);
      assert.match(s, /decideProfileRole\(lookups\)/);
      assert.match(s, /\.select\('id, is_active'\)\s*\.eq\('id', userId\)/);
    });

    it("static: explicit denial path signs out and uses the safe error page", () => {
      const s = src();
      assert.match(s, /const FAILURE_PATH = '\/auth\/auth-code-error'/);
      assert.match(s, /if \(!role\) \{[\s\S]*?supabase\.auth\.signOut\(\)[\s\S]*?return failure/);
      assert.ok(!/next \?\? '\/jobseeker\/dashboard'/.test(s), "no default jobseeker fallback");
    });

    it("static: next is sanitized and redirects are built against the request origin", () => {
      const s = src();
      assert.match(s, /sanitizeNextPath\(searchParams\.get\('next'\), origin\)/);
      assert.match(s, /new URL\(next \?\? DASHBOARDS\[role\], origin\)/);
      assert.ok(!/`\$\{origin\}\$\{next/.test(s), "no string-concatenated origin+next redirect");
    });

    it("static: no privileged client and no Google consent claim", () => {
      const s = src();
      assert.ok(!/supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY|from '@\/lib\/supabase'/.test(s));
      assert.ok(!/consent (is )?(recorded|implemented|captured)/i.test(s));
    });

    it("static: route exports only GET and route config", () => {
      const exports = Array.from(src().matchAll(/^export\s+(?:async\s+)?(?:const|function)\s+(\w+)/gm)).map((m) => m[1]);
      assert.deepEqual(exports.sort(), ["GET", "dynamic"]);
    });
  });

  describe("C. STATIC SOURCE CHECKS — pilot signup/login UI", () => {
    for (const rel of ["app/signup/page.tsx", "app/login/page.tsx"]) {
      it(`static: ${rel} has no Google sign-in/sign-up path`, () => {
        const s = readSource(rel);
        assert.ok(!/signInWithOAuth|handleGoogleSignIn|Continue with Google|provider:\s*["']google["']/.test(s));
        assert.ok(!/auth\/callback/.test(s));
      });
    }

    it("static: email/password signup flow is preserved", () => {
      const s = readSource("app/signup/page.tsx");
      assert.ok(s.includes('"/api/auth/signup/jobseeker"'));
      assert.ok(s.includes('"/api/auth/signup/employer"'));
      assert.match(s, /<form onSubmit=\{handleSubmit\}/);
    });

    it("static: email/password login flow is preserved", () => {
      const s = readSource("app/login/page.tsx");
      assert.match(s, /supabase\.auth\.signInWithPassword\(\{/);
      assert.match(s, /lookupAccountExists\(role\)/);
      assert.match(s, /<form onSubmit=\{handleSubmit\}/);
    });
  });
});

describe("Task 13Z-T — Admin OAuth callback closure", () => {
  const ADMIN_ROUTE = "app/api/auth/callback/admin/route.ts";
  const ADMIN_PAGE = "app/login/admin/page.tsx";
  const USER_ID = "8f2d6b1a-3c4e-4a7b-9d1f-0e5c2b7a6d3e";

  type ProfileTable = "admins" | "employers" | "jobseekers";
  type Result = { data: unknown; error: unknown };

  describe("D1. RUNTIME — admin decision used by the callback (resolveProfileRole)", () => {
    let supabaseAdmin: { from: unknown };
    let authMod: typeof import("@/lib/auth");
    let origFrom: unknown;
    let origFetch: typeof globalThis.fetch;
    let origWarn: typeof console.warn;
    let fetchCalls: number;

    const row = (isActive: boolean | null): Result => ({ data: { id: USER_ID, is_active: isActive }, error: null });
    function installProfiles(rows: Partial<Record<ProfileTable, Result>>) {
      supabaseAdmin.from = (table: ProfileTable) => {
        const result = rows[table] ?? { data: null, error: null };
        const builder: Record<string, () => unknown> = {};
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.maybeSingle = () => Promise.resolve(result);
        return builder;
      };
    }

    before(async () => {
      ({ supabaseAdmin } = await import("@/lib/supabase"));
      authMod = await import("@/lib/auth");
      origFrom = supabaseAdmin.from;
    });

    beforeEach(() => {
      fetchCalls = 0;
      origFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        fetchCalls++;
        throw new Error("unexpected network call in offline test");
      }) as typeof globalThis.fetch;
      origWarn = console.warn;
      console.warn = () => {};
    });

    afterEach(() => {
      supabaseAdmin.from = origFrom;
      globalThis.fetch = origFetch;
      console.warn = origWarn;
      assert.equal(fetchCalls, 0, "no network request may be made");
    });

    it("one active admins row -> admin", async () => {
      installProfiles({ admins: row(true) });
      assert.equal(await authMod.resolveProfileRole(USER_ID), "admin");
    });

    it("trigger-created jobseeker row only (new Google requester) -> not admin", async () => {
      installProfiles({ jobseekers: row(true) });
      assert.notEqual(await authMod.resolveProfileRole(USER_ID), "admin");
    });

    it("admins row plus trigger-created jobseeker row -> denied as conflict", async () => {
      installProfiles({ admins: row(true), jobseekers: row(true) });
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });

    it("inactive admins row -> denied", async () => {
      installProfiles({ admins: row(false) });
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });

    it("no profile at all -> denied", async () => {
      installProfiles({});
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });
  });

  describe("D2. STATIC SOURCE CHECKS — admin callback route (source text only)", () => {
    const src = () => readSource(ADMIN_ROUTE);
    const code = () => src().split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");

    it("static: admin is decided by resolveProfileRole(user.id), not by email", () => {
      const s = code();
      assert.match(s, /import \{ resolveProfileRole \} from "@\/lib\/auth";/);
      assert.match(s, /if \(\(await resolveProfileRole\(user\.id\)\) === "admin"\) \{\s*return NextResponse\.redirect\(`\$\{origin\}\/admin\/dashboard`\);/);
      assert.ok(!/from\("admins"\)|from\('admins'\)/.test(s), "no direct admins table access");
    });

    it("static: never creates an admins row; the only write is pending request intake", () => {
      const s = code();
      const inserts = Array.from(s.matchAll(/from\("([a-z_]+)"\)\.insert\(/g)).map((m) => m[1]);
      assert.deepEqual(inserts, ["admin_access_requests"]);
      assert.match(s, /status: "pending",\s*\}\);/);
      assert.ok(!/\.upsert\(/.test(s));
    });

    it("static: never updates (and so never resets) an access request", () => {
      assert.ok(!/\.update\(/.test(code()), "no request status changes in the callback");
      assert.ok(!/reviewed_at/.test(code()));
    });

    it("static: non-admin sessions are signed out before any non-admin redirect", () => {
      const s = code();
      const adminCheck = s.indexOf('=== "admin"');
      const signOut = s.indexOf("await supabase.auth.signOut()");
      assert.ok(adminCheck > 0 && signOut > adminCheck, "sign-out follows the admin check");
      const afterSignOut = s.slice(signOut);
      const beforeSignOut = s.slice(adminCheck, signOut);
      assert.ok(!/pending_approval|access_rejected|access_not_active|no_email|request_failed/.test(beforeSignOut));
      for (const marker of ["no_email", "request_failed", "access_rejected", "access_not_active", "pending_approval"]) {
        assert.ok(afterSignOut.includes(marker), `${marker} redirect happens after sign-out`);
      }
    });

    it("static: approved-without-profile is not treated as approval or access", () => {
      const s = code();
      assert.match(s, /return adminLogin\(\{ error: "access_not_active" \}\);/);
      assert.ok(!/status === "approved"/.test(s));
    });

    it("static: no metadata-based authorization (metadata only names an intake request)", () => {
      const s = code();
      assert.ok(!/user_metadata\??\.role|app_metadata/.test(s));
      const metadataLines = s.split("\n").filter((l) => l.includes("user_metadata"));
      assert.ok(metadataLines.every((l) => /user_metadata\?\.(full_name|name)/.test(l)));
    });

    it("static: generic client errors only; no raw error objects logged or redirected", () => {
      const s = code();
      assert.ok(!/console\.error\([^)]*,\s*\w*[Ee]rror\)/.test(s), "no raw error objects in logs");
      assert.ok(!/error=\$\{|message\b.*adminLogin/.test(s));
      assert.ok(!/encodeURIComponent\(userEmail\)[\s\S]*access_rejected/.test(s));
    });

    it("static: route exports only GET and route config", () => {
      const exports = Array.from(src().matchAll(/^export\s+(?:async\s+)?(?:const|function)\s+(\w+)/gm)).map((m) => m[1]);
      assert.deepEqual(exports.sort(), ["GET", "dynamic"]);
    });
  });

  describe("D3. STATIC SOURCE CHECKS — admin login page (source text only)", () => {
    const src = () => readSource(ADMIN_PAGE);

    it("static: no Google sign-in path remains on the admin login page", () => {
      const s = src();
      assert.ok(!/signInWithOAuth|handleGoogleSignIn|provider:\s*["']google["']|callback\/admin|>\s*Google\s*</.test(s));
      assert.ok(!/Or continue with/.test(s));
    });

    it("static: email/password admin login, validation, and request link are preserved", () => {
      const s = src();
      assert.match(s, /supabase\.auth\.signInWithPassword\(\{/);
      assert.match(s, /lookupAccountExists\(\)/);
      assert.ok(s.includes('nextErrors.email = "Enter a valid email"'));
      assert.ok(s.includes('aria-label={showPassword ? "Hide password" : "Show password"}'));
      assert.ok(s.includes('href="/signup/admin-request"'));
      assert.match(s, /<PendingApprovalModal/);
    });
  });
});
