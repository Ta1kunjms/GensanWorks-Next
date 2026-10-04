// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13J — Referral outlier remediation:
// 1. app/api/public/referrals/[slip-number]/route.ts
// 2. app/api/admin/activities/_events.ts
// Source-level checks only, per task constraints.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Task 13J — public referral slip route (app/api/public/referrals/[slip-number]/route.ts)", () => {
  const source = readSource("app/api/public/referrals/[slip-number]/route.ts");

  it("contains .from(\"referrals\")", () => {
    assert.ok(
      source.includes('.from("referrals")'),
      'route must reference .from("referrals")'
    );
  });

  it("contains .eq(\"jobseeker_id\", slip.applicant_id)", () => {
    assert.ok(
      source.includes('.eq("jobseeker_id", slip.applicant_id)'),
      'referrals query must filter using .eq("jobseeker_id", slip.applicant_id)'
    );
  });

  it("contains the existing .eq(\"job_id\", slip.job_id) filter", () => {
    assert.ok(
      source.includes('.eq("job_id", slip.job_id)'),
      'referrals query must retain .eq("job_id", slip.job_id)'
    );
  });

  it("does not contain .eq(\"applicant_id\", slip.applicant_id) for the referrals query", () => {
    assert.strictEqual(
      source.includes('.eq("applicant_id", slip.applicant_id)'),
      false,
      'referrals query must not filter using .eq("applicant_id", slip.applicant_id)'
    );
  });

  it("still contains slip.applicant_id retaining the valid referral_slips field", () => {
    assert.ok(
      source.includes("slip.applicant_id"),
      'route must retain slip.applicant_id references'
    );
  });
});

describe("Task 13J — admin activities events (app/api/admin/activities/_events.ts)", () => {
  const source = readSource("app/api/admin/activities/_events.ts");

  it("referral-related query selects jobseeker_id", () => {
    assert.ok(
      source.includes('.select("id, jobseeker_id, status, created_at, updated_at")'),
      "referrals query must select jobseeker_id instead of applicant_id"
    );
  });

  it("referral-related processing reads item.jobseeker_id", () => {
    assert.ok(
      source.includes("userId: item.jobseeker_id ? String(item.jobseeker_id) : null"),
      "referral event processing must read item.jobseeker_id"
    );
  });

  it("no referral-specific item.applicant_id remains", () => {
    // Locate the referrals loop
    const referralsLoopStart = source.indexOf("referrals.forEach");
    assert.ok(referralsLoopStart !== -1, "referrals.forEach loop must exist");
    const referralsLoopEnd = source.indexOf("employers.forEach", referralsLoopStart);
    const referralsLoopBlock = source.slice(referralsLoopStart, referralsLoopEnd !== -1 ? referralsLoopEnd : undefined);
    assert.strictEqual(
      referralsLoopBlock.includes("item.applicant_id"),
      false,
      "referral loop must not read item.applicant_id"
    );
  });

  it("application-specific applicant_id usage is not falsely prohibited", () => {
    assert.ok(
      source.includes('.select("id, applicant_id, job_id, status, created_at, updated_at")'),
      "applications query must retain canonical applicant_id"
    );
    assert.ok(
      source.includes("userId: item.applicant_id ? String(item.applicant_id) : null"),
      "applications loop must retain item.applicant_id read"
    );
  });

  it("non-referral event logic remains present", () => {
    assert.ok(source.includes("admin_access_requests"), "admin_access_requests query must be preserved");
    assert.ok(source.includes("account_deletion_requests"), "account_deletion_requests query must be preserved");
    assert.ok(source.includes("jobs"), "jobs query must be preserved");
    assert.ok(source.includes("applications"), "applications query must be preserved");
    assert.ok(source.includes("employers"), "employers query must be preserved");
  });
});

describe("Task 13J — scope protection", () => {
  const slipSource = readSource("app/api/public/referrals/[slip-number]/route.ts");
  const eventsSource = readSource("app/api/admin/activities/_events.ts");

  it("neither allowed production file contains .from(\"users\")", () => {
    assert.strictEqual(
      slipSource.includes('.from("users")'),
      false,
      'public referral slip route must not contain .from("users")'
    );
    assert.strictEqual(
      eventsSource.includes('.from("users")'),
      false,
      'admin activities events must not contain .from("users")'
    );
  });

  it("no unintended referrals.applicant_id assumption remains in either allowed file", () => {
    assert.strictEqual(
      slipSource.includes('.eq("applicant_id", slip.applicant_id)'),
      false,
      "public referral slip route must not assume referrals.applicant_id"
    );
    assert.strictEqual(
      eventsSource.includes('.from("referrals")\n      .select("id, applicant_id'),
      false,
      "admin activities events must not select applicant_id from referrals"
    );
  });
});
