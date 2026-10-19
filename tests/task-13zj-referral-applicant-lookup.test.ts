// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13Z-J1 — guarded applicant lookup for the
// admin referrals page:
// A. Behavioral route tests for POST /api/admin/referral-slips/applicants, with
//    sessions resolved through the real profile-role resolver against mocked tables.
// B. STATIC SOURCE CHECKS of app/admin/referrals/page.tsx (a client component;
//    no DOM test tooling is available offline). These inspect source text only.

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const PAGE = "app/admin/referrals/page.tsx";

const ADMIN_ID = "0b6f7a52-1c1e-4d8e-9b0a-6a3f2d1c4e5f";
const OTHER_ID = "5d2c9e14-7a3b-4f1e-8c6d-2e9f1a0b3c4d";
const APPLICANT_A = "3f2b8c1e-9d4a-4e6b-8a1c-2b3d4e5f6a7b";
const APPLICANT_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const SYNTHETIC_EMAIL = "applicant.a@example.test";

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Result = { data: unknown; error: unknown };
type Responder = (call: Call) => Result;

const opArgs = (call: Call, name: string) => call.ops.find(([op]) => op === name)?.[1];

/** Valid v4-shaped synthetic UUIDs. */
function syntheticIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`);
}

describe("Task 13Z-J1 — Guarded applicant lookup for admin referrals", () => {
  let supabaseAdmin: any;
  let authMod: any;
  let lookupPOST: (req: Request) => Promise<Response>;
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

  function applicantTable(result: Result) {
    installFakeDb({ jobseekers: () => result });
  }

  const post = (body: unknown, raw = false) =>
    lookupPOST(
      new Request("http://localhost/api/admin/referral-slips/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: raw ? (body as string) : JSON.stringify(body),
      })
    );

  const applicantQueries = () => calls.filter((c) => c.table === "jobseekers");

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    ({ POST: lookupPOST } = (await import("@/api/admin/referral-slips/applicants/route")) as any);
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

  describe("A. Route behavior", () => {
    it("logged-out request is denied before any applicant query", async () => {
      authMod.__setMockAuthSession(null);
      applicantTable({ data: [], error: null });
      const res = await post({ ids: [APPLICANT_A] });
      assert.equal(res.status, 401);
      assert.equal(applicantQueries().length, 0);
    });

    for (const table of ["employers", "jobseekers"] as const) {
      it(`verified ${table.slice(0, -1)} with forged admin metadata is denied before any applicant query`, async () => {
        const session = await signInAs(table, OTHER_ID);
        assert.notEqual(session?.user.role, "admin");
        applicantTable({ data: [], error: null });
        const res = await post({ ids: [APPLICANT_A] });
        assert.equal(res.status, 401);
        assert.equal(applicantQueries().length, 0);
      });
    }

    it("administrator receives minimal summaries; only id/name/email columns are selected", async () => {
      await signInAs("admins", ADMIN_ID);
      applicantTable({
        data: [{ id: APPLICANT_A, first_name: "Ana", last_name: "Reyes", email: SYNTHETIC_EMAIL }],
        error: null,
      });

      const res = await post({ ids: [APPLICANT_A] });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.applicants, [
        { id: APPLICANT_A, first_name: "Ana", last_name: "Reyes", email: SYNTHETIC_EMAIL },
      ]);

      const queries = applicantQueries();
      assert.equal(queries.length, 1);
      assert.equal(opArgs(queries[0], "select")?.[0], "id, first_name, last_name, email");
      assert.deepEqual(opArgs(queries[0], "in"), ["id", [APPLICANT_A]]);
    });

    it("duplicate ids (including case variants) are deduplicated before the query", async () => {
      await signInAs("admins", ADMIN_ID);
      applicantTable({ data: [], error: null });
      const res = await post({ ids: [APPLICANT_A, APPLICANT_B, APPLICANT_A, APPLICANT_A.toUpperCase()] });
      assert.equal(res.status, 200);
      assert.deepEqual(opArgs(applicantQueries()[0], "in"), ["id", [APPLICANT_A, APPLICANT_B]]);
    });

    it("exactly 200 ids are accepted", async () => {
      await signInAs("admins", ADMIN_ID);
      applicantTable({ data: [], error: null });
      const res = await post({ ids: syntheticIds(200) });
      assert.equal(res.status, 200);
      assert.equal((opArgs(applicantQueries()[0], "in")?.[1] as string[]).length, 200);
    });

    const invalidBodies: Array<[string, unknown, boolean?]> = [
      ["empty id list", { ids: [] }],
      ["more than 200 ids", { ids: syntheticIds(201) }],
      ["non-UUID id", { ids: [APPLICANT_A, "NSRP-2026-000123"] }],
      ["SQL-like id", { ids: ["1 OR 1=1"] }],
      ["non-string id", { ids: [123] }],
      ["ids not an array", { ids: APPLICANT_A }],
      ["missing ids", {}],
      ["unexpected extra field", { ids: [APPLICANT_A], select: "*" }],
      ["malformed JSON", "{not json", true],
    ];
    for (const [label, body, raw] of invalidBodies) {
      it(`rejects ${label} with 400 and no applicant query`, async () => {
        await signInAs("admins", ADMIN_ID);
        applicantTable({ data: [], error: null });
        const res = await post(body, raw);
        assert.equal(res.status, 400);
        assert.equal((await res.json()).error, "Invalid payload");
        assert.equal(applicantQueries().length, 0);
      });
    }

    it("database failure returns a generic 500 without raw error, ids, or emails in response or logs", async () => {
      await signInAs("admins", ADMIN_ID);
      applicantTable({ data: null, error: { code: "XX000", message: "synthetic db failure detail" } });
      const res = await post({ ids: [APPLICANT_A] });
      assert.equal(res.status, 500);
      const text = JSON.stringify(await res.json());
      assert.ok(text.includes("Unable to load applicants"));
      assert.ok(!text.includes("synthetic db failure detail"));
      assert.ok(logs.length > 0, "failure should be logged");
      for (const line of logs) {
        assert.ok(!line.includes("synthetic db failure detail"));
        assert.ok(!line.includes(APPLICANT_A));
        assert.ok(!line.includes(SYNTHETIC_EMAIL));
      }
    });
  });

  describe("B. Page — STATIC SOURCE CHECKS (not a rendered page test)", () => {
    const page = () => readFileSync(path.join(repoRoot, PAGE), "utf8");

    it("static: page no longer queries jobseekers directly from the browser", () => {
      assert.ok(!/\.from\(\s*["'`]jobseekers["'`]\s*\)/.test(page()));
    });

    it("static: page requests applicant summaries from the guarded admin API via POST", () => {
      const src = page();
      assert.ok(src.includes('fetch("/api/admin/referral-slips/applicants"'));
      assert.match(src, /method:\s*"POST"/);
      assert.ok(src.includes("JSON.stringify({ ids: applicantIds })"));
    });

    it("static: applicant request is skipped when there are no applicant ids", () => {
      const src = page();
      const guardIdx = src.indexOf("if (applicantIds.length > 0)");
      const fetchIdx = src.indexOf('fetch("/api/admin/referral-slips/applicants"');
      assert.ok(guardIdx > 0 && fetchIdx > guardIdx, "lookup must be inside the non-empty guard");
    });

    it("static: request failure is surfaced explicitly and display mapping is preserved", () => {
      const src = page();
      assert.ok(src.includes('setError("Unable to load applicant details")'));
      assert.ok(src.includes('`${u.first_name || ""} ${u.last_name || ""}`.trim()'));
      assert.ok(src.includes('{ name: "Unknown", email: "" }'));
    });

    it("static: page makes zero direct browser database queries (referral_slips moved behind guarded API in 13Z-J2)", () => {
      const src = page();
      const tables = Array.from(src.matchAll(/\.from\(\s*["'`]([A-Za-z0-9_.]+)["'`]\s*\)/g)).map((m) => m[1]);
      assert.deepEqual(tables, [], "no .from(<table>) query may remain in the browser page");
      assert.ok(!/\.rpc\(/.test(src), "no .rpc() call may remain in the browser page");
      assert.ok(!/\.storage\b/.test(src), "no storage access may remain in the browser page");
    });
  });
});
