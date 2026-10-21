// Synthetic, fully offline test. No live Supabase calls, no database access,
// no network access. Covers Task 13G Batch 2 — six production files migrated
// from the retired "users" table to "jobseekers" for jobseeker lookups.
// Source-level checks only, per this task's constraints.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. app/api/jobseeker/applications/route.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — jobseeker applications route", () => {
  const source = readSource("app/api/jobseeker/applications/route.ts");

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'applications route must not reference .from("users")'
    );
  });

  it("uses .from(\"jobseekers\") for applicant lookup", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'applications route must reference .from("jobseekers")'
    );
  });

  it("selects canonical name fields and email from jobseekers", () => {
    assert.ok(
      source.includes('.select("first_name, middle_name, last_name, suffix, email")'),
      "applications route must select canonical name fields and email from jobseekers"
    );
  });

  it("retains applicant_name payload key", () => {
    assert.ok(source.includes("applicant_name:"), "applications route must retain applicant_name payload key");
  });

  it("retains applicant_email payload key", () => {
    assert.ok(source.includes("applicant_email:"), "applications route must retain applicant_email payload key");
  });

  it("does not reference stale userProfile variable", () => {
    assert.ok(
      !source.includes("userProfile"),
      "applications route must not reference the deleted userProfile variable"
    );
  });

  it("does not reference stale userResult variable", () => {
    assert.ok(
      !source.includes("userResult"),
      "applications route must not reference the deleted userResult variable"
    );
  });

  it("employer notification uses composedApplicantName", () => {
    assert.ok(
      source.includes("composedApplicantName"),
      "applications route employer notification must use composedApplicantName"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. app/api/referrals/[referralId]/status/route.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — referral status route", () => {
  const source = readSource("app/api/referrals/[referralId]/status/route.ts");

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'referral status route must not reference .from("users")'
    );
  });

  it("uses .from(\"jobseekers\") in the employment-status path", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'referral status route must reference .from("jobseekers")'
    );
  });

  it("still contains referral update logic", () => {
    assert.ok(
      source.includes('.from("referrals")'),
      "referral status route must still reference referrals table"
    );
  });

  it("still contains application status sync logic", () => {
    assert.ok(
      source.includes('.from("applications")'),
      "referral status route must still reference applications table"
    );
  });

  it("employment_status update targets jobseekers at least twice (select + update)", () => {
    const jobseekerCount = (source.match(/\.from\("jobseekers"\)/g) ?? []).length;
    assert.ok(
      jobseekerCount >= 2,
      `referral status route should reference jobseekers at least twice, found ${jobseekerCount}`
    );
  });

  // Per task spec: do not assert applicant_id was renamed.
  it("applicant_id pre-existing inconsistency is intentionally left untouched (vacuous guard)", () => {
    assert.ok(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. app/api/contacts/route.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — contacts route", () => {
  const source = readSource("app/api/contacts/route.ts");

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'contacts route must not reference .from("users")'
    );
  });

  it("uses .from(\"jobseekers\") for jobseeker contacts", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'contacts route must reference .from("jobseekers")'
    );
  });

  it("jobseeker search uses first_name filter", () => {
    assert.ok(
      source.includes("first_name.ilike"),
      "contacts route must search first_name"
    );
  });

  it("jobseeker search uses last_name filter", () => {
    assert.ok(
      source.includes("last_name.ilike"),
      "contacts route must search last_name"
    );
  });

  it("jobseeker search uses email filter", () => {
    assert.ok(
      source.includes("email.ilike"),
      "contacts route must search email"
    );
  });

  it("does not use legacy flat name column in jobseekers query", () => {
    // Extract only the jobseekers block (between shouldInclude("jobseeker") and shouldInclude("employer"))
    const jobseekerBlock = source.match(
      /shouldInclude\("jobseeker"\)[\s\S]*?(?=shouldInclude\("employer"\))/
    );
    const blockToCheck = jobseekerBlock ? jobseekerBlock[0] : "";
    assert.ok(
      !blockToCheck.includes("`name.ilike"),
      "contacts route jobseekers block must not search a flat 'name' column"
    );
  });

  it("response preserves name property in Contact shape", () => {
    assert.ok(
      source.includes('role: "jobseeker", name,'),
      'contacts route must preserve name property in Contact response'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. app/api/public/referrals/[slip-number]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — public referral slip route", () => {
  const source = readSource("app/api/public/referrals/[slip-number]/route.ts");

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'slip route must not reference .from("users")'
    );
  });

  it("uses .from(\"jobseekers\") for applicant lookup", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'slip route must reference .from("jobseekers")'
    );
  });

  it("jobseekers select does not include age", () => {
    // Extract the jobseekers select field list
    const m = source.match(/\.from\("jobseekers"\)[\s\S]*?\.select\("([^"]+)"\)/);
    if (m) {
      assert.ok(
        !m[1].split(",").map(s => s.trim()).includes("age"),
        `slip route jobseekers select must not include age (fields: "${m[1]}")`
      );
    } else {
      // Fallback: no multi-line select form found — ensure raw source doesn't smuggle it
      assert.ok(
        !source.includes(", age,") && !source.includes(", age\""),
        "slip route must not select age from jobseekers"
      );
    }
  });

  it("jobseekers select does not include sex", () => {
    const m = source.match(/\.from\("jobseekers"\)[\s\S]*?\.select\("([^"]+)"\)/);
    if (m) {
      assert.ok(
        !m[1].split(",").map(s => s.trim()).includes("sex"),
        `slip route jobseekers select must not include sex (fields: "${m[1]}")`
      );
    } else {
      assert.ok(
        !source.includes(", sex,") && !source.includes(", sex\""),
        "slip route must not select sex from jobseekers"
      );
    }
  });

  it("contains first_name canonical field reference", () => {
    assert.ok(source.includes("first_name"), "slip route must reference first_name");
  });

  it("contains last_name canonical field reference", () => {
    assert.ok(source.includes("last_name"), "slip route must reference last_name");
  });

  it("full applicant name only for privileged viewers, masked otherwise", () => {
    assert.ok(source.includes('name: fullName || "Unknown"'), "privileged response uses the full name");
    assert.ok(source.includes('name: maskedName || "Registered applicant"'), "anonymous response uses a masked name");
  });

  it("age response property uses null fallback", () => {
    assert.ok(
      source.includes("age: null"),
      "slip route must use null fallback for age in response"
    );
  });

  it("sex response property uses null fallback", () => {
    assert.ok(
      source.includes("sex: null"),
      "slip route must use null fallback for sex in response"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. app/api/public/profile/[nsrp_id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — public profile route", () => {
  const source = readSource("app/api/public/profile/[nsrp_id]/route.ts");

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'public profile route must not reference .from("users")'
    );
  });

  it("uses .from(\"jobseekers\") for base identity lookup", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'public profile route must reference .from("jobseekers")'
    );
  });

  it("selects first_name from jobseekers", () => {
    assert.ok(source.includes("first_name"), "public profile route must select first_name");
  });

  it("selects last_name from jobseekers", () => {
    assert.ok(source.includes("last_name"), "public profile route must select last_name");
  });

  it("response name is composed from the jobseeker's name parts", () => {
    assert.ok(source.includes("profile.first_name, profile.middle_name, profile.last_name, profile.suffix"));
  });

  it("retains NSRP lookup behavior", () => {
    assert.ok(
      source.includes('"nsrp_id"'),
      "public profile route must retain nsrp_id lookup"
    );
  });

  it("retains role guard for employer and admin", () => {
    assert.ok(
      source.includes('"employer"') && source.includes('"admin"'),
      "public profile route must retain employer/admin role guard"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. app/lib/notifications.ts
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — notifications lib", () => {
  const source = readSource("app/lib/notifications.ts");

  it("jobseeker contact lookup uses .from(\"jobseekers\")", () => {
    assert.ok(
      source.includes('.from("jobseekers")'),
      'notifications.ts must use .from("jobseekers") for jobseeker lookup'
    );
  });

  it("does not contain .from(\"users\")", () => {
    assert.ok(
      !source.includes('.from("users")'),
      'notifications.ts must not reference .from("users")'
    );
  });

  it("selects canonical name fields, email, and phone from jobseekers", () => {
    assert.ok(
      source.includes("first_name, middle_name, last_name, suffix, email, phone"),
      "notifications.ts jobseekers select must include canonical name fields, email, and phone"
    );
  });

  it("jobseeker branch does not access result.data.name (legacy flat name property)", () => {
    // Extract only the jobseeker branch (between role==="jobseeker" and role==="employer")
    const jobseekerBranch = source.match(
      /if \(role === "jobseeker"\)([\s\S]*?)(?=if \(role === "employer"\))/
    );
    const branchText = jobseekerBranch ? jobseekerBranch[1] : "";
    assert.ok(
      !branchText.includes("result.data.name"),
      "notifications.ts jobseeker branch must not access result.data.name"
    );
  });

  it("name is set to composedName in returned object", () => {
    assert.ok(
      source.includes("name: composedName"),
      "notifications.ts RecipientContact must set name to composedName"
    );
  });

  it("no duplicate name: property in jobseeker RecipientContact return block", () => {
    const jobseekerBranchMatch = source.match(
      /if \(role === "jobseeker"\)([\s\S]*?)return \{([\s\S]*?)\};/
    );
    if (jobseekerBranchMatch) {
      const returnBlock = jobseekerBranchMatch[2];
      const nameOccurrences = (returnBlock.match(/\bname:/g) ?? []).length;
      assert.equal(
        nameOccurrences,
        1,
        `notifications.ts jobseeker return block must have exactly one name: property, found ${nameOccurrences}`
      );
    } else {
      assert.ok(
        source.includes("name: composedName") && !source.includes("result.data.name"),
        "name must be composedName and no legacy result.data.name"
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. No unsupported flat field introduced in any jobseekers select across all files
// ─────────────────────────────────────────────────────────────────────────────
describe("Task 13G — no prohibited flat fields in jobseekers selects across all modified files", () => {
  const files = [
    "app/api/jobseeker/applications/route.ts",
    "app/api/referrals/[referralId]/status/route.ts",
    "app/api/contacts/route.ts",
    "app/api/public/referrals/[slip-number]/route.ts",
    "app/api/public/profile/[nsrp_id]/route.ts",
    "app/lib/notifications.ts",
  ];

  const prohibitedPatterns = [
    "salary_expectation",
    "last_active_at",
    '"full_name"',
  ];

  for (const filePath of files) {
    it(`${filePath} — no prohibited flat legacy fields`, () => {
      const source = readSource(filePath);
      const selectMatches = [...source.matchAll(/\.from\("jobseekers"\)[\s\S]*?\.select\("([^"]+)"\)/g)];
      for (const match of selectMatches) {
        const fields = match[1];
        for (const prohibited of prohibitedPatterns) {
          assert.ok(
            !fields.includes(prohibited),
            `${filePath}: jobseekers select must not include "${prohibited}" (found: "${fields}")`
          );
        }
      }
    });
  }
});
