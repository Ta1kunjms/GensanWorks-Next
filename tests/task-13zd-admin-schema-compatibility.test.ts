// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13Z-D — Administrative Route Compatibility:
// 1. Access-request status route no longer queries the excluded public.users
//    table and handles the unresolved recipient explicitly (no notification).
// 2. Employer SRS route selects canonical employer columns, builds documents
//    from employer document URL columns (no employer_documents query), and
//    keeps srs_approval_history writes schema-compatible.
// 3. Unauthorized access to both routes remains denied before any DB access.

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const ACCESS_ROUTE = "app/api/admin/access-requests/[id]/status/route.ts";
const SRS_ROUTE = "app/api/admin/employers/[id]/srs/route.ts";
const DRAFT_SQL = "docs/schema/generated/core-a-canonical-baseline-v1.sql";

const ADMIN_ID = "0b6f7a52-1c1e-4d8e-9b0a-6a3f2d1c4e5f";
const EMPLOYER_ID = "5d2c9e14-7a3b-4f1e-8c6d-2e9f1a0b3c4d";
const REQUEST_ID = "9e8d7c6b-5a49-4382-a716-1f0e2d3c4b5a";

// Live production columns (schema snapshot read 2026-10-21). The draft baseline
// still lists srs_status/srs_approval_history, which the live database lacks.
const LIVE_EMPLOYER_COLUMNS = new Set(
  ("id, email, password_hash, establishment_name, province, city, barangay, address, total_paid_employees, " +
    "total_vacant_positions, industry, industry_code, contact_person, contact_phone, designation, company_tax_id, " +
    "geographic_code, barangay_chairperson, barangay_secretary, srs_subscriber_intent, srs_prepared_by, " +
    "srs_prepared_designation, srs_prepared_date, srs_prepared_contact, srs_form_file, business_permit_file, " +
    "bir_2303_file, company_profile_file, dole_certification_file, profile_image, account_status, verified_at, " +
    "is_active, last_login, created_at, updated_at, consent_given_at, consent_privacy_notice_version")
    .split(",")
    .map((s) => s.trim())
);
const LIVE_AUDIT_COLUMNS = new Set(
  "id, user_id, role, action, resource_type, resource_id, payload, ip_address, user_agent, created_at".split(", ")
);

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Responder = (call: Call) => { data: unknown; error: unknown };

/** Column names declared in a CREATE TABLE block of the draft baseline (read-only parse). */
function draftColumns(table: string): Set<string> {
  const sql = readSource(DRAFT_SQL);
  const block = sql.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(block, `draft baseline must define ${table}`);
  const cols = new Set<string>();
  for (const line of block[1].split("\n")) {
    const m = line.trim().match(/^([a-z_][a-z0-9_]*)\s+[A-Z]/);
    if (m && !["CONSTRAINT", "PRIMARY", "UNIQUE", "CHECK", "FOREIGN"].includes(m[1].toUpperCase())) {
      cols.add(m[1]);
    }
  }
  return cols;
}

function selectArg(call: Call): string {
  const op = call.ops.find(([name]) => name === "select");
  return String(op?.[1][0] ?? "");
}

describe("Task 13Z-D — Administrative Route Compatibility", () => {
  let supabaseAdmin: any;
  let setSession: (s: unknown) => void;
  let accessPATCH: (req: Request, ctx: any) => Promise<Response>;
  let srsGET: (req: any, ctx: any) => Promise<Response>;
  let srsPATCH: (req: any, ctx: any) => Promise<Response>;
  let origFrom: unknown;
  let origFetch: typeof globalThis.fetch;
  let calls: Call[];

  function installFakeDb(responders: Record<string, Responder>) {
    supabaseAdmin.from = (table: string) => {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const resolve = () => responders[table]?.(call) ?? { data: null, error: null };
      const builder: any = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (onF: any, onR: any) => Promise.resolve(resolve()).then(onF, onR);
            }
            if (prop === "single" || prop === "maybeSingle") {
              return () => {
                call.ops.push([prop, []]);
                return Promise.resolve(resolve());
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

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    ({ __setMockAuthSession: setSession } = (await import("@/lib/auth")) as any);
    ({ PATCH: accessPATCH } = (await import("@/api/admin/access-requests/[id]/status/route")) as any);
    ({ GET: srsGET, PATCH: srsPATCH } = (await import("@/api/admin/employers/[id]/srs/route")) as any);
  });

  beforeEach(() => {
    calls = [];
    origFrom = supabaseAdmin.from;
    origFetch = globalThis.fetch;
    (globalThis as any).fetch = (...args: unknown[]) => {
      throw new Error(`Unexpected network/fetch call during offline test: ${JSON.stringify(args)}`);
    };
  });

  afterEach(() => {
    setSession(undefined);
    supabaseAdmin.from = origFrom;
    globalThis.fetch = origFetch;
  });

  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const jsonReq = (url: string, method: string, body: unknown) =>
    new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  describe("A. Access-request status route", () => {
    it("source has no public.users lookup and no notification recipient guess", () => {
      const src = readSource(ACCESS_ROUTE);
      assert.ok(!/\.from\(\s*["'`]users["'`]\s*\)/.test(src), "must not query public.users");
      assert.ok(!src.includes("tryCreateNotification"), "must not send a notification to an unresolved recipient");
      assert.ok(!src.includes("findAccountByEmail"), "must not resolve a recipient by email across role tables");
    });

    it("denies unauthenticated and non-admin sessions before any DB access", async () => {
      installFakeDb({});
      for (const session of [null, { user: { id: ADMIN_ID, role: "jobseeker" } }, { user: { id: ADMIN_ID, role: "employer" } }]) {
        setSession(session);
        const res = await accessPATCH(
          jsonReq(`http://localhost/api/admin/access-requests/${REQUEST_ID}/status`, "PATCH", { status: "approved" }),
          ctx(REQUEST_ID)
        );
        assert.equal(res.status, 401);
      }
      assert.equal(calls.length, 0);
    });

    it("updates the request, preserves the response contract, and touches no users/notifications table", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({
        admin_access_requests: (call) =>
          call.ops.some(([op]) => op === "update")
            ? { data: { id: REQUEST_ID, status: "approved", reviewed_at: "2026-10-06T00:00:00.000Z" }, error: null }
            : { data: { id: REQUEST_ID, email: "requester@example.test" }, error: null },
      });

      const res = await accessPATCH(
        jsonReq(`http://localhost/api/admin/access-requests/${REQUEST_ID}/status`, "PATCH", { status: "approved" }),
        ctx(REQUEST_ID)
      );
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.message, "Access request updated");
      assert.deepEqual(body.request, { id: REQUEST_ID, status: "approved", reviewed_at: "2026-10-06T00:00:00.000Z" });
      assert.equal(typeof body.requestId, "string");

      // The admin's note goes to audit_logs; no users or notifications table is touched.
      assert.deepEqual([...new Set(calls.map((c) => c.table))].sort(), ["admin_access_requests", "audit_logs"]);
      const update = calls.find((c) => c.ops.some(([op]) => op === "update"));
      const payload = update!.ops.find(([op]) => op === "update")![1][0] as Record<string, unknown>;
      // Live admin_access_requests has no notes column (2026-10-21 scan).
      assert.deepEqual(Object.keys(payload).sort(), ["reviewed_at", "reviewed_by", "status", "updated_at"]);
      assert.equal(payload.reviewed_by, ADMIN_ID);
    });

    it("returns 404 for an unknown request without updating", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({ admin_access_requests: () => ({ data: null, error: { code: "PGRST116" } }) });
      const res = await accessPATCH(
        jsonReq(`http://localhost/api/admin/access-requests/${REQUEST_ID}/status`, "PATCH", { status: "rejected" }),
        ctx(REQUEST_ID)
      );
      assert.equal(res.status, 404);
      assert.ok(!calls.some((c) => c.ops.some(([op]) => op === "update")));
    });
  });

  describe("B. Employer SRS route", () => {
    const employerRow = (overrides: Record<string, unknown> = {}) => ({
      id: EMPLOYER_ID,
      establishment_name: "Sample Establishment",
      email: "employer@example.test",
      contact_person: "Contact Person",
      contact_phone: "09000000000",
      address: "Sample Address",
      city: "General Santos City",
      industry: "Retail",
      total_paid_employees: 12,
      account_status: "pending",
      verified_at: null,
      created_at: "2026-10-01T00:00:00.000Z",
      srs_form_file: "https://storage.example.test/srs.pdf",
      business_permit_file: null,
      bir_2303_file: "https://storage.example.test/bir.pdf",
      company_profile_file: "",
      dole_certification_file: null,
      ...overrides,
    });

    // Review history is read from audit_logs (srs_approval_history is not in the live schema).
    const historyRows = [
      {
        id: "h-1",
        user_id: ADMIN_ID,
        action: "employer_reject",
        payload: { action: "reject", reason: "Missing permit" },
        created_at: "2026-10-02T00:00:00.000Z",
      },
    ];
    const historyDb = {
      audit_logs: () => ({ data: historyRows, error: null }),
      admins: () => ({ data: [{ id: ADMIN_ID, name: "Admin One" }], error: null }),
    };

    it("draft baseline has no employer_documents or users table, and has the canonical employer columns", () => {
      const sql = readSource(DRAFT_SQL);
      assert.ok(!/CREATE TABLE (public\.)?employer_documents\b/.test(sql));
      assert.ok(!/CREATE TABLE (public\.)?users\b/.test(sql));
      const cols = draftColumns("employers");
      for (const c of ["industry", "total_paid_employees", "srs_form_file", "business_permit_file", "bir_2303_file", "company_profile_file", "dole_certification_file"]) {
        assert.ok(cols.has(c), `employers.${c} must exist in draft`);
      }
      assert.ok(!cols.has("business_type") && !cols.has("employee_count"));
    });

    it("GET denies unauthenticated and non-admin sessions before any DB access", async () => {
      installFakeDb({});
      for (const session of [null, { user: { role: "admin" } }, { user: { id: EMPLOYER_ID, role: "employer" } }]) {
        setSession(session);
        const res = await srsGET({} as any, ctx(EMPLOYER_ID));
        assert.equal(res.status, 401);
      }
      assert.equal(calls.length, 0);
    });

    it("GET selects only draft-schema employer columns and does not query employer_documents", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({
        employers: () => ({ data: employerRow(), error: null }),
        ...historyDb,
      });

      const res = await srsGET({} as any, ctx(EMPLOYER_ID));
      assert.equal(res.status, 200);

      assert.ok(!calls.some((c) => c.table === "employer_documents"), "must not query employer_documents");
      assert.ok(!calls.some((c) => c.table === "srs_approval_history"), "must not query srs_approval_history");
      const employerCols = selectArg(calls.find((c) => c.table === "employers")!)
        .split(",")
        .map((s) => s.trim());
      for (const col of employerCols) assert.ok(LIVE_EMPLOYER_COLUMNS.has(col), `selected column ${col} must exist in live employers`);
      assert.ok(employerCols.includes("industry") && employerCols.includes("total_paid_employees"));
      assert.ok(!employerCols.some((c) => c.startsWith("srs_status") || c === "srs_version"));

      const historyCols = selectArg(calls.find((c) => c.table === "audit_logs")!).split(",").map((s) => s.trim());
      for (const col of historyCols) assert.ok(LIVE_AUDIT_COLUMNS.has(col), `history column ${col} must exist in live audit_logs`);
    });

    it("GET maps canonical fields and populated documents to the consumer shape", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({
        employers: () => ({ data: employerRow(), error: null }),
        ...historyDb,
      });

      const { profile, history } = await (await srsGET({} as any, ctx(EMPLOYER_ID))).json();
      assert.equal(profile.businessType, "Retail");
      assert.equal(profile.employeeCount, 12);
      assert.equal(profile.srsStatus, "pending");
      assert.equal(profile.srsSubmittedAt, "2026-10-01T00:00:00.000Z");
      // Only populated fields, explicit labels, consumer shape {name, url, type}, no fabricated ids
      assert.deepEqual(profile.documents, [
        { name: "SRS Form", url: "https://storage.example.test/srs.pdf", type: "srs_form" },
        { name: "BIR 2303", url: "https://storage.example.test/bir.pdf", type: "bir_2303" },
      ]);
      assert.deepEqual(history, [
        { id: "h-1", action: "reject", reason: "Missing permit", adminName: "Admin One", createdAt: "2026-10-02T00:00:00.000Z" },
      ]);
    });

    it("GET returns an empty document list and no invented defaults when optional fields are missing", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({
        employers: () => ({
          data: employerRow({
            industry: null,
            total_paid_employees: null,
            srs_form_file: null,
            bir_2303_file: "   ",
          }),
          error: null,
        }),
        audit_logs: () => ({ data: null, error: null }),
      });

      const { profile, history } = await (await srsGET({} as any, ctx(EMPLOYER_ID))).json();
      assert.deepEqual(profile.documents, []);
      assert.equal(profile.businessType, null);
      assert.equal(profile.employeeCount, null);
      assert.deepEqual(history, []);
    });

    it("GET returns 404 when the employer is not found", async () => {
      setSession({ user: { id: ADMIN_ID, role: "admin" } });
      installFakeDb({ employers: () => ({ data: null, error: null }) });
      const res = await srsGET({} as any, ctx(EMPLOYER_ID));
      assert.equal(res.status, 404);
    });

    it("PATCH denies unauthenticated and non-admin sessions before any DB access", async () => {
      installFakeDb({});
      for (const session of [null, { user: { id: EMPLOYER_ID, role: "employer" } }]) {
        setSession(session);
        const res = await srsPATCH(jsonReq(`http://localhost/api/admin/employers/${EMPLOYER_ID}/srs`, "PATCH", { action: "approve" }), ctx(EMPLOYER_ID));
        assert.equal(res.status, 401);
      }
      assert.equal(calls.length, 0);
    });

    for (const action of ["approve", "reject"] as const) {
      it(`PATCH ${action} records the review in audit_logs using live columns`, async () => {
        setSession({ user: { id: ADMIN_ID, role: "admin", name: "Admin One" } });
        installFakeDb({
          employers: (call) => {
            const ops = call.ops.map(([op]) => op);
            // Status update confirms the affected row by selecting its id
            if (ops.includes("update")) return { data: [{ id: EMPLOYER_ID }], error: null };
            // Existence check before any write
            if (selectArg(call) === "id, account_status") return { data: { id: EMPLOYER_ID, account_status: "pending" }, error: null };
            // Employer contact lookup for the email fallback returns no row, so no email is attempted
            return { data: null, error: null };
          },
          // Job pause completes without error; reached only on reject
          jobs: () => ({ data: null, error: null }),
          audit_logs: () => ({ data: null, error: null }),
          notifications: () => ({ data: { id: "n-1" }, error: null }),
        });

        const res = await srsPATCH(
          jsonReq(`http://localhost/api/admin/employers/${EMPLOYER_ID}/srs`, "PATCH", {
            action,
            rejectionReason: action === "reject" ? "Missing permit" : undefined,
            adminNote: "internal",
          }),
          ctx(EMPLOYER_ID)
        );
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { success: true, action });

        const insert = calls.find((c) => c.table === "audit_logs")!.ops.find(([op]) => op === "insert")!;
        const row = insert[1][0] as Record<string, unknown>;
        for (const key of Object.keys(row)) assert.ok(LIVE_AUDIT_COLUMNS.has(key), `history insert key ${key} must exist in live audit_logs`);
        assert.equal(row.action, action === "approve" ? "employer_approve" : "employer_reject");
        assert.equal(row.resource_id, EMPLOYER_ID);
        assert.equal(row.user_id, ADMIN_ID);
        assert.equal((row.payload as Record<string, unknown>).reason, action === "reject" ? "Missing permit" : null);

        const employerUpdate = calls.find((c) => c.table === "employers" && c.ops.some(([op]) => op === "update"))!;
        const payload = employerUpdate.ops.find(([op]) => op === "update")![1][0] as Record<string, unknown>;
        for (const key of Object.keys(payload)) assert.ok(LIVE_EMPLOYER_COLUMNS.has(key), `update key ${key} must exist in live employers`);
        assert.equal(payload.account_status, action === "approve" ? "approved" : "rejected");
        assert.equal(calls.some((c) => c.table === "jobs"), action === "reject", "jobs are paused only on reject");
      });
    }
  });
});
