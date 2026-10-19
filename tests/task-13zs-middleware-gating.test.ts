// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-S:
// A. RUNTIME checks of the pure navigation decision (decideNavigation /
//    requiresRoleLookup) exported by app/lib/supabase-middleware.ts.
// B. RUNTIME logged-out check of updateSession with no session cookie (the
//    user-scoped client reports no user without a network call; fetch is blocked).
// C. STATIC SOURCE CHECKS of app/lib/supabase-middleware.ts.
//
// Middleware is navigation gating only; API authorization stays in api-handler/auth.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder";

const repoRoot = path.resolve(__dirname, "..");
const MIDDLEWARE = "app/lib/supabase-middleware.ts";

describe("Task 13Z-S — Middleware navigation gating", () => {
  let mw: typeof import("@/lib/supabase-middleware");
  let origFetch: typeof globalThis.fetch;
  let fetchCalls: number;

  before(async () => {
    mw = await import("@/lib/supabase-middleware");
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

  describe("A. RUNTIME — decideNavigation", () => {
    const portals = [
      ["/jobseeker/dashboard", "jobseeker", "/login?role=jobseeker"],
      ["/employer/jobs", "employer", "/login?role=employer"],
      ["/admin/dashboard", "admin", "/login/admin"],
    ] as const;

    for (const [pathname, role, login] of portals) {
      it(`logged out on ${pathname} -> ${login}`, () => {
        assert.deepEqual(mw.decideNavigation(pathname, false, null), { action: "redirect", location: login });
      });

      it(`signed in with no valid role on ${pathname} -> ${login} (no default jobseeker)`, () => {
        assert.deepEqual(mw.decideNavigation(pathname, true, null), { action: "redirect", location: login });
      });

      it(`correct role ${role} on ${pathname} -> allowed`, () => {
        assert.deepEqual(mw.decideNavigation(pathname, true, role), { action: "next" });
      });
    }

    it("wrong role is redirected to the portal's login", () => {
      assert.deepEqual(mw.decideNavigation("/admin/dashboard", true, "jobseeker"), { action: "redirect", location: "/login/admin" });
      assert.deepEqual(mw.decideNavigation("/employer/jobs", true, "jobseeker"), { action: "redirect", location: "/login?role=employer" });
      assert.deepEqual(mw.decideNavigation("/jobseeker/profile", true, "employer"), { action: "redirect", location: "/login?role=jobseeker" });
    });

    for (const entry of ["/login", "/signup", "/"]) {
      it(`${entry} with no valid role stays (no dashboard redirect)`, () => {
        assert.deepEqual(mw.decideNavigation(entry, true, null), { action: "next" });
        assert.deepEqual(mw.decideNavigation(entry, false, null), { action: "next" });
      });
    }

    it("/login with a valid role redirects to that role's dashboard", () => {
      assert.deepEqual(mw.decideNavigation("/login", true, "employer"), { action: "redirect", location: "/employer/dashboard" });
      assert.deepEqual(mw.decideNavigation("/", true, "admin"), { action: "redirect", location: "/admin/dashboard" });
    });

    it("public and API paths are not gated", () => {
      assert.deepEqual(mw.decideNavigation("/about", false, null), { action: "next" });
      assert.deepEqual(mw.decideNavigation("/api/jobs", true, null), { action: "next" });
      assert.deepEqual(mw.decideNavigation("/login/admin", true, null), { action: "next" });
    });

    it("role lookup is only needed for portal and entry paths", () => {
      for (const p of ["/jobseeker", "/employer/x", "/admin/y", "/login", "/signup", "/"]) assert.equal(mw.requiresRoleLookup(p), true, p);
      for (const p of ["/about", "/api/jobs", "/login/admin", "/privacy"]) assert.equal(mw.requiresRoleLookup(p), false, p);
    });
  });

  describe("B. RUNTIME — updateSession without a session", () => {
    it("logged-out request to a portal is redirected to its login", async () => {
      const res = await mw.updateSession(new NextRequest("http://localhost/jobseeker/dashboard"));
      assert.equal(res.status, 307);
      assert.equal(new URL(res.headers.get("location") ?? "").pathname + new URL(res.headers.get("location") ?? "").search, "/login?role=jobseeker");
    });

    it("logged-out request to /login passes through", async () => {
      const res = await mw.updateSession(new NextRequest("http://localhost/login"));
      assert.equal(res.headers.get("location"), null);
    });
  });

  describe("C. STATIC SOURCE CHECKS (source text only)", () => {
    const src = () => readFileSync(path.join(repoRoot, MIDDLEWARE), "utf8");

    it("static: no user_metadata role and no default jobseeker", () => {
      const s = src();
      assert.ok(!/user_metadata|raw_user_meta_data/.test(s));
      assert.ok(!/:\s*'jobseeker'\s*$|\?\s*role\s*:\s*'jobseeker'|\|\|\s*'jobseeker'|\?\?\s*'jobseeker'/m.test(s));
    });

    it("static: no service-role client, privileged module, or server-only auth import", () => {
      const s = src();
      assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin/.test(s));
      assert.ok(!/from ['"](\.\/supabase|@\/lib\/supabase|\.\/auth|@\/lib\/auth)['"]/.test(s));
      assert.match(s, /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/);
    });

    it("static: own-row id/is_active lookup through the shared decision", () => {
      const s = src();
      assert.match(s, /\.select\('id, is_active'\)\s*\.eq\('id', user\.id\)/);
      assert.match(s, /decideProfileRole\(lookups\)/);
      assert.match(s, /from '\.\/profile-role'/);
    });

    it("static: no per-request logging of user ids or roles", () => {
      assert.ok(!/console\.(log|info|warn|error|debug)/.test(src()));
    });
  });
});
