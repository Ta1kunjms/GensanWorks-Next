// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-Q:
// A. RUNTIME checks of resolveProfileRole / buildSessionForVerifiedUser through an
//    in-memory fake on supabaseAdmin.from (profile tables only).
// B. STATIC SOURCE CHECKS of the exactly-one narrowing in app/lib/auth.ts.
//
// Runtime tests do not type-check; the build-time error at auth.ts:68 is only
// confirmed resolved by a production build / TypeScript type check.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { User } from "@supabase/supabase-js";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const USER_ID = "9d3e7a1b-5c2f-4e8d-a6b4-3f1e2d0c9b8a";

type ProfileTable = "admins" | "employers" | "jobseekers";
type Result = { data: unknown; error: unknown };

function verifiedUser(userMetadata: Record<string, unknown>): User {
  return {
    id: USER_ID,
    email: "synthetic.narrowing@example.test",
    app_metadata: {},
    user_metadata: userMetadata,
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

describe("Task 13Z-Q — Exactly-one profile narrowing in resolveProfileRole", () => {
  let supabaseAdmin: { from: unknown };
  let authMod: typeof import("@/lib/auth");
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;
  let fetchCalls: number;
  let logs: string[];
  let tablesQueried: string[];

  function installProfiles(rows: Partial<Record<ProfileTable, Result>>) {
    supabaseAdmin.from = (table: ProfileTable) => {
      tablesQueried.push(table);
      const result = rows[table] ?? { data: null, error: null };
      const builder: Record<string, () => unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = () => Promise.resolve(result);
      return builder;
    };
  }
  const row = (isActive: boolean | null): Result => ({ data: { id: USER_ID, is_active: isActive }, error: null });

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    origFrom = supabaseAdmin.from;
  });

  beforeEach(() => {
    logs = [];
    tablesQueried = [];
    fetchCalls = 0;
    origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalls++;
      throw new Error("unexpected network call in offline test");
    }) as typeof globalThis.fetch;
    origWarn = console.warn;
    origError = console.error;
    console.warn = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
    console.error = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
  });

  afterEach(() => {
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
    console.warn = origWarn;
    console.error = origError;
    for (const line of logs) assert.ok(!line.includes(USER_ID), "warnings must not contain identifiers");
    assert.equal(fetchCalls, 0, "no network request may be made");
  });

  describe("A. RUNTIME — authorization behavior", () => {
    it("zero profile rows deny (no default jobseeker role)", async () => {
      installProfiles({});
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      assert.deepEqual(tablesQueried.sort(), ["admins", "employers", "jobseekers"]);
    });

    it("multiple profile rows deny with a conflict warning", async () => {
      installProfiles({ admins: row(true), jobseekers: row(true) });
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      assert.ok(logs.some((l) => l.includes("Conflicting role profiles")));
    });

    it("three profile rows deny", async () => {
      installProfiles({ admins: row(true), employers: row(true), jobseekers: row(true) });
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });

    for (const [table, role] of [
      ["admins", "admin"],
      ["employers", "employer"],
      ["jobseekers", "jobseeker"],
    ] as const) {
      it(`one active ${table} row resolves to ${role}`, async () => {
        installProfiles({ [table]: row(true) });
        assert.equal(await authMod.resolveProfileRole(USER_ID), role);
      });
    }

    for (const isActive of [false, null] as const) {
      it(`one inactive profile (is_active=${isActive}) denies`, async () => {
        installProfiles({ employers: row(isActive) });
        assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      });
    }

    it("lookup error denies even when another table returns an active row", async () => {
      installProfiles({ admins: row(true), employers: { data: null, error: { message: "synthetic failure" } } });
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      assert.ok(logs.some((l) => l.includes("Role profile lookup failed")));
    });

    it("thrown lookup denies", async () => {
      supabaseAdmin.from = () => {
        throw new Error("synthetic thrown failure");
      };
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });

    it("empty user id denies without any lookup", async () => {
      installProfiles({ admins: row(true) });
      assert.equal(await authMod.resolveProfileRole(""), null);
      assert.equal(tablesQueried.length, 0);
    });

    it("user_metadata role never overrides the profile tables", async () => {
      installProfiles({ jobseekers: row(true) });
      const session = await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "admin" }));
      assert.equal(session?.user.role, "jobseeker");

      installProfiles({});
      assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "admin" })), null);
    });

    it("existing test-only mock session remains honored under NODE_ENV=test", async () => {
      const mock = { user: { id: USER_ID, role: "admin" } };
      authMod.__setMockAuthSession(mock);
      try {
        assert.equal(await authMod.auth(), mock);
      } finally {
        authMod.__setMockAuthSession(undefined);
      }
    });
  });

  describe("B. STATIC SOURCE CHECKS (source text only)", () => {
    const src = () => readFileSync(path.join(repoRoot, "app/lib/auth.ts"), "utf8");

    it("static: auth.ts delegates to the shared decision, whose exactly-one invariant binds a local profile before indexing", () => {
      // Task 13Z-S moved the exactly-one narrowing into app/lib/profile-role.ts.
      const s = src();
      assert.match(s, /from "\.\/profile-role"/);
      assert.match(s, /const decision = decideProfileRole\(lookups\);/);
      assert.match(s, /return roleFromDecision\(decision\);/);
      assert.ok(!/profiles\[0\]|found\[0\]/.test(s), "no duplicated indexing logic left in auth.ts");

      const shared = readFileSync(path.join(repoRoot, "app/lib/profile-role.ts"), "utf8");
      assert.match(shared, /if \(found\.length === 0\) return \{ status: "none" \};\s*if \(found\.length > 1\) return \{ status: "conflict" \};/);
      assert.match(shared, /const profile = found\[0\];\s*if \(profile === undefined \|\| profile\.row === null\) return \{ status: "error" \};/);
      assert.match(shared, /return profile\.row\.is_active === true \? \{ status: "ok", role: profile\.role \} : \{ status: "inactive" \};/);
      assert.ok(!/found\[0\]\./.test(shared), "no direct field access on found[0]");
    });

    it("static: no escape hatches or non-null assertions on the profile", () => {
      const s = src();
      assert.ok(!/@ts-(ignore|expect-error|nocheck)/.test(s));
      assert.ok(!/\bas any\b/.test(s));
      assert.ok(!/profiles\[0\]!|profile!\./.test(s));
    });

    it("static: user_metadata is not consulted for the role", () => {
      assert.ok(!/user_metadata\??\.role/.test(src()));
    });
  });
});
