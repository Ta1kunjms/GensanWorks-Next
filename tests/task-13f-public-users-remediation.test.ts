// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13F — Batch 1 public.users remediation:
// the legacy hard-delete endpoint is disabled, three "jobseeker -> users"
// table-map/table-target defects are corrected to "jobseekers", and the
// redundant legacy "users" upsert in jobseeker profile provisioning is
// removed. Source-level checks are used where isolated database execution
// is prohibited, per this task's constraints.

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { DELETE } from "@/api/admin/users/[id]/route";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Task 13F — hard-delete endpoint disabled (app/api/admin/users/[id]/route.ts)", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchCallCount = 0;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallCount = 0;
    // @ts-expect-error - test instrumentation, restored in afterEach
    globalThis.fetch = (...args: unknown[]) => {
      fetchCallCount += 1;
      throw new Error(
        `Unexpected network/fetch call during disabled DELETE invocation: ${JSON.stringify(args)}`
      );
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("DELETE returns HTTP 501", async () => {
    const res = await DELETE();
    assert.equal(res.status, 501);
  });

  it("the response body is generic and discloses no table/schema/database detail", async () => {
    const res = await DELETE();
    const data = await res.json();

    assert.equal(typeof data.error, "string");
    assert.ok(data.error.length > 0);

    const serialized = JSON.stringify(data).toLowerCase();
    const forbiddenInBody = [
      "users",
      "jobseekers",
      "employers",
      "admins",
      "sql",
      "database",
      "migration",
      "supabase",
      "postgres",
      "rpc",
      "schema",
    ];

    for (const forbidden of forbiddenInBody) {
      assert.ok(
        !serialized.includes(forbidden),
        `response body must not mention "${forbidden}" (body: ${serialized})`
      );
    }
  });

  it("invoking DELETE performs zero fetch/network calls", async () => {
    await DELETE();
    assert.equal(fetchCallCount, 0, "DELETE() must not trigger any network/fetch call");
  });

  it("the DELETE route source contains no destructive .delete( call", () => {
    const source = readSource("app/api/admin/users/[id]/route.ts");
    assert.ok(
      !source.includes(".delete("),
      "app/api/admin/users/[id]/route.ts must not contain a .delete( call"
    );
    assert.ok(
      !source.includes("supabaseAdmin"),
      "app/api/admin/users/[id]/route.ts must not reference supabaseAdmin"
    );
  });
});

describe("Task 13F — password-reset table map (app/api/auth/reset-password/confirm/route.ts)", () => {
  const source = readSource("app/api/auth/reset-password/confirm/route.ts");

  it("maps jobseeker to \"jobseekers\"", () => {
    assert.match(source, /jobseeker:\s*"jobseekers"/);
  });

  it("no longer maps jobseeker to \"users\"", () => {
    assert.ok(
      !/jobseeker:\s*"users"/.test(source),
      "reset-password confirm route must not map jobseeker to \"users\""
    );
  });

  it("admin and employer mappings are unchanged", () => {
    assert.match(source, /admin:\s*"admins"/);
    assert.match(source, /employer:\s*"employers"/);
  });
});

describe("Task 13F — account-deletion request table map (app/api/auth/account-deletion/request/route.ts)", () => {
  const source = readSource("app/api/auth/account-deletion/request/route.ts");

  it("maps jobseeker to \"jobseekers\"", () => {
    assert.match(source, /jobseeker:\s*"jobseekers"/);
  });

  it("no longer maps jobseeker to \"users\"", () => {
    assert.ok(
      !/jobseeker:\s*"users"/.test(source),
      "account-deletion request route must not map jobseeker to \"users\""
    );
  });

  it("password-verification behavior is untouched (verifyPassword still called against password_hash)", () => {
    assert.match(source, /verifyPassword\(currentPassword, userData\.password_hash/);
  });
});

describe("Task 13F — account-deletion processor jobseeker branch (app/api/admin/account-deletion/process/route.ts)", () => {
  const source = readSource("app/api/admin/account-deletion/process/route.ts");

  it("the jobseeker deactivation branch targets \"jobseekers\"", () => {
    const jobseekerBranchMatch = source.match(
      /byRole\.jobseeker\.length > 0\s*\?\s*supabaseAdmin\s*\.from\("([^"]+)"\)/
    );
    assert.ok(jobseekerBranchMatch, "could not locate the jobseeker deactivation branch");
    assert.equal(jobseekerBranchMatch?.[1], "jobseekers");
  });

  it("does not retain a .from(\"users\") call anywhere in the file", () => {
    assert.ok(
      !source.includes('.from("users")'),
      "account-deletion processor must not reference .from(\"users\")"
    );
  });

  it("employer and admin branches are unchanged", () => {
    assert.match(source, /\.from\("employers"\)\s*\.update\(\{\s*is_active: false, account_status: "suspended"/);
    assert.match(source, /\.from\("admins"\)\s*\.update\(\{\s*is_active: false, updated_at: nowIso \}\)/);
  });
});

describe("Task 13F — jobseeker profile provisioning (app/api/jobseeker/profile/route.ts)", () => {
  const source = readSource("app/api/jobseeker/profile/route.ts");

  // 2026-10-21: GET no longer auto-provisions profiles at all (it bypassed the
  // consent gate); profiles are created at signup or at /auth/consent.
  it("no legacy \"users\" writes and no auto-provisioning", () => {
    assert.ok(!/async function provisionJobseekerProfile/.test(source), "auto-provisioning removed");
    assert.ok(
      !source.includes('.from("users").upsert'),
      'app/api/jobseeker/profile/route.ts must not contain .from("users").upsert'
    );
    assert.ok(
      !source.includes('.from("users")'),
      'app/api/jobseeker/profile/route.ts must not reference .from("users") at all'
    );
  });

  it("never inserts a jobseekers row from the profile route", () => {
    assert.ok(!/\.from\("jobseekers"\)\s*\.insert\(/.test(source));
  });
});
