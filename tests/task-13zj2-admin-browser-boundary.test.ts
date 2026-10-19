// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13Z-J2 — admin browser database-query boundary:
// A. Behavioral route tests for GET /api/admin/referral-slips/list, with
//    sessions resolved through the real profile-role resolver against mocked tables.
// B. STATIC SOURCE CHECKS of app/admin/referrals/page.tsx and
//    app/admin/reports/page.tsx (client components; no DOM test tooling is
//    available offline). These inspect source text only and are not
//    browser/DOM integration tests.

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const REFERRALS_PAGE = "app/admin/referrals/page.tsx";
const REPORTS_PAGE = "app/admin/reports/page.tsx";

const ADMIN_ID = "0b6f7a52-1c1e-4d8e-9b0a-6a3f2d1c4e5f";
const OTHER_ID = "5d2c9e14-7a3b-4f1e-8c6d-2e9f1a0b3c4d";
const APPLICANT_ID = "3f2b8c1e-9d4a-4e6b-8a1c-2b3d4e5f6a7b";

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Result = { data: unknown; error: unknown };
type Responder = (call: Call) => Result;

const opArgs = (call: Call, name: string) => call.ops.find(([op]) => op === name)?.[1];
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

const SYNTHETIC_SLIP = {
  id: "11111111-1111-4111-8111-111111111111",
  slip_number: "RS-2026-00001",
  status: "issued",
  issued_at: "2026-10-01T00:00:00.000Z",
  valid_until: "2026-10-31T00:00:00.000Z",
  applicant_id: APPLICANT_ID,
  jobs: { position_title: "Synthetic Clerk", employers: { establishment_name: "Synthetic Establishment" } },
};

describe("Task 13Z-J2 — Admin browser database-query boundary", () => {
  let supabaseAdmin: any;
  let authMod: any;
  let listGET: (req: Request) => Promise<Response>;
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let origError: typeof console.error;
  let origWarn: typeof console.warn;
  let calls: Call[];
  let logs: string[];

  function installFakeDb(responders: Record<string, Responder>) {
    supabaseAdmin.from = (table: string) => {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const resolve = () => Promise.resolve(responders[table]?.(call) ?? { data: null, error: null });
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") return (onF: any, onR: any) => resolve().then(onF, onR);
            if (prop === "single" || prop === "maybeSingle") {
              return () => {
                call.ops.push([prop, []]);
                return resolve();
              };
            }
            return (...args: unknown[]) => {
              call.ops.push([String(prop), args]);
              return builder;
            };
          },
        }
      );
      return builder;
    };
  }

  /** Resolve a session through the real profile-role resolver, then install it as the request session. */
  async function signInAs(table: "admins" | "employers" | "jobseekers", userId: string) {
    const row = { data: { id: userId, is_active: true }, error: null };
    installFakeDb({
      admins: () => (table === "admins" ? row : { data: null, error: null }),
      employers: () => (table === "employers" ? row : { data: null, error: null }),
      jobseekers: () => (table === "jobseekers" ? row : { data: null, error: null }),
    });
    const session = await authMod.buildSessionForVerifiedUser({
      id: userId,
      email: "synthetic@example.test",
      app_metadata: {},
      user_metadata: { role: "admin" }, // forged metadata must not matter
      aud: "authenticated",
      created_at: "2026-10-01T00:00:00.000Z",
    } as any);
    authMod.__setMockAuthSession(session);
    calls = [];
    return session;
  }

  const slipTable = (result: Result) => installFakeDb({ referral_slips: () => result });
  const slipQueries = () => calls.filter((c) => c.table === "referral_slips");
  const get = (query = "") =>
    listGET(
      new Request(`http://localhost/api/admin/referral-slips/list${query}`, {
        headers: { "x-forwarded-for": "203.0.113.20" },
      })
    );

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    ({ GET: listGET } = (await import("@/api/admin/referral-slips/list/route")) as any);
  });

  beforeEach(() => {
    calls = [];
    logs = [];
    origFrom = supabaseAdmin.from;
    origFetch = globalThis.fetch;
    origError = console.error;
    origWarn = console.warn;
    (globalThis as any).fetch = (...args: unknown[]) => {
      throw new Error(`Unexpected network/fetch call during offline test: ${JSON.stringify(args)}`);
    };
    const capture = (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
    console.error = capture;
    console.warn = capture;
  });

  afterEach(() => {
    authMod.__setMockAuthSession(undefined);
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
    console.error = origError;
    console.warn = origWarn;
  });

  describe("A. Slip list route behavior", () => {
    it("logged-out request is denied before any slip query", async () => {
      authMod.__setMockAuthSession(null);
      slipTable({ data: [SYNTHETIC_SLIP], error: null });
      const res = await get();
      assert.equal(res.status, 401);
      assert.equal(slipQueries().length, 0);
    });

    for (const table of ["employers", "jobseekers"] as const) {
      it(`verified ${table.slice(0, -1)} with forged admin metadata is denied before any slip query`, async () => {
        const session = await signInAs(table, OTHER_ID);
        assert.notEqual(session?.user.role, "admin");
        slipTable({ data: [SYNTHETIC_SLIP], error: null });
        const res = await get();
        assert.equal(res.status, 401);
        assert.equal(slipQueries().length, 0);
      });
    }

    it("administrator receives slips with explicit minimal fields, newest first, bounded to 200 by default", async () => {
      await signInAs("admins", ADMIN_ID);
      slipTable({ data: [SYNTHETIC_SLIP], error: null });

      const res = await get();
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.slips, [SYNTHETIC_SLIP]);

      const queries = slipQueries();
      assert.equal(queries.length, 1);
      assert.equal(calls.length, 1, "no other tables (profiles) are queried");
      const select = normalize(String(opArgs(queries[0], "select")?.[0]));
      assert.equal(
        select,
        "id, slip_number, status, issued_at, valid_until, applicant_id, jobs ( position_title, employers ( establishment_name ) )"
      );
      assert.ok(!select.includes("*"));
      assert.ok(!select.includes("password_hash"));
      assert.ok(!/jobseekers|admins|email|phone/.test(select), "no profile data beyond applicant_id");
      assert.deepEqual(opArgs(queries[0], "order"), ["issued_at", { ascending: false }]);
      assert.deepEqual(opArgs(queries[0], "limit"), [200]);
    });

    it("explicit limit within bounds is honored", async () => {
      await signInAs("admins", ADMIN_ID);
      slipTable({ data: [], error: null });
      const res = await get("?limit=50");
      assert.equal(res.status, 200);
      assert.deepEqual(opArgs(slipQueries()[0], "limit"), [50]);
    });

    it("limit=200 (the page's request) is accepted", async () => {
      await signInAs("admins", ADMIN_ID);
      slipTable({ data: [], error: null });
      const res = await get("?limit=200");
      assert.equal(res.status, 200);
      assert.deepEqual(opArgs(slipQueries()[0], "limit"), [200]);
    });

    for (const [label, query] of [
      ["limit above 200", "?limit=201"],
      ["limit of zero", "?limit=0"],
      ["negative limit", "?limit=-5"],
      ["non-numeric limit", "?limit=abc"],
      ["fractional limit", "?limit=2.5"],
      ["unsupported parameter", "?applicant_id=" + APPLICANT_ID],
      ["unsupported select override", "?select=*"],
    ] as const) {
      it(`rejects ${label} with 400 and no slip query`, async () => {
        await signInAs("admins", ADMIN_ID);
        slipTable({ data: [], error: null });
        const res = await get(query);
        assert.equal(res.status, 400);
        assert.equal((await res.json()).error, "Invalid query parameters");
        assert.equal(slipQueries().length, 0);
      });
    }

    it("database failure returns a generic 500 without raw error details in response or logs", async () => {
      await signInAs("admins", ADMIN_ID);
      slipTable({ data: null, error: { code: "XX000", message: "synthetic db failure detail" } });
      const res = await get();
      assert.equal(res.status, 500);
      const text = JSON.stringify(await res.json());
      assert.ok(text.includes("Unable to load referral slips"));
      assert.ok(!text.includes("synthetic db failure detail"));
      assert.ok(logs.length > 0, "failure should be logged");
      for (const line of logs) assert.ok(!line.includes("synthetic db failure detail"));
    });

    it("empty result returns an empty list", async () => {
      await signInAs("admins", ADMIN_ID);
      slipTable({ data: null, error: null });
      const res = await get();
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).slips, []);
    });
  });

  describe("B. Pages — STATIC SOURCE CHECKS (not DOM/browser integration tests)", () => {
    const sharedImport = /from\s+["'](@\/lib\/supabase|\.\.?\/.*lib\/supabase)["']/;
    const directQuery = /\.(from|rpc|channel)\(\s*["'`]/;

    it("static: referrals page has no direct database query and no shared Supabase import", () => {
      const src = readSource(REFERRALS_PAGE);
      assert.ok(!sharedImport.test(src), "no @/lib/supabase import");
      assert.ok(!directQuery.test(src), "no .from/.rpc/.channel database calls");
      assert.ok(!/\bsupabase\b/.test(src), "no remaining supabase client reference");
    });

    it("static: referrals page loads slips from the guarded list API with the 200 bound", () => {
      const src = readSource(REFERRALS_PAGE);
      assert.ok(src.includes('fetch("/api/admin/referral-slips/list?limit=200"'));
      assert.ok(src.includes('setError("Unable to load referral slips")'));
    });

    it("static: referrals page keeps the J1 guarded applicant lookup and display mapping", () => {
      const src = readSource(REFERRALS_PAGE);
      assert.ok(src.includes('fetch("/api/admin/referral-slips/applicants"'));
      assert.ok(src.includes("if (applicantIds.length > 0)"));
      assert.ok(src.includes('{ name: "Unknown", email: "" }'));
      assert.ok(src.includes('slip.jobs?.position_title || "Unknown Job"'));
      assert.ok(src.includes('slip.jobs?.employers?.establishment_name || "Unknown Employer"'));
    });

    it("static: reports page had only an unused shared import, now removed; its guarded API calls remain", () => {
      const src = readSource(REPORTS_PAGE);
      assert.ok(!sharedImport.test(src), "no @/lib/supabase import");
      assert.ok(!directQuery.test(src), "no direct database calls");
      assert.ok(!/\bsupabase\b/.test(src), "no remaining supabase client reference");
      for (const endpoint of [
        "/api/admin/analytics",
        "/api/admin/analytics/placement-stats",
        "/api/admin/analytics/referral-slips?months=6",
        "/api/admin/analytics/employer-hiring-rate",
        "/api/admin/analytics/referrals",
        "/api/admin/analytics/audit-feed?limit=8",
      ]) {
        assert.ok(src.includes(`fetch("${endpoint}"`), `reports functionality retained: ${endpoint}`);
      }
    });
  });
});
