// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13I — Referral status route jobseeker foreign-key
// correction: updated.data.applicant_id replaced with updated.data.jobseeker_id.
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

describe("Task 13I — referral status route jobseeker foreign-key correction", () => {
  const source = readSource("app/api/referrals/[referralId]/status/route.ts");

  it("1. route contains zero occurrences of updated.data.applicant_id", () => {
    assert.strictEqual(
      source.includes("updated.data.applicant_id"),
      false,
      "referral status route must contain zero occurrences of updated.data.applicant_id"
    );
  });

  it("2. route contains at least three occurrences of updated.data.jobseeker_id", () => {
    const matches = source.match(/updated\.data\.jobseeker_id/g) ?? [];
    assert.ok(
      matches.length >= 3,
      `expected at least 3 occurrences of updated.data.jobseeker_id, found ${matches.length}`
    );
  });

  it("3. applications fallback path pairs .from(\"applications\") with .eq(\"applicant_id\", updated.data.jobseeker_id)", () => {
    assert.ok(
      source.includes('.from("applications")'),
      'route must reference .from("applications")'
    );
    assert.ok(
      // Live applications table keys the applicant as jobseeker_id (2026-10-21 scan).
      source.includes('.eq("jobseeker_id", updated.data.jobseeker_id)'),
      'route must pair applications lookup with .eq("jobseeker_id", updated.data.jobseeker_id)'
    );
  });

  it("4. jobseeker lookup pairs .from(\"jobseekers\") with .eq(\"id\", updated.data.jobseeker_id)", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'route must reference .from("jobseekers")'
    );
    assert.ok(
      source.includes('.eq("id", updated.data.jobseeker_id)'),
      'route must pair jobseeker lookup with .eq("id", updated.data.jobseeker_id)'
    );
  });

  it("5. response retains applicantId: updated.data.jobseeker_id", () => {
    assert.ok(
      source.includes("applicantId: updated.data.jobseeker_id"),
      "response must retain applicantId mapped to updated.data.jobseeker_id"
    );
  });

  it("6. route still contains .from(\"referrals\") and .select(\"*\")", () => {
    assert.ok(
      source.includes('.from("referrals")'),
      'route must retain .from("referrals")'
    );
    assert.ok(
      source.includes('.select("*")'),
      'route must retain .select("*")'
    );
  });
});
