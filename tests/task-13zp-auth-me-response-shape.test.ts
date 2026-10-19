// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access, no .env loading — placeholders only. Covers Task 13Z-P:
// A. RUNTIME route tests for GET /api/auth/me with a NODE_ENV=test mock session
//    and an in-memory fake on supabaseAdmin.from (the route reads profiles via
//    getUserProfile -> db === supabaseAdmin).
// B. STATIC SOURCE CHECKS of app/api/auth/me/route.ts (source text only).
//
// Runtime tests do not type-check; the build-time error at route.ts:45 is only
// confirmed resolved by a production build / TypeScript type check.
//
// Run with: tsx --tsconfig tsconfig.standalone.json --test <file>

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const ROUTE = "app/api/auth/me/route.ts";

const USER_ID = "6e1b9c2d-4f3a-4b8e-9c7d-1a2b3c4d5e6f";
const SECRET_HASH = "synthetic-password-hash-value-91f2";
const DB_DETAIL = "synthetic db failure detail";

type Result = { data: unknown; error: unknown; count?: null; status?: number; statusText?: string };
type Call = { table: string; ops: Array<[string, unknown[]]> };

describe("Task 13Z-P — GET /api/auth/me response shape", () => {
  let supabaseAdmin: { from: unknown };
  let authMod: typeof import("@/lib/auth");
  let GET: typeof import("@/api/auth/me/route").GET;
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;
  let fetchCalls: number;
  let calls: Call[];
  let logs: string[];

  function installFakeDb(result: Result) {
    supabaseAdmin.from = (table: string) => {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const builder: Record<string, (...args: unknown[]) => unknown> = {};
      for (const op of ["select", "eq"]) {
        builder[op] = (...args: unknown[]) => (call.ops.push([op, args]), builder);
      }
      builder.single = () => (call.ops.push(["single", []]), Promise.resolve(result));
      builder.maybeSingle = () => (call.ops.push(["maybeSingle", []]), Promise.resolve(result));
      return builder;
    };
  }

  const signIn = (role: "admin" | "employer" | "jobseeker", image: string | null = null) =>
    authMod.__setMockAuthSession({ user: { id: USER_ID, role, email: "synthetic@example.test", name: "Synthetic User", image } });

  const request = () => GET(new NextRequest("http://localhost/api/auth/me"));

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    ({ GET } = await import("@/api/auth/me/route"));
    origFrom = supabaseAdmin.from;
  });

  beforeEach(() => {
    calls = [];
    logs = [];
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
    authMod.__setMockAuthSession(undefined);
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
    console.warn = origWarn;
    console.error = origError;
    assert.equal(fetchCalls, 0, "no network request may be made");
  });

  describe("A. RUNTIME — route behavior", () => {
    it("logged-out request is rejected before any profile query", async () => {
      authMod.__setMockAuthSession(null);
      installFakeDb({ data: null, error: null });
      const res = await request();
      assert.equal(res.status, 401);
      assert.equal(calls.length, 0);
    });

    it("success keeps the existing envelope and profile wrapper, with password_hash removed", async () => {
      // An absent image is dropped from JSON by the existing api-handler mapping (image || undefined),
      // so a synthetic image is supplied to observe the full envelope.
      signIn("jobseeker", "https://example.test/avatar.png");
      installFakeDb({
        data: { id: USER_ID, first_name: "Synthetic", is_active: true, password_hash: SECRET_HASH },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });
      const res = await request();
      const text = await res.text();
      assert.equal(res.status, 200);
      assert.ok(!text.includes(SECRET_HASH), "password hash value must never be serialized");
      assert.ok(!text.includes("password_hash"), "password_hash key must be absent");
      const body = JSON.parse(text);
      assert.equal(body.success, true);
      assert.deepEqual(Object.keys(body.data).sort(), ["email", "id", "image", "name", "profile", "role"]);
      assert.equal(body.data.id, USER_ID);
      assert.equal(body.data.role, "jobseeker");
      assert.deepEqual(body.data.profile.data, { id: USER_ID, first_name: "Synthetic", is_active: true });
      assert.equal(body.data.profile.error, null);
      assert.equal(typeof body.requestId, "string");
      assert.equal(res.headers.get("X-Request-ID"), body.requestId);
    });

    for (const [role, table] of [
      ["admin", "admins"],
      ["employer", "employers"],
      ["jobseeker", "jobseekers"],
    ] as const) {
      it(`${role}: profile query is scoped to the caller's own id in ${table}`, async () => {
        signIn(role);
        installFakeDb({ data: { id: USER_ID }, error: null });
        assert.equal((await request()).status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].table, table);
        assert.deepEqual(calls[0].ops.find(([op]) => op === "eq")?.[1], ["id", USER_ID]);
      });
    }

    for (const [label, result] of [
      ["no row (PGRST116)", { data: null, error: { code: "PGRST116", message: DB_DETAIL, details: DB_DETAIL, hint: null } }],
      ["database error", { data: null, error: { code: "XX000", message: DB_DETAIL, details: DB_DETAIL, hint: null } }],
      ["null data without error", { data: null, error: null }],
    ] as const) {
      it(`${label} returns a generic 404 with no raw database error`, async () => {
        signIn("employer");
        installFakeDb(result);
        const res = await request();
        const text = await res.text();
        assert.equal(res.status, 404);
        assert.ok(!text.includes(DB_DETAIL), "raw database detail must not leak");
        assert.ok(!text.includes("PGRST116") && !text.includes("XX000"), "database error codes must not leak");
        const body = JSON.parse(text);
        assert.notEqual(body.success, true);
        assert.ok(!("profile" in (body.data ?? {})), "no profile payload on failure");
        for (const line of logs) assert.ok(!line.includes(DB_DETAIL));
      });
    }
  });

  describe("B. STATIC SOURCE CHECKS (source text only)", () => {
    const src = () => readFileSync(path.join(repoRoot, ROUTE), "utf8");

    it("static: route reads the row from .data and checks .error instead of casting the whole response", () => {
      const s = src();
      assert.match(s, /if \(profileResult\.error \|\| !profileResult\.data/);
      assert.match(s, /const profileRow: Record<string, unknown> = profileResult\.data;/);
      assert.ok(!/as Record<string, unknown>/.test(s), "no cast of the response object");
    });

    it("static: no escape hatches", () => {
      const s = src();
      assert.ok(!/\bas any\b|:\s*any\b|as unknown as|@ts-ignore|@ts-expect-error/.test(s));
    });

    it("static: Task 13O sanitization markers and auth requirement are preserved", () => {
      const s = src();
      assert.ok(s.includes("password_hash: _omitted"));
      assert.ok(s.includes("profile: sanitizedProfile"));
      assert.ok(!s.includes("profile,\n"));
      assert.match(s, /requireAuth: true/);
    });
  });
});
