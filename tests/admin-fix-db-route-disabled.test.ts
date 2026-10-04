// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Proves that the formerly privileged, unauthenticated
// /api/admin/fix-db endpoint (Task 13A) now returns a generic 404 and never
// touches Supabase/RPC functionality, regardless of request method/path.

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { GET } from "@/api/admin/fix-db/route";

const routeSourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "app",
  "api",
  "admin",
  "fix-db",
  "route.ts"
);

describe("GET /api/admin/fix-db (disabled, Task 13A)", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchCallCount = 0;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallCount = 0;
    // @ts-expect-error - test instrumentation, restored in afterEach
    globalThis.fetch = (...args: unknown[]) => {
      fetchCallCount += 1;
      throw new Error(
        `Unexpected network/fetch call during disabled route invocation: ${JSON.stringify(args)}`
      );
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("the route source no longer imports supabaseAdmin or references RPC/DDL behavior", () => {
    const source = readFileSync(routeSourcePath, "utf8");

    const forbiddenSubstrings = [
      "supabaseAdmin",
      ".rpc(",
      "run_sql",
      "exec_sql",
      "get_table_columns",
      "ALTER TABLE",
      "DROP TABLE",
      "CREATE TABLE",
      "sql_query",
      "disability_visual", // the specific DDL payload the old route sent
    ];

    for (const forbidden of forbiddenSubstrings) {
      assert.ok(
        !source.includes(forbidden),
        `route.ts must not contain "${forbidden}"`
      );
    }
  });

  it("returns HTTP 404 for a GET request", async () => {
    const res = await GET();
    assert.equal(res.status, 404);
  });

  it("the response body is generic and exposes no SQL, table names, migration, or database error detail", async () => {
    const res = await GET();
    const data = await res.json();

    // Generic shape only.
    assert.equal(typeof data.error, "string");
    assert.ok(data.error.length > 0);

    const serialized = JSON.stringify(data).toLowerCase();
    const forbiddenInBody = [
      "sql",
      "alter table",
      "drop table",
      "create table",
      "jobseekers",
      "employers",
      "migration",
      "disability_visual",
      "run_sql",
      "exec_sql",
      "get_table_columns",
      "supabase",
      "postgres",
      "rpc",
    ];

    for (const forbidden of forbiddenInBody) {
      assert.ok(
        !serialized.includes(forbidden),
        `response body must not mention "${forbidden}" (body: ${serialized})`
      );
    }
  });

  it("invoking the route performs no network/fetch activity (no Supabase/RPC call occurs)", async () => {
    await GET();
    assert.equal(
      fetchCallCount,
      0,
      "GET() must not trigger any network/fetch call (e.g. to Supabase)"
    );
  });
});
