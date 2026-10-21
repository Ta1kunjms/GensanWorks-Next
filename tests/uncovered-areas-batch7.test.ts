// Offline checks for the 2026-10-22 follow-up scan of areas the first scan missed
// (docs/system-scan-2026-10-21.md §9, batch 7).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("job detail", () => {
  const src = read("app/api/jobs/[id]/route.ts");

  it("selects only live job columns", () => {
    const select = src.slice(src.indexOf('.from("jobs")'), src.indexOf('.eq("id", jobId)'));
    assert.doesNotMatch(select, /psoc_code|featured|slots_remaining/);
  });

  it("hides unpublished jobs from everyone but the owner and admins", () => {
    assert.match(src, /jobData\.job_status === "active" && jobData\.is_active === true/);
    assert.match(src, /viewer\?\.role !== "admin"/);
  });

  it("returns employer contact details to signed-in users only", () => {
    assert.match(src, /employerEmail: signedIn \?/);
    assert.match(src, /employerContactPhone: signedIn \?/);
    assert.doesNotMatch(src, /\.\.\.contactInfo/);
  });
});

describe("matching determinism (pilot constraint 1)", () => {
  const src = read("app/lib/matching/agent.ts");
  it("AI skill correction runs only when explicitly enabled", () => {
    assert.match(src, /process\.env\.MATCHING_AI_SKILL_CORRECTION_ENABLED === "true"/);
    assert.match(src, /if \(isAiSkillCorrectionEnabled\(\)\) try \{/);
  });
  it("vacancy is built from the shared live-column mapping", () => {
    assert.match(src, /const vacancy = vacancyFromJob\(job\);/);
  });
});

describe("health probes", () => {
  it("probe an existing table and do not leak database errors", () => {
    const health = read("app/api/health/route.ts");
    assert.doesNotMatch(health, /from\("settings"\)|error\.message/);
    assert.doesNotMatch(read("app/api/summary/route.ts"), /from\("settings"\)/);
  });
});

describe("uploads and profile updates", () => {
  it("license upload accepts only raster images within a size limit", () => {
    const src = read("app/api/upload/license/route.ts");
    assert.doesNotMatch(src, /startsWith\("image\/"\)/);
    assert.match(src, /MAX_LICENSE_BYTES/);
    assert.doesNotMatch(src, /file\.name\.split/);
  });

  it("employer profile update writes only live columns and returns no secrets", () => {
    const src = read("app/api/employer/profile/route.ts");
    assert.match(src, /EMPLOYER_WRITABLE_COLUMNS/);
    assert.match(src, /profile: omitSecrets\(updatedProfile\)/);
    assert.doesNotMatch(src, /dbError\.message/);
    assert.doesNotMatch(src, /Updating profile for .*dbPayload/);
  });

  it("no .or() filter interpolates raw search text in db-helpers", () => {
    assert.doesNotMatch(read("app/lib/db-helpers.ts"), /\.or\(`applicant_name/);
  });
});
