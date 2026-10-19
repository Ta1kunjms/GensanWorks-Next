// Synthetic, offline test — no live Supabase/Groq calls are made.
//
// Test 1 exercises the deterministic-scoring contract directly against
// scoring-engine.ts's computeUtilityScore(), using Node's experimental
// node:test module-mocking (mock.module) to intercept the Groq-backed
// checkRoleEquivalence() call at its source module
// (app/lib/matching/ai-correction-service.ts) and prove a real call count,
// including from inside scoring-engine.ts's internal call site. All
// assertions live in a single test() so mock.module() is only ever called
// once per process — node:test's module mocking throws ERR_INVALID_STATE
// ("module is already mocked") if the same specifier is mocked twice in one
// process, even after mock.reset().
//
// Test 2 exercises agent.ts's new isAiRoleEquivalenceEnabled() env-flag
// parser in isolation. Importing agent.ts transitively imports
// app/lib/supabase.ts, which throws synchronously if
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are unset. Test 2
// therefore sets obviously synthetic, non-resolvable placeholder values for
// those two vars (an ".invalid" TLD, reserved by IANA for exactly this
// purpose) immediately before a dynamic import of agent.ts. No network call
// is ever made against them — supabase-js's createClient() does not connect
// at construction time, and nothing in this file invokes a query.
//
// Run with: npx tsx --test --experimental-test-module-mocks tests/matching-stage1-determinism-pilot.test.ts
// (see Task 1 change log for why the extra flag is required and the
// package.json question this raises).

import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Fixture chosen so normalizeSkill("Warehouse Worker") vs
// normalizeSkill("Delivery Driver") yields a Jaro-Winkler similarity of
// ~0.554 — inside the [0.40, 0.88) zone that scoreDomainRelevance() uses to
// decide whether to call checkRoleEquivalence(). Confirmed empirically
// against the real jaroWinklerSimilarity()/normalizeSkill() implementation
// before writing this test (not guessed).
function buildSyntheticSeeker() {
  return {
    id: "synthetic-seeker-1",
    skills: [{ name: "Forklift Operation", proficiency_level: "Intermediate" }],
    experience_years: 3,
    work_history: [
      {
        role_title: "Delivery Driver",
        company: "Synthetic Logistics Co.",
        months: 36,
        description: "Delivered goods between synthetic warehouses.",
      },
    ],
    education_level: "High School Graduate",
    education_course: null,
    certifications: [],
    logistics_zone: "same city",
    work_setup_preference: "any",
    expected_salary_min: null,
    expected_salary_max: null,
    preferred_occupations: [],
    preferred_locations: [],
    work_type_preference: "either",
    job_seeking_status: "actively_looking",
    languages: [],
    raw_field_count: 10,
  };
}

function buildSyntheticVacancy() {
  return {
    id: "synthetic-job-1",
    title: "Warehouse Worker",
    requiredSkills: [],
    preferredSkills: [],
    experienceMin: 1,
    experienceMax: 5,
    educationRequired: "high_school",
    educationFieldPreferred: null,
    city: null,
    province: null,
    workSetup: "onsite",
    workType: "full-time",
    description: "",
    salaryMin: null,
    salaryMax: null,
  };
}

test("Stage 1 pilot determinism: checkRoleEquivalence is called only when _skipAiCheck=false, never when true, and scores repeat identically", async () => {
  let callCount = 0;
  mock.module("../app/lib/matching/ai-correction-service", {
    // @ts-expect-error — Node's experimental test-runner module mocking
    // (node:test, run with --experimental-test-module-mocks) supports this
    // `exports` option at runtime, but the currently installed Node/
    // TypeScript type definitions for MockModuleOptions only type the
    // deprecated `namedExports` alias, not `exports`. Remove this
    // suppression once the installed @types/node definitions add `exports`.
    exports: {
      checkRoleEquivalence: async () => {
        callCount++;
        return { same_role: true, similarity: 0.95, reasoning: "MOCK" };
      },
      correctSkillSpelling: async (s: string) => ({ original: s, corrected: s, confidence: 0, changed: false }),
    },
  });

  const { computeUtilityScore } = await import("../app/lib/matching/scoring-engine");
  const seeker = buildSyntheticSeeker() as any;
  const vacancy = buildSyntheticVacancy() as any;

  // 1) Pilot default: _skipAiCheck=true must never reach checkRoleEquivalence,
  //    even though the fixture sits inside its [0.40, 0.88) trigger zone.
  const runA = await computeUtilityScore(seeker, vacancy, undefined, {}, true);
  assert.equal(callCount, 0, "checkRoleEquivalence must not be called when _skipAiCheck=true (pilot default)");

  // 2) Repeating the same call must be byte-for-byte identical (determinism).
  const runB = await computeUtilityScore(seeker, vacancy, undefined, {}, true);
  assert.equal(callCount, 0, "a second _skipAiCheck=true run must still make zero AI calls");
  assert.deepEqual(runA, runB, "the full scoring result must be identical across repeated runs under the deterministic pilot default");

  // 3) Sanity: with _skipAiCheck=false, the SAME fixture must actually reach
  //    checkRoleEquivalence — proving (1) and (2) demonstrate the flag
  //    working, not an unreachable fixture.
  await computeUtilityScore(seeker, vacancy, undefined, {}, false);
  assert.ok(
    callCount >= 1,
    "fixture must exercise the [0.40, 0.88) title-similarity zone — if this fails, the fixture (not the flag) is broken"
  );
});

test("isAiRoleEquivalenceEnabled() is fail-closed: only the exact string 'true' enables AI role-equivalence", async () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    flag: process.env.MATCHING_AI_ROLE_EQUIVALENCE_ENABLED,
  };

  // Synthetic, non-resolvable placeholders — only needed so that importing
  // agent.ts (which imports app/lib/supabase.ts) doesn't throw at import
  // time. No network call is made against these values anywhere in this test.
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://synthetic-test-placeholder.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "synthetic-test-placeholder-anon-key";

  try {
    const agent = await import("../app/lib/matching/agent");

    const cases: Array<[string | undefined, boolean]> = [
      [undefined, false], // missing
      ["", false], // empty
      ["false", false], // explicit false
      ["TRUE", false], // wrong case — must NOT enable
      ["1", false], // malformed
      ["true ", false], // trailing space — must NOT enable
      ["true", true], // the only value that enables it
    ];

    for (const [value, expected] of cases) {
      if (value === undefined) delete process.env.MATCHING_AI_ROLE_EQUIVALENCE_ENABLED;
      else process.env.MATCHING_AI_ROLE_EQUIVALENCE_ENABLED = value;

      assert.equal(
        agent.isAiRoleEquivalenceEnabled(),
        expected,
        `MATCHING_AI_ROLE_EQUIVALENCE_ENABLED=${JSON.stringify(value)} should yield enabled=${expected}`
      );
    }
  } finally {
    if (original.flag === undefined) delete process.env.MATCHING_AI_ROLE_EQUIVALENCE_ENABLED;
    else process.env.MATCHING_AI_ROLE_EQUIVALENCE_ENABLED = original.flag;
    if (original.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
    if (original.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original.anon;
  }
});
