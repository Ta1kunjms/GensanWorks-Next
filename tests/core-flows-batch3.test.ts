// Offline checks for the 2026-10-21 core-flow batch (docs/system-scan-2026-10-21.md, batch 3).
// Helpers are tested at runtime; route wiring against the live schema is checked by static source reads.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { packAccessRequestReason, parseAccessRequestReason } from "../app/lib/access-request-details";
import { vacancyFromJob } from "../app/lib/matching/vacancy-from-job";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("access request details round-trip through `reason`", () => {
  it("packs and parses labelled fields", () => {
    const reason = packAccessRequestReason({ organization: "PESO GenSan", phone: "0917", notes: "line1\nline2" });
    assert.deepEqual(parseAccessRequestReason(reason), { organization: "PESO GenSan", phone: "0917", notes: "line1\nline2" });
  });

  it("treats legacy plain text as notes and empty input as null", () => {
    assert.equal(parseAccessRequestReason("please approve").notes, "please approve");
    assert.equal(packAccessRequestReason({}), null);
  });
});

describe("vacancyFromJob uses live jobs columns", () => {
  it("splits main_skill_desired and uses whole-year experience", () => {
    const v = vacancyFromJob({
      id: "j1",
      position_title: "Welder",
      main_skill_desired: "welding; blueprint reading, safety",
      years_of_experience_required: 2,
      employers: { city: "General Santos City", province: "South Cotabato", industry: "Manufacturing" },
    }) as unknown as Record<string, unknown>;
    const json = JSON.stringify(v);
    for (const skill of ["welding", "blueprint reading", "safety"]) assert.ok(json.includes(skill));
    assert.ok(json.includes("General Santos City"));
  });
});

describe("routes no longer reference non-existent columns", () => {
  const cases: Array<[string, RegExp]> = [
    ["app/api/admin/employers/route.ts", /is_archived/],
    ["app/api/admin/employers/archived/route.ts", /is_archived/],
    ["app/api/jobs/[id]/apply/route.ts", /applicant_id/],
    // referral_slips.applicant_id is a real column; only the applications insert is checked.
    ["app/api/jobseeker/applications/route.ts", /applicant_id:/],
    ["app/api/employer/applications/[id]/status/route.ts", /applicant_id|^\s+feedback:/m],
    ["app/api/notifications/route.ts", /read_at/],
    ["app/api/notifications/mark-all-read/route.ts", /read_at/],
    ["app/api/messages/[id]/read/route.ts", /read_at\s*:/],
    ["app/api/admin/matching/[job_id]/route.ts", /sent_to_employer/],
    ["app/api/employer/matching/[job_id]/route.ts", /sent_to_employer/],
    ["app/lib/db-helpers.ts", /applicant_id|feedback: updates/],
    ["app/api/employer/applications/route.ts", /app\.applicant_name/],
  ];
  for (const [file, pattern] of cases) {
    it(`${file} avoids ${pattern}`, () => assert.doesNotMatch(read(file), pattern));
  }
});

describe("core flow wiring", () => {
  it("Employer Approvals lists active employers", () => {
    assert.match(read("app/api/admin/employers/route.ts"), /\.eq\("is_active", true\)/);
  });

  it("match score upsert payload has no bias_flags column", () => {
    const src = read("app/lib/matching/agent.ts");
    const payload = src.slice(src.indexOf("const scorePayload"), src.indexOf(".upsert(scorePayload"));
    assert.ok(payload.length > 0);
    assert.doesNotMatch(payload, /bias_flags\s*:/);
  });

  it("matching only scores eligible (active, consented, looking) jobseekers", () => {
    const src = read("app/lib/matching/engine/DataFetcher.ts");
    assert.match(src, /consent_given_at/);
    assert.match(src, /not_looking/);
    assert.match(read("app/lib/matching/engine/HybridEngine.ts"), /filterEligible/);
  });

  it("referral creation guards duplicates, checks the slip insert and links the application", () => {
    const src = read("app/lib/supabase-admin-data.ts");
    assert.match(src, /status = 409/);
    assert.match(src, /if \(slipError\)/);
    assert.match(src, /application_id: applicationId/);
    assert.match(read("app/api/admin/referrals/route.ts"), /ErrorCode\.CONFLICT/);
  });

  it("admin notify uses the existing notifications endpoint", () => {
    const src = read("app/admin/applicants/page.tsx");
    assert.doesNotMatch(src, /\/api\/admin\/notifications/);
    assert.match(src, /fetch\("\/api\/notifications"/);
  });

  it("employer job applications route returns the shape the page reads", () => {
    const src = read("app/api/employer/jobs/[id]/applications/route.ts");
    assert.match(src, /positionTitle/);
    assert.match(src, /applications/);
  });
});
