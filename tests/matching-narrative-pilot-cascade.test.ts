// Synthetic, offline test — no live Supabase/Groq/Cloudflare/Ollama calls.
//
// Test 1 exercises the real pilot-mode narrative cascade directly against
// agent.ts's callNarrativeModel()/buildFinalNarrativeFields(). Groq is made
// to fail with zero network calls by clearing GROQ_API_KEY/GROQ_API_KEYS —
// callNarrativeModelGroqSingleModel() returns MISSING_DEPENDENCY before
// ever constructing a Groq client when no key is configured, so both the
// "primary" and "fallback" attempts fail without touching the network. A
// global fetch spy proves Cloudflare/Ollama (the only two call sites that
// use fetch() in this cascade) are never attempted.
//
// Test 2 exercises ExplanationService.generateNarrative(), mocking only
// app/lib/supabase.ts (via node:test's experimental mock.module, matching
// the "@/lib/supabase" specifier ExplanationService.ts itself imports) so
// that importing it doesn't throw on missing Supabase env vars. The real
// callNarrativeModel()/buildFinalNarrativeFields() still run — Groq is
// again made to fail with zero network calls (empty key) for the
// NARRATIVE_UNAVAILABLE case, and DISABLE_NARRATIVE=true is used to
// produce a real, unrelated, non-NARRATIVE_UNAVAILABLE error code
// (DISABLED) for the "must still throw" case. A global fetch spy is
// installed here too, so that if the pilot gate is ever missing/broken,
// the test fails fast with a clear assertion instead of hanging on a real
// connection attempt to a nonexistent local Ollama server.
//
// Importing agent.ts (directly, or transitively via ExplanationService.ts)
// pulls in app/lib/supabase.ts, which throws synchronously if
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are unset. This
// file sets obviously synthetic, non-resolvable placeholder values for
// those two vars (an ".invalid" TLD, reserved by IANA for exactly this
// purpose) once, at module load, before any test runs. No network call is
// ever made against them.
//
// Run with: npx tsx --test --experimental-test-module-mocks tests/matching-narrative-pilot-cascade.test.ts

import { test, mock } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://synthetic-test-placeholder.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "synthetic-test-placeholder-anon-key";

const TEST_TIMEOUT_MS = 10_000;

// Properly awaits `fn` before restoring env vars — an earlier version of
// this helper returned fn() without awaiting it, so the `finally` cleanup
// ran before the async body had executed, silently undoing the overrides.
async function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => T | Promise<T>): Promise<T> {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

// Installs a fetch spy that throws on any call instead of hitting the
// network, and returns {count(), restore()}. The only two fetch() call
// sites in the entire narrative cascade are callNarrativeModelCloudflare()
// and callNarrativeModelOllama() — if either is reached, this fires.
function installFetchGuard() {
  let callCount = 0;
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (...args: any[]) => {
    callCount++;
    throw new Error("Unexpected network call in offline test: " + JSON.stringify(args[0]));
  };
  return {
    count: () => callCount,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function buildSyntheticJob() {
  return {
    id: "synthetic-job-1",
    position_title: "Warehouse Worker",
    minimum_education_required: "high_school",
    main_skill_desired: "Forklift Operation",
    years_of_experience_required: 1,
    salary_min: null,
    salary_max: null,
    work_setup: "onsite",
    work_type: "full-time",
    description: "Synthetic vacancy for offline testing.",
    employers: { city: "General Santos City", province: "South Cotabato", industry: null, establishment_name: "Synthetic Co." },
  };
}

function buildSyntheticSeeker() {
  return {
    id: "synthetic-seeker-1",
    skills: [{ name: "Forklift Operation", proficiency_level: "Intermediate" }],
    experience_years: 3,
    work_history: [{ role_title: "Delivery Driver", company: "Synthetic Logistics Co.", months: 36, description: "" }],
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

function buildSyntheticScoringResult() {
  const dim = { raw: 0.8, confidence: 0.8, weighted: 0.3 };
  return {
    utility_score: 72.5,
    final_score: 81.3,
    percentile_rank: 0.8,
    confidence_band: "medium" as const,
    grade: "Good",
    f1: dim,
    f2: dim,
    f3: dim,
    f5_location: dim,
    f6_completeness: dim,
    f7: dim,
    f8: dim,
    relevant_experience_months: 36,
    total_experience_months: 36,
    constraint_violations: [] as string[],
    explanation: { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} },
  };
}

test(
  "pilot mode: both Groq calls fail -> NARRATIVE_UNAVAILABLE, zero Cloudflare/Ollama attempts, deterministic fields untouched",
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    const guard = installFetchGuard();
    try {
      await withEnv(
        {
          GROQ_API_KEY: undefined,
          GROQ_API_KEYS: undefined,
          AI_FALLBACK_URL: undefined,
          MATCHING_NARRATIVE_PILOT_MODE: undefined, // unset => fail-closed => pilot mode ON
          DISABLE_NARRATIVE: undefined,
          NODE_ENV: undefined,
        },
        async () => {
          const { callNarrativeModel, buildFinalNarrativeFields } = await import("../app/lib/matching/agent");

          const job = buildSyntheticJob() as any;
          const seeker = buildSyntheticSeeker() as any;
          const scoringResult = buildSyntheticScoringResult() as any;

          const outcome = await callNarrativeModel(job, seeker, scoringResult);

          assert.equal(guard.count(), 0, "Cloudflare/Ollama must never be attempted in pilot mode once both Groq calls fail");
          assert.equal(outcome.ok, false, "outcome must be a failure once both Groq calls are exhausted in pilot mode");
          if (outcome.ok) throw new Error("unreachable");
          assert.equal(outcome.error.code, "NARRATIVE_UNAVAILABLE");
          assert.equal((outcome.error.details as any)?.reason, "primary_and_fallback_unavailable");

          const finalNarrative = buildFinalNarrativeFields(outcome, scoringResult.grade);
          assert.equal(finalNarrative.narrative_available, false);
          assert.equal(finalNarrative.narrative_status, "unavailable");
          assert.equal(finalNarrative.narrative_provider, null);
          assert.equal(finalNarrative.narrative_reason, "primary_and_fallback_unavailable");
          // No invented narrative text.
          assert.equal(finalNarrative.narrative, "");
          assert.equal(finalNarrative.headline, "");
          assert.deepEqual(finalNarrative.strengths, []);
          assert.deepEqual(finalNarrative.concerns, []);

          // buildFinalNarrativeFields() must only ever produce
          // narrative-shaped keys — it must never introduce or shadow
          // score/grade/confidence keys, which matchJobToSeeker() keeps
          // entirely separate (spread from scoringResult). This is the
          // structural guarantee that Stage 1-3 output is "present and
          // unchanged" through Stage 4.
          const scoreLikeKeys = ["utility_score", "final_score", "grade", "confidence_band", "percentile_rank", "f1", "f2", "f3"];
          for (const key of scoreLikeKeys) {
            assert.equal(key in finalNarrative, false, `buildFinalNarrativeFields() output must not contain score-shaped key '${key}'`);
          }

          // Determinism: calling again with the same outcome yields an
          // identical result.
          const finalNarrativeAgain = buildFinalNarrativeFields(outcome, scoringResult.grade);
          assert.deepEqual(finalNarrative, finalNarrativeAgain);
        }
      );
    } finally {
      guard.restore();
    }
  }
);

test(
  "isNarrativePilotMode() is fail-closed the other direction: only the exact string 'false' disables pilot mode",
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    const { isNarrativePilotMode } = await import("../app/lib/matching/agent");

    const cases: Array<[string | undefined, boolean]> = [
      [undefined, true], // missing => pilot ON
      ["", true], // empty => pilot ON
      ["FALSE", true], // wrong case => pilot ON
      [" false", true], // whitespace-padded => pilot ON
      ["false ", true], // trailing space => pilot ON
      ["true", true], // explicit true => still pilot ON (not the opt-out value)
      ["false", false], // the ONLY value that disables pilot mode
    ];

    for (const [value, expectedPilotMode] of cases) {
      await withEnv({ MATCHING_NARRATIVE_PILOT_MODE: value }, () => {
        assert.equal(
          isNarrativePilotMode(),
          expectedPilotMode,
          `MATCHING_NARRATIVE_PILOT_MODE=${JSON.stringify(value)} should yield pilotMode=${expectedPilotMode}`
        );
      });
    }
  }
);

test(
  "ExplanationService.generateNarrative(): NARRATIVE_UNAVAILABLE returns a structured response (no throw); an unrelated error (DISABLED) still throws",
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    const guard = installFetchGuard();
    try {
      function makeFakeSupabaseAdmin(fixtures: { scoreData: any; job: any; rawSeeker: any }) {
        function builder(table: string) {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            update: () => chain,
            single: async () => {
              if (table === "job_match_scores") return { data: fixtures.scoreData };
              if (table === "jobs") return { data: fixtures.job };
              if (table === "jobseekers") return { data: fixtures.rawSeeker };
              return { data: null };
            },
            then: (resolve: any) => resolve({ data: null, error: null }),
          };
          return chain;
        }
        return { from: builder };
      }

      const scoreData = {
        grade: "Good",
        utility_score: 72.5,
        dimension_scores: {
          f1: { raw: 0.8, confidence: 0.8 },
          f2: { raw: 0.8, confidence: 0.8 },
          f3: { raw: 1.0, confidence: 1.0 },
          f6_completeness: { raw: 0.8, confidence: 1.0 },
          f7: { raw: 0.5, confidence: 0.8 },
        },
      };
      const job = buildSyntheticJob();
      const rawSeeker = {
        id: "synthetic-seeker-1",
        other_skills: [{ name: "Forklift Operation", proficiency_level: "Intermediate" }],
        jobseeker_experience: [{ position: "Delivery Driver", number_of_months: 36 }],
        jobseeker_education: [{ level: "High School Graduate" }],
      };

      mock.module("@/lib/supabase", {
        // @ts-expect-error — Node's experimental test-runner module mocking
        // (node:test, run with --experimental-test-module-mocks) supports
        // this `exports` option at runtime, but the currently installed
        // Node/TypeScript type definitions for MockModuleOptions only type
        // the deprecated `namedExports` alias, not `exports`. Remove this
        // suppression once the installed @types/node definitions add
        // `exports` (same known gap as tests/matching-stage1-determinism-
        // pilot.test.ts from Task 1.2).
        exports: {
          supabaseAdmin: makeFakeSupabaseAdmin({ scoreData, job, rawSeeker }),
          supabase: {},
          STORAGE_BUCKETS: {},
        },
      });

      const { ExplanationService } = await import("../app/lib/matching/services/ExplanationService");

      // Case 1: pilot mode, both Groq calls fail -> NARRATIVE_UNAVAILABLE ->
      // structured response, no throw.
      await withEnv(
        {
          GROQ_API_KEY: undefined,
          GROQ_API_KEYS: undefined,
          AI_FALLBACK_URL: undefined,
          MATCHING_NARRATIVE_PILOT_MODE: undefined,
          DISABLE_NARRATIVE: undefined,
          NODE_ENV: undefined,
        },
        async () => {
          const result = await ExplanationService.generateNarrative("synthetic-job-1", "synthetic-seeker-1");
          assert.equal(guard.count(), 0, "Cloudflare/Ollama must never be attempted via ExplanationService in pilot mode either");
          assert.equal((result as any).narrative_available, false);
          assert.equal((result as any).narrative_status, "unavailable");
          assert.equal((result as any).narrative_provider, null);
          assert.equal((result as any).narrative_reason, "primary_and_fallback_unavailable");
          assert.match((result as any).summary, /Good fit/);
        }
      );

      // Case 2: an unrelated failure code (DISABLED, via DISABLE_NARRATIVE)
      // must still throw exactly as before -- it must NOT become a
      // structured, non-throwing response.
      await withEnv(
        { DISABLE_NARRATIVE: "true" },
        async () => {
          await assert.rejects(
            () => ExplanationService.generateNarrative("synthetic-job-1", "synthetic-seeker-1"),
            /Narrative generation disabled via env/
          );
        }
      );
    } finally {
      guard.restore();
    }
  }
);
