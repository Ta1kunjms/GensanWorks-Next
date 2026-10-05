import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deidentifyJobseeker } from "../app/lib/matching/deidentify";

// Network / fetch guard: ensure no test makes external network or database calls.
const originalFetch = globalThis.fetch;
(globalThis as any).fetch = () => {
  throw new Error("Network/database fetch invoked in offline contract test");
};

test("agent.ts loadJobseeker query contract matches canonical baseline without flat education_level", () => {
  const agentPath = path.resolve(__dirname, "../app/lib/matching/agent.ts");
  const agentSource = fs.readFileSync(agentPath, "utf-8");

  // Locate the loadJobseeker function body
  const loadJobseekerMatch = agentSource.match(/async function loadJobseeker[\s\S]*?return \{ ok: true/);
  assert.ok(loadJobseekerMatch, "loadJobseeker function must exist in agent.ts");
  const fnBody = loadJobseekerMatch[0];

  // Extract the select string from loadJobseeker
  const selectMatch = fnBody.match(/\.select\((["'`])([\s\S]*?)\1\)/);
  assert.ok(selectMatch, "select call must be found in loadJobseeker");
  const selectStr = selectMatch[2];

  // Must contain all required canonical child embeds
  assert.ok(selectStr.includes("jobseeker_experience(*)"), "Must embed jobseeker_experience(*)");
  assert.ok(selectStr.includes("jobseeker_education(*)"), "Must embed jobseeker_education(*)");
  assert.ok(selectStr.includes("jobseeker_trainings(*)"), "Must embed jobseeker_trainings(*)");
  assert.ok(selectStr.includes("jobseeker_licenses(*)"), "Must embed jobseeker_licenses(*)");
  assert.ok(selectStr.includes("jobseeker_languages(*)"), "Must embed jobseeker_languages(*)");

  // Must contain other_skills
  assert.ok(selectStr.includes("other_skills"), "Must select other_skills column");

  // Must NOT contain standalone explicit education_level selection in that select string
  assert.ok(!selectStr.includes("education_level"), "loadJobseeker select string must not contain education_level");

  // Must not use the unsafe fragment
  assert.ok(!fnBody.includes("*, education_level,"), "Must not use unsafe fragment '*, education_level,'");
  assert.ok(!selectStr.includes("*, education_level,"), "select string must not contain '*, education_level,'");
});

test("deidentify.ts derives education level strictly from jobseeker_education child table", () => {
  const deidentifyPath = path.resolve(__dirname, "../app/lib/matching/deidentify.ts");
  const deidentifySource = fs.readFileSync(deidentifyPath, "utf-8");

  // Source must not read raw.education_level
  assert.ok(!deidentifySource.includes("raw.education_level"), "deidentify.ts must never access raw.education_level");

  // Source must derive from jobseeker_education and fallback using eduArray[0]?.level
  assert.ok(deidentifySource.includes("raw.jobseeker_education"), "Must read raw.jobseeker_education");
  assert.ok(deidentifySource.includes("eduArray[0]?.level"), "Must extract level from eduArray[0]?.level");
});

test("Scope guard: migrations, canonical schema, seed files, and configs remain untouched", () => {
  const repoRoot = path.resolve(__dirname, "..");

  // Verify proposed canonical baseline has not been modified
  const baselinePath = path.join(repoRoot, "docs/schema/proposed-canonical-baseline.sql");
  assert.ok(fs.existsSync(baselinePath), "proposed-canonical-baseline.sql must exist");
  const baselineContent = fs.readFileSync(baselinePath, "utf-8");
  assert.ok(!baselineContent.includes("education_level TEXT"), "proposed-canonical-baseline.sql must not have added education_level column");

  // Verify config.toml exists and remains unmodified
  const configPath = path.join(repoRoot, "supabase/config.toml");
  assert.ok(fs.existsSync(configPath), "supabase/config.toml must exist");
});

test("deidentifyJobseeker unit test: produces normalized education from jobseeker_education without flat education_level", () => {
  const rawSeekerWithoutFlatEdu = {
    id: "test-seeker-1",
    jobseeker_education: [{ level: "college", school_name: "Test University", course: "BS Computer Science" }],
    // explicitly NO education_level property
  };

  const deidentified = deidentifyJobseeker(rawSeekerWithoutFlatEdu as any);

  assert.equal(deidentified.education_level, "College Graduate");
  assert.equal(deidentified.education_course, "BS Computer Science");
  assert.ok(deidentified.education_level !== "Not specified", "Education level must be resolved, not 'Not specified'");
});
