// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13Z-F (planned as 13Z-E) — Authorization
// Boundary and SRS Failure Handling:
// 1. Roles resolve only from exactly one active role-profile row; user_metadata
//    never grants a role; lookup errors and conflicts fail closed.
// 2. The test-only mock session cannot be returned outside NODE_ENV=test.
// 3. api-handler rejects missing/unknown roles instead of defaulting.
// 4. SRS PATCH reports missing employers, failed writes, and partial progress honestly.

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

const USER_ID = "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
const EMPLOYER_ID = "5d2c9e14-7a3b-4f1e-8c6d-2e9f1a0b3c4d";
const USER_EMAIL = "synthetic.user@example.test";

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Result = { data: unknown; error: unknown };
type Responder = (call: Call) => Result;

const hasOp = (call: Call, name: string) => call.ops.some(([op]) => op === name);
const opArg = (call: Call, name: string) => call.ops.find(([op]) => op === name)?.[1][0];

/** Synthetic verified Auth user, shaped like supabase.auth.getUser().data.user. */
function verifiedUser(metadata: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: USER_EMAIL,
    app_metadata: {},
    user_metadata: metadata,
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
  } as any;
}

describe("Task 13Z-F — Authorization boundary and SRS failure handling", () => {
  let supabaseAdmin: any;
  let authMod: any;
  let createApiHandler: any;
  let NextRequestCtor: any;
  let srsPATCH: (req: any, ctx: any) => Promise<Response>;
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;
  let calls: Call[];
  let fetchCalls: number;
  let logs: string[];

  function installFakeDb(responders: Record<string, Responder>) {
    supabaseAdmin.from = (table: string) => {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const resolve = () =>
        new Promise<Result>((res, rej) => {
          try {
            res(responders[table]?.(call) ?? { data: null, error: null });
          } catch (e) {
            rej(e);
          }
        });
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

  /** Profile-table responders: map of table -> row (or error/throw). */
  function profiles(rows: Partial<Record<"admins" | "employers" | "jobseekers", Result | "throw">>) {
    const out: Record<string, Responder> = {};
    for (const table of ["admins", "employers", "jobseekers"] as const) {
      const r = rows[table];
      out[table] = () => {
        if (r === "throw") throw new Error("synthetic transport failure");
        return r ?? { data: null, error: null };
      };
    }
    return out;
  }

  const row = (is_active: unknown) => ({ data: { id: USER_ID, is_active }, error: null });
  const dbError = { data: null, error: { code: "XX000", message: "synthetic failure detail" } };

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    ({ createApiHandler } = await import("@/lib/api-handler"));
    ({ NextRequest: NextRequestCtor } = await import("next/server"));
    ({ PATCH: srsPATCH } = (await import("@/api/admin/employers/[id]/srs/route")) as any);
  });

  beforeEach(() => {
    calls = [];
    fetchCalls = 0;
    logs = [];
    origFrom = supabaseAdmin.from;
    origFetch = globalThis.fetch;
    origWarn = console.warn;
    origError = console.error;
    (globalThis as any).fetch = (...args: unknown[]) => {
      fetchCalls += 1;
      throw new Error(`Unexpected network/fetch call during offline test: ${JSON.stringify(args)}`);
    };
    const capture = (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
    console.warn = capture;
    console.error = capture;
  });

  afterEach(() => {
    authMod.__setMockAuthSession(undefined);
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
    console.warn = origWarn;
    console.error = origError;
    process.env.NODE_ENV = "test";
  });

  describe("1. Profile-based role resolution (real resolver, mocked tables)", () => {
    it("forged metadata admin + jobseeker profile resolves only to jobseeker", async () => {
      installFakeDb(profiles({ jobseekers: row(true) }));
      const session = await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "admin", name: "Synthetic" }));
      assert.equal(session?.user.role, "jobseeker");
      assert.equal(session?.user.id, USER_ID);
      // Public session shape preserved
      assert.deepEqual(Object.keys(session.user).sort(), ["email", "id", "image", "name", "role"]);
      assert.equal(typeof session.expires, "string");
    });

    it("forged metadata admin + no profile is denied", async () => {
      installFakeDb(profiles({}));
      assert.equal(await authMod.buildSessionForVerifiedUser(verifiedUser({ role: "admin" })), null);
    });

    it("active admin profile resolves to admin, querying id and is_active by verified id", async () => {
      installFakeDb(profiles({ admins: row(true) }));
      assert.equal(await authMod.resolveProfileRole(USER_ID), "admin");
      const tables = calls.map((c) => c.table).sort();
      assert.deepEqual(tables, ["admins", "employers", "jobseekers"]);
      for (const c of calls) {
        assert.equal(opArg(c, "select"), "id, is_active");
        assert.deepEqual(c.ops.find(([op]) => op === "eq")?.[1], ["id", USER_ID]);
        assert.ok(hasOp(c, "maybeSingle"), "must distinguish no-row from error via maybeSingle");
      }
    });

    for (const [label, value] of [["false", false], ["null", null], ["missing", undefined]] as const) {
      it(`admin profile with ${label} activation is denied`, async () => {
        const data: Record<string, unknown> = { id: USER_ID };
        if (value !== undefined) data.is_active = value;
        installFakeDb(profiles({ admins: { data, error: null } }));
        assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      });
    }

    for (const table of ["admins", "employers", "jobseekers"] as const) {
      it(`a ${table} lookup error fails closed even when another profile is active`, async () => {
        const other = table === "jobseekers" ? "admins" : "jobseekers";
        installFakeDb(profiles({ [other]: row(true), [table]: dbError }));
        assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      });

      it(`a thrown ${table} lookup fails closed`, async () => {
        const other = table === "jobseekers" ? "admins" : "jobseekers";
        installFakeDb(profiles({ [other]: row(true), [table]: "throw" }));
        assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      });
    }

    it("multiple profile rows are denied, including an inactive row in another table", async () => {
      installFakeDb(profiles({ admins: row(true), employers: row(true) }));
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
      installFakeDb(profiles({ admins: row(true), jobseekers: row(false) }));
      assert.equal(await authMod.resolveProfileRole(USER_ID), null);
    });

    it("empty user id is denied without any lookup", async () => {
      installFakeDb(profiles({ admins: row(true) }));
      assert.equal(await authMod.resolveProfileRole(""), null);
      assert.equal(calls.length, 0);
    });

    it("diagnostics contain no identifiers or raw database error details", async () => {
      installFakeDb(profiles({ admins: dbError }));
      await authMod.resolveProfileRole(USER_ID);
      installFakeDb(profiles({ admins: row(true), employers: row(true) }));
      await authMod.resolveProfileRole(USER_ID);
      installFakeDb(profiles({ employers: "throw" }));
      await authMod.resolveProfileRole(USER_ID);
      assert.ok(logs.length >= 3, "denials should be logged");
      for (const line of logs) {
        assert.ok(!line.includes(USER_ID), "log must not include user id");
        assert.ok(!line.includes(USER_EMAIL), "log must not include email");
        assert.ok(!line.includes("synthetic failure detail"), "log must not include raw DB error");
        assert.ok(!line.includes("synthetic transport failure"), "log must not include thrown error detail");
      }
    });
  });

  describe("2. Test-session bypass is test-only", () => {
    it("with NODE_ENV=production, auth() does not return a supplied mock session (runtime check)", async () => {
      installFakeDb(profiles({ admins: row(true) }));
      authMod.__setMockAuthSession({ user: { id: USER_ID, role: "admin" } });
      process.env.NODE_ENV = "production";
      // Outside a Next request scope, the real path cannot read cookies and must yield null.
      const session = await authMod.auth();
      assert.equal(session, null);
      assert.equal(fetchCalls, 0, "no network call may occur");
    });

    it("with NODE_ENV=test, the mock session is honored (confirms the guard is the deciding factor)", async () => {
      const mock = { user: { id: USER_ID, role: "admin" } };
      authMod.__setMockAuthSession(mock);
      assert.equal(await authMod.auth(), mock);
    });
  });

  describe("3. api-handler rejects missing/unknown roles", () => {
    const run = async () => {
      let handlerCalls = 0;
      let seenRole: unknown;
      const handler = createApiHandler(
        async (ctx: any) => {
          handlerCalls += 1;
          seenRole = ctx.user?.role;
          const { NextResponse } = await import("next/server");
          return NextResponse.json({ ok: true });
        },
        { requireAuth: true, enableRateLimit: false, logRequest: false, logResponse: false }
      );
      const res: Response = await handler(new NextRequestCtor("http://localhost/api/synthetic"));
      return { res, handlerCalls, seenRole };
    };

    for (const role of [undefined, "", "superuser", "Admin", 1]) {
      it(`role ${JSON.stringify(role)} is rejected with 401 and the handler never runs`, async () => {
        authMod.__setMockAuthSession({ user: { id: USER_ID, role } });
        const { res, handlerCalls } = await run();
        assert.equal(res.status, 401);
        assert.equal(handlerCalls, 0);
      });
    }

    it("a session without an id is rejected", async () => {
      authMod.__setMockAuthSession({ user: { role: "admin" } });
      const { res, handlerCalls } = await run();
      assert.equal(res.status, 401);
      assert.equal(handlerCalls, 0);
    });

    it("a known role passes through unchanged", async () => {
      authMod.__setMockAuthSession({ user: { id: USER_ID, role: "employer" } });
      const { res, seenRole } = await run();
      assert.equal(res.status, 200);
      assert.equal(seenRole, "employer");
    });
  });

  describe("4. SRS PATCH failure handling", () => {
    const ctx = { params: Promise.resolve({ id: EMPLOYER_ID }) };
    const patch = (body: unknown) =>
      srsPATCH(
        new Request(`http://localhost/api/admin/employers/${EMPLOYER_ID}/srs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        ctx
      );

    /** Resolve a real admin session through the profile resolver, then install it as the request session. */
    async function signInResolvedAdmin() {
      installFakeDb(profiles({ admins: row(true) }));
      const session = await authMod.buildSessionForVerifiedUser(verifiedUser({ name: "Synthetic Admin" }));
      assert.equal(session?.user.role, "admin");
      authMod.__setMockAuthSession(session);
      calls = [];
    }

    type Plan = {
      lookup?: Result;
      update?: Result;
      jobs?: Result;
      history?: Result;
      notifications?: Result | "throw";
    };

    function installSrsDb(plan: Plan) {
      installFakeDb({
        employers: (call) => {
          if (hasOp(call, "update")) return plan.update ?? { data: [{ id: EMPLOYER_ID }], error: null };
          if (opArg(call, "select") === "id") return plan.lookup ?? { data: { id: EMPLOYER_ID }, error: null };
          // Contact lookup for the notification email fallback: no row, so no email is attempted
          return { data: null, error: null };
        },
        jobs: () => plan.jobs ?? { data: null, error: null },
        srs_approval_history: () => plan.history ?? { data: null, error: null },
        notifications: () => {
          if (plan.notifications === "throw") throw new Error("synthetic notification failure");
          return plan.notifications ?? { data: { id: "n-1" }, error: null };
        },
      });
    }

    const writes = () =>
      calls.filter((c) => hasOp(c, "update") || hasOp(c, "insert")).map((c) => c.table);

    it("missing employer -> 404 and no writes", async () => {
      await signInResolvedAdmin();
      installSrsDb({ lookup: { data: null, error: null } });
      const res = await patch({ action: "approve" });
      assert.equal(res.status, 404);
      assert.deepEqual(writes(), []);
    });

    it("employer lookup error -> 500 generic message and no writes", async () => {
      await signInResolvedAdmin();
      installSrsDb({ lookup: dbError });
      const res = await patch({ action: "approve" });
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.equal(body.error, "Failed to load employer");
      assert.ok(!JSON.stringify(body).includes("synthetic failure detail"));
      assert.deepEqual(writes(), []);
    });

    for (const [label, update] of [
      ["update error", dbError],
      ["no affected row", { data: [], error: null }],
    ] as const) {
      it(`${label} -> 500 statusUpdated:false and no later writes`, async () => {
        await signInResolvedAdmin();
        installSrsDb({ update });
        const res = await patch({ action: "reject", rejectionReason: "Missing permit" });
        assert.equal(res.status, 500);
        assert.deepEqual(await res.json(), { error: "SRS status was not updated", statusUpdated: false });
        assert.deepEqual(writes(), ["employers"]);
        assert.ok(!calls.some((c) => ["jobs", "srs_approval_history", "notifications"].includes(c.table)));
      });
    }

    it("job-pause failure -> accurate partial-progress response", async () => {
      await signInResolvedAdmin();
      installSrsDb({ jobs: dbError });
      const res = await patch({ action: "reject", rejectionReason: "Missing permit" });
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), {
        error: "SRS status was updated, but active job postings could not be paused",
        statusUpdated: true,
        jobsPaused: false,
        historyRecorded: true,
      });
    });

    it("history failure -> accurate partial-progress response (approve, no jobsPaused flag)", async () => {
      await signInResolvedAdmin();
      installSrsDb({ history: { data: null, error: { code: "23503", message: "fk detail" } } });
      const res = await patch({ action: "approve" });
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.deepEqual(body, {
        error: "SRS status was updated, but the approval history was not recorded",
        statusUpdated: true,
        historyRecorded: false,
      });
      assert.ok(!JSON.stringify(body).includes("fk detail"));
    });

    it("history failure on reject reports both flags", async () => {
      await signInResolvedAdmin();
      installSrsDb({ history: dbError });
      const res = await patch({ action: "reject", rejectionReason: "Missing permit" });
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.equal(body.statusUpdated, true);
      assert.equal(body.jobsPaused, true);
      assert.equal(body.historyRecorded, false);
    });

    it("valid zero-job pause is not treated as failure", async () => {
      await signInResolvedAdmin();
      installSrsDb({ jobs: { data: [], error: null } });
      const res = await patch({ action: "reject", rejectionReason: "Missing permit" });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { success: true, action: "reject" });
    });

    it("notification failure remains non-fatal", async () => {
      await signInResolvedAdmin();
      installSrsDb({ notifications: "throw" });
      const res = await patch({ action: "approve" });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { success: true, action: "approve" });
    });

    it("successful history row uses the resolved admin id", async () => {
      await signInResolvedAdmin();
      installSrsDb({});
      const res = await patch({ action: "approve", adminNote: "internal" });
      assert.equal(res.status, 200);
      const insert = calls.find((c) => c.table === "srs_approval_history")!;
      const payload = opArg(insert, "insert") as Record<string, unknown>;
      assert.equal(payload.admin_id, USER_ID);
      assert.equal(payload.admin_name, "Synthetic Admin");
      assert.deepEqual(
        Object.keys(payload).sort(),
        ["action", "admin_id", "admin_name", "admin_note", "created_at", "employer_id", "reason"]
      );
      const update = calls.find((c) => c.table === "employers" && hasOp(c, "update"))!;
      assert.equal(opArg(update, "select"), "id", "update must select the affected id");
    });
  });
});
