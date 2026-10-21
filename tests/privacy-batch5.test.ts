// Offline checks for the 2026-10-22 privacy batch (docs/system-scan-2026-10-21.md, batch 5).
// Static source reads only: no database or network access.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("account deletion requests have no cancelled_at column", () => {
  for (const file of [
    "app/api/auth/account-deletion/cancel/route.ts",
    "app/api/auth/account-deletion/route.ts",
    "app/api/admin/analytics/audit-feed/route.ts",
    "app/api/admin/activities/_events.ts",
    "app/api/auth/account-data/export/route.ts",
  ]) {
    it(`${file} does not read or write cancelled_at`, () => {
      assert.doesNotMatch(read(file), /cancelled_at:\s*new Date|select\([^)]*cancelled_at|item\.cancelled_at/);
    });
  }
});

describe("account data export", () => {
  const src = read("app/api/auth/account-data/export/route.ts");

  it("uses live tables and columns", () => {
    assert.doesNotMatch(src, /from\("users"\)/);
    assert.doesNotMatch(src, /applicant_name|applicant_email|cover_letter|resume_url|read_at|referral_slip_number|peso_officer_name|remarks/);
    assert.match(src, /\.eq\("jobseeker_id", userId\)/);
  });

  it("strips credentials and fails on a broken section", () => {
    assert.match(src, /omitSecrets\(profileResult\.data/);
    assert.match(src, /function rowsOf/);
  });
});

describe("lifecycle tokens use live auth_lifecycle_tokens columns", () => {
  const src = read("app/lib/auth-account-tokens.ts");
  it("uses type/used_at and no missing table", () => {
    assert.doesNotMatch(src, /from\("account_email_verifications"\)|consumed_at:|"consumed_at"/);
    const insert = src.slice(src.indexOf(".insert({"), src.indexOf("});", src.indexOf(".insert({")));
    assert.match(insert, /type: params\.kind/);
    assert.doesNotMatch(insert, /\bkind:|email:|updated_at:/);
    assert.match(src, /\.is\("used_at", null\)/);
  });
  it("email verification state comes from Supabase Auth", () => {
    assert.match(src, /email_confirmed_at/);
    assert.match(src, /updateUserById\(userId, \{ email_confirm: true \}\)/);
  });
});

describe("referral slips", () => {
  const src = read("app/api/admin/referral-slips/route.ts");
  it("uses live job and jobseeker columns", () => {
    assert.doesNotMatch(src, /psoc_code,|contact_number|education_level|\bage, sex\b/);
    assert.match(src, /jobseeker_education/);
  });
  it("writes no missing slip columns and notifies only the job's employer", () => {
    assert.doesNotMatch(src, /pdf_url:|notified_at:/);
    assert.match(src, /const employerId = slipJob\?\.employer_id/);
  });
});

describe("bias audit", () => {
  it("maps to live columns", () => {
    for (const file of ["app/lib/matching/bias-audit.ts", "app/api/admin/audit/bias/route.ts"]) {
      const src = read(file);
      assert.match(src, /date_of_birth:birth_date/, file);
      assert.doesNotMatch(src, /^\s*final_score,$/m, file);
    }
  });
});

describe("admin applicant DELETE", () => {
  const src = read("app/api/admin/applicants/[id]/route.ts");
  it("deactivates via the deletion pipeline instead of hard-deleting", () => {
    assert.doesNotMatch(src, /from\("jobseekers"\)\.delete\(\)/);
    assert.match(src, /is_active: false/);
    assert.match(src, /account_deletion_requests/);
    assert.match(src, /action: "user_delete"/);
  });
});
