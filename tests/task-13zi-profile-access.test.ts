// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13Z-I:
// A. Mocked route tests — admin employer GET requires a verified active
//    administrator (resolved through the real profile-role resolver against
//    mocked tables), never returns password_hash, and handles missing rows and
//    query errors without leaking database details.
// B. STATIC CHECKS ONLY — text inspection of the draft policy SQL. These are not
//    database security tests; nothing here executes SQL or proves enforcement.

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-key";
process.env.NODE_ENV = "test";

const repoRoot = path.resolve(__dirname, "..");
// Normalize CRLF so static checks behave the same on Windows checkouts (core.autocrlf).
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8").replace(/\r\n/g, "\n");

const POLICY_DRAFT = "docs/schema/policy-drafts/profile-access-v1.sql";
const PROMOTED_MIGRATION = "supabase/migrations/20261020130000_profile_access_v1.sql";
const BASELINE_DRAFT = "docs/schema/generated/core-a-canonical-baseline-v1.sql";
const PROFILE_TABLES = ["admins", "employers", "jobseekers"] as const;

const ADMIN_ID = "0b6f7a52-1c1e-4d8e-9b0a-6a3f2d1c4e5f";
const EMPLOYER_ID = "5d2c9e14-7a3b-4f1e-8c6d-2e9f1a0b3c4d";

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Result = { data: unknown; error: unknown };
type Responder = (call: Call) => Result;

const opArg = (call: Call, name: string) => call.ops.find(([op]) => op === name)?.[1][0];

/** Synthetic full employer row, including a credential column the route must never select. */
const FULL_EMPLOYER_ROW: Record<string, unknown> = {
  id: EMPLOYER_ID,
  email: "employer@example.test",
  password_hash: "synthetic-hash-must-not-leak",
  establishment_name: "Synthetic Establishment",
  province: "South Cotabato",
  city: "General Santos City",
  barangay: "Synthetic Barangay",
  address: "Synthetic Address",
  total_paid_employees: 12,
  total_vacant_positions: 3,
  industry: "Retail",
  industry_code: "G",
  contact_person: "Contact Person",
  contact_phone: "09000000000",
  designation: "Manager",
  company_tax_id: "000-000-000",
  srs_form_file: "https://storage.example.test/srs.pdf",
  business_permit_file: "https://storage.example.test/permit.pdf",
  bir_2303_file: null,
  company_profile_file: null,
  dole_certification_file: null,
  profile_image: null,
  account_status: "pending",
  verified_at: null,
  srs_status: "pending",
  srs_rejection_reason: null,
  srs_submitted_at: null,
  srs_approved_at: null,
  srs_version: 1,
  consent_given_at: "2026-10-01T00:00:00.000Z",
  consent_privacy_notice_version: "v0",
  is_active: true,
  last_login: null,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-02T00:00:00.000Z",
};

/** Executable SQL only: strips `--` comments so warnings in comments cannot satisfy or fail code checks. */
function sqlCode(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** Column names of a CREATE TABLE block in the Core-A baseline draft (read-only parse). */
function baselineColumns(table: string): string[] {
  const sql = readSource(BASELINE_DRAFT);
  const block = sql.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(block, `baseline draft must define ${table}`);
  const cols: string[] = [];
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\s+([a-z_][a-z0-9_]*)\s+\S/);
    if (m) cols.push(m[1]);
  }
  return cols;
}

describe("Task 13Z-I — Employer GET protection and profile-policy draft", () => {
  let supabaseAdmin: any;
  let authMod: any;
  let employerGET: (req: Request, ctx: any) => Promise<Response>;
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
  async function signInAs(table: "admins" | "employers" | "jobseekers" | null, userId: string) {
    const profileRow = { data: { id: userId, is_active: true }, error: null };
    installFakeDb({
      admins: () => (table === "admins" ? profileRow : { data: null, error: null }),
      employers: () => (table === "employers" ? profileRow : { data: null, error: null }),
      jobseekers: () => (table === "jobseekers" ? profileRow : { data: null, error: null }),
    });
    const session = await authMod.buildSessionForVerifiedUser({
      id: userId,
      email: "synthetic@example.test",
      app_metadata: {},
      user_metadata: { role: "admin", name: "Synthetic User" }, // forged metadata must not matter
      aud: "authenticated",
      created_at: "2026-10-01T00:00:00.000Z",
    } as any);
    authMod.__setMockAuthSession(session);
    calls = [];
    return session;
  }

  /** Fake employers table that honors the route's column list against the full synthetic row. */
  function employerTable(result: "found" | "missing" | "error") {
    installFakeDb({
      employers: (call) => {
        if (result === "error") return { data: null, error: { code: "XX000", message: "synthetic db failure detail" } };
        if (result === "missing") return { data: null, error: null };
        const cols = String(opArg(call, "select")).split(",").map((c) => c.trim());
        if (cols.includes("*")) return { data: { ...FULL_EMPLOYER_ROW }, error: null };
        return { data: Object.fromEntries(cols.map((c) => [c, FULL_EMPLOYER_ROW[c]])), error: null };
      },
    });
  }

  const get = (id = EMPLOYER_ID) =>
    employerGET(new Request(`http://localhost/api/admin/employers/${id}`), { params: Promise.resolve({ id }) });

  const employerDataQueries = () => calls.filter((c) => c.table === "employers");

  before(async () => {
    ({ supabaseAdmin } = await import("@/lib/supabase"));
    authMod = await import("@/lib/auth");
    ({ GET: employerGET } = (await import("@/api/admin/employers/[id]/route")) as any);
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

  describe("A. Admin employer GET (mocked route tests)", () => {
    it("logged-out request is denied before any employer query", async () => {
      authMod.__setMockAuthSession(null);
      employerTable("found");
      const res = await get();
      assert.equal(res.status, 401);
      assert.equal(employerDataQueries().length, 0);
    });

    for (const table of ["employers", "jobseekers"] as const) {
      it(`verified ${table.slice(0, -1)} (with forged admin metadata) is denied before any employer query`, async () => {
        const session = await signInAs(table, EMPLOYER_ID);
        assert.equal(session?.user.role, table === "employers" ? "employer" : "jobseeker");
        employerTable("found");
        const res = await get();
        assert.equal(res.status, 403);
        assert.equal(employerDataQueries().length, 0);
      });
    }

    it("authenticated user with no active profile is denied before any employer query", async () => {
      const session = await signInAs(null, ADMIN_ID);
      assert.equal(session, null);
      employerTable("found");
      const res = await get();
      assert.equal(res.status, 401);
      assert.equal(employerDataQueries().length, 0);
    });

    it("verified administrator receives the supported profile without password_hash", async () => {
      const session = await signInAs("admins", ADMIN_ID);
      assert.equal(session?.user.role, "admin");
      employerTable("found");

      const res = await get();
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.ok(!("password_hash" in body.profile), "password_hash must be absent");
      assert.ok(!JSON.stringify(body).includes("synthetic-hash-must-not-leak"));
      assert.equal(body.profile.id, EMPLOYER_ID);
      assert.equal(body.profile.establishment_name, "Synthetic Establishment"); // breadcrumbs consumer
      assert.equal(body.profile.total_paid_employees, 12);
      assert.equal(body.profile.business_permit_file, "https://storage.example.test/permit.pdf");

      const queries = employerDataQueries();
      assert.equal(queries.length, 1, "single query by id; no user_id fallback");
      const selected = String(opArg(queries[0], "select")).split(",").map((c) => c.trim());
      assert.ok(!selected.includes("*"), "must not select *");
      assert.ok(!selected.includes("password_hash"));
      assert.deepEqual(queries[0].ops.find(([op]) => op === "eq")?.[1], ["id", EMPLOYER_ID]);
      const baseline = new Set(baselineColumns("employers"));
      for (const col of selected) assert.ok(baseline.has(col), `selected column ${col} must exist in baseline draft`);
    });

    it("missing employer returns 404 without database details", async () => {
      await signInAs("admins", ADMIN_ID);
      employerTable("missing");
      const res = await get();
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, "Employer profile not found");
      assert.ok(!("dbError" in body));
    });

    it("query error returns 500 with a generic message and no raw error in response or logs", async () => {
      await signInAs("admins", ADMIN_ID);
      employerTable("error");
      const res = await get();
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.equal(body.error, "Unable to load employer profile");
      assert.ok(!JSON.stringify(body).includes("synthetic db failure detail"));
      for (const line of logs) assert.ok(!line.includes("synthetic db failure detail"));
    });

    it("invalid id is rejected for an administrator without a query", async () => {
      await signInAs("admins", ADMIN_ID);
      employerTable("found");
      const res = await get("undefined");
      assert.equal(res.status, 400);
      assert.equal(employerDataQueries().length, 0);
    });
  });

  describe("B. Policy draft — STATIC CHECKS ONLY (not database security tests)", () => {
    const raw = () => readSource(POLICY_DRAFT);
    const code = () => sqlCode(raw());

    // Promoted 2026-10-20 (owner-approved Batch 2) into one review-only migration.
    // The draft stays the reviewed source; the migration must be its BEGIN..COMMIT
    // body plus exactly one added grant, and no other migration may reference it.
    it("static: draft stays the source; only the promoted migration references it", () => {
      assert.ok(existsSync(path.join(repoRoot, POLICY_DRAFT)));
      const migDir = path.join(repoRoot, "supabase/migrations");
      const referencing = readdirSync(migDir).filter((f) =>
        readFileSync(path.join(migDir, f), "utf8").includes("profile_access_v1")
      );
      assert.deepEqual(referencing, [path.basename(PROMOTED_MIGRATION)]);
      assert.ok(!readSource(BASELINE_DRAFT).includes("profile_access_v1"), "baseline draft must stay separate");
    });

    it("static: promoted migration equals the draft body except reconciled column lists and the consent_given_at grant", () => {
      const body = (sql: string) => sql.slice(sql.indexOf("\nBEGIN;\n"), sql.indexOf("\nCOMMIT;\n"));
      const draftCode = sqlCode(body(raw()));
      const migrationCode = sqlCode(body(readSource(PROMOTED_MIGRATION)));
      const added = "GRANT SELECT (consent_given_at) ON public.jobseekers TO authenticated;";
      assert.ok(migrationCode.includes(added));
      const normalize = (s: string) =>
        s.replace(added, "").replace(/REVOKE ALL \(([^)]*)\)/g, "REVOKE ALL (<columns>)").replace(/\s+/g, " ").trim();
      assert.equal(normalize(migrationCode), normalize(draftCode));
      assert.ok(!/RAISE EXCEPTION/.test(sqlCode(readSource(PROMOTED_MIGRATION))), "no execution guard in the migration");
      for (const marker of ["REVIEW-ONLY", "Never applied by an agent", "OWNER STEPS BEFORE APPLYING", "information_schema.columns"]) {
        assert.ok(readSource(PROMOTED_MIGRATION).includes(marker), `migration must mention ${marker}`);
      }
    });

    it("static: migration column-level revokes cover exactly the live columns (snapshot 2026-10-20)", () => {
      // Read from project dkpzieytlqkbhhpqpvyr information_schema.columns on 2026-10-20.
      const LIVE_COLUMNS: Record<string, string> = {
        admins: "id, email, password_hash, name, role, is_active, last_login, created_at, updated_at",
        employers:
          "id, email, password_hash, establishment_name, province, city, barangay, address, total_paid_employees, total_vacant_positions, industry, industry_code, contact_person, contact_phone, designation, company_tax_id, geographic_code, barangay_chairperson, barangay_secretary, srs_subscriber_intent, srs_prepared_by, srs_prepared_designation, srs_prepared_date, srs_prepared_contact, srs_form_file, business_permit_file, bir_2303_file, company_profile_file, dole_certification_file, profile_image, account_status, verified_at, is_active, last_login, created_at, updated_at, consent_given_at, consent_privacy_notice_version",
        jobseekers:
          "id, email, password_hash, first_name, last_name, middle_name, suffix, birth_date, gender, religion, civil_status, tin, height, is_pwd, pwd_type, pwd_type_others, disability_visual, disability_speech, disability_mental, disability_hearing, disability_physical, disability_others, phone, house_number, barangay, city, province, zip_code, employment_status, employment_type, self_employed_type, self_employed_type_others, unemployed_reason, unemployed_months, unemployed_due_to_calamity, terminated_country, terminated_reason, is_ofw, ofw_country, is_former_ofw, former_ofw_country, former_ofw_return_month_year, is_four_ps, household_id_no, preference_part_time, preference_full_time, preferred_occupation_1, preferred_occupation_2, preferred_occupation_3, preferred_work_location_local, preferred_work_location_local_1, preferred_work_location_local_2, preferred_work_location_local_3, preferred_work_location_overseas, preferred_work_location_overseas_1, preferred_work_location_overseas_2, preferred_work_location_overseas_3, other_skills, other_skills_others, settings, nsrp_id, profile_image, profile_complete, profile_completeness, is_active, last_login, created_at, updated_at, matching_completeness_pct, job_seeking_status, consent_given_at, consent_privacy_notice_version",
      };
      const code = sqlCode(readSource(PROMOTED_MIGRATION));
      for (const t of PROFILE_TABLES) {
        const m = code.match(new RegExp(`REVOKE ALL \\(([^)]*)\\)\\s*ON public\\.${t} FROM PUBLIC, anon, authenticated;`));
        assert.ok(m, `column-level revoke required for ${t}`);
        const revoked = m[1].split(",").map((c) => c.trim()).filter(Boolean).sort();
        assert.deepEqual(revoked, LIVE_COLUMNS[t].split(", ").sort(), `${t} revoke list must match live columns`);
      }
    });

    it("static: carries draft, execution, target, and prerequisite warnings plus an execution guard", () => {
      const text = raw();
      for (const marker of [
        "NOT AN ACTIVE MIGRATION",
        "NOT EXECUTED",
        "SYNTHETIC TARGET ONLY",
        "DEPENDS ON COMPATIBILITY CHANGES AND TARGET REVIEW",
        "PRE-EXECUTION CHECKS",
        "app/auth/callback/route.ts",
        "app/admin/referrals/page.tsx",
        "app/lib/supabase-middleware.ts",
        "app/lib/supabase.ts",
        "pg_policies",
        "column_privileges",
      ]) {
        assert.ok(text.includes(marker), `draft must mention ${marker}`);
      }
      assert.match(code(), /DO \$\$\s*BEGIN\s*RAISE EXCEPTION/, "draft must abort if executed unmodified");
    });

    it("static: all three profile tables have RLS enabled and none is FORCED", () => {
      for (const t of PROFILE_TABLES) {
        assert.match(code(), new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY;`));
      }
      assert.ok(!/FORCE\s+ROW\s+LEVEL\s+SECURITY/i.test(code()), "must not FORCE RLS");
    });

    it("static: table-level and every column-level privilege is revoked from anon/authenticated", () => {
      for (const t of PROFILE_TABLES) {
        assert.match(code(), new RegExp(`REVOKE ALL ON TABLE public\\.${t}\\s+FROM PUBLIC, anon, authenticated;`));
        const colRevoke = code().match(new RegExp(`REVOKE ALL \\(([^)]*)\\)\\s*ON public\\.${t} FROM PUBLIC, anon, authenticated;`));
        assert.ok(colRevoke, `column-level revoke required for ${t}`);
        const revoked = new Set(colRevoke[1].split(",").map((c) => c.trim()).filter(Boolean));
        for (const col of baselineColumns(t)) {
          assert.ok(revoked.has(col), `${t}.${col} must be in the column-level revoke`);
        }
      }
    });

    it("static: the only client grants are SELECT (id, is_active) to authenticated", () => {
      const grants = code().match(/GRANT[\s\S]*?;/g) ?? [];
      assert.equal(grants.length, 3);
      for (const t of PROFILE_TABLES) {
        assert.ok(
          grants.some((g) => g.replace(/\s+/g, " ").trim() === `GRANT SELECT (id, is_active) ON public.${t} TO authenticated;`),
          `narrow grant required for ${t}`
        );
      }
      for (const g of grants) {
        assert.ok(!/\b(INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL)\b/i.test(g), `no client write grant: ${g}`);
        assert.ok(!/\banon\b|\bPUBLIC\b|service_role/.test(g), `no anon/PUBLIC/service_role grant: ${g}`);
      }
    });

    it("static: each table has one distinct own-row SELECT policy for authenticated and no write policies", () => {
      const policies = code().match(/CREATE POLICY[\s\S]*?;/g) ?? [];
      assert.equal(policies.length, 3);
      const names = new Set<string>();
      for (const t of PROFILE_TABLES) {
        const p = policies.find((x) => x.includes(`ON public.${t}`));
        assert.ok(p, `policy required for ${t}`);
        const norm = p.replace(/\s+/g, " ");
        assert.ok(norm.includes("FOR SELECT"));
        assert.ok(norm.includes("TO authenticated"));
        assert.ok(norm.includes("USING (id = (SELECT auth.uid()))"));
        names.add(norm.match(/CREATE POLICY (\S+)/)![1]);
      }
      assert.equal(names.size, 3, "policy names must be distinct");
      assert.ok(!/FOR\s+(INSERT|UPDATE|DELETE|ALL)\b/i.test(code()));
    });

    it("static: no auth.users DDL, seed data, Storage, generic helpers, or automatic policy drops", () => {
      const c = code();
      assert.ok(!/auth\.users/i.test(c), "no auth.users references in executable SQL");
      assert.ok(!/\bINSERT\s+INTO\b/i.test(c), "no seed data");
      assert.ok(!/storage\./i.test(c), "no Storage changes");
      assert.ok(!/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(c), "no SQL helper functions");
      assert.ok(!/\bDROP\b/i.test(c), "no executable DROP statements");
      assert.ok(!/service_role/.test(c), "service_role privileges are not changed by this draft");
    });
  });
});
