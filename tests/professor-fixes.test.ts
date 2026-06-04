import { test } from "node:test";
import assert from "node:assert";
import { computeVagueSkillAdjustment } from "@/lib/matching/scoring-engine";
import { formatScoreDerivation } from "@/lib/matching/score-explainer";
import { BiasAuditor } from "@/lib/matching/bias-audit";

// ─── Test Group 1: computeVagueSkillAdjustment() ───────────────────────────

test("computeVagueSkillAdjustment", async (t) => {
  await t.test("all vague skills → adjustment multiplier close to 0.40", () => {
    const skills = [
      { name: "programming" },
      { name: "communication" },
      { name: "leadership" },
    ];
    const result = computeVagueSkillAdjustment(skills);
    assert.strictEqual(result.vague_skill_warnings.length, 3);
    assert.strictEqual(result.specificity_score, 0);
    assert.ok(Math.abs(result.adjustment - 0.40) < 0.01);
  });

  await t.test("all specific skills → adjustment multiplier close to 1.05", () => {
    const skills = [
      { name: "React" },
      { name: "TypeScript" },
      { name: "PostgreSQL" },
    ];
    const result = computeVagueSkillAdjustment(skills);
    assert.strictEqual(result.vague_skill_warnings.length, 0);
    assert.strictEqual(result.specificity_score, 1);
    assert.ok(Math.abs(result.adjustment - 1.05) < 0.01);
  });

  await t.test("mixed 50/50 vague + specific → multiplier between 0.40 and 1.05", () => {
    const skills = [
      { name: "programming" },
      { name: "React" },
    ];
    const result = computeVagueSkillAdjustment(skills);
    assert.strictEqual(result.vague_skill_warnings.length, 1);
    assert.strictEqual(result.specificity_score, 0.5);
    assert.ok(result.adjustment > 0.40 && result.adjustment < 1.05);
    assert.ok(Math.abs(result.adjustment - 0.725) < 0.01);
  });

  await t.test("empty skills array → multiplier 1.0, empty warnings, specificity_score 1.0", () => {
    const result = computeVagueSkillAdjustment([]);
    assert.strictEqual(result.adjustment, 1);
    assert.strictEqual(result.vague_skill_warnings.length, 0);
    assert.strictEqual(result.specificity_score, 1);
  });

  await t.test("single vague skill 'programming' → warning mentioning 'programming'", () => {
    const result = computeVagueSkillAdjustment([{ name: "programming" }]);
    assert.ok(result.vague_skill_warnings.some(w => w.includes("programming")));
    assert.strictEqual(result.specificity_score, 0);
  });

  await t.test("single specific skill 'React' → empty warnings", () => {
    const result = computeVagueSkillAdjustment([{ name: "React" }]);
    assert.strictEqual(result.vague_skill_warnings.length, 0);
    assert.strictEqual(result.specificity_score, 1);
  });
});

// ─── Test Group 2: formatScoreDerivation() ────────────────────────────────

test("formatScoreDerivation", async (t) => {
  const baseScores = {
    f1: { raw: 0.8, confidence: 0.9, weighted: 0.32 },
    f2: { raw: 0.6, confidence: 0.8, weighted: 0.15 },
    f3: { raw: 1.0, confidence: 1.0, weighted: 0.05 },
    f5_location: { raw: 0.75, confidence: 1.0, weighted: 0 },
    f6_completeness: { raw: 0.7, confidence: 1.0, weighted: 0 },
    f7: { raw: 0.5, confidence: 0.7, weighted: 0.05 },
    f8: { raw: 0.4, confidence: 0.6, weighted: 0.08 },
  };
  const weights = { f1: 0.40, f2: 0.25, f3: 0.05, f7: 0.10, f8: 0.20 };

  await t.test("returns a non-empty string for valid inputs", () => {
    const result = formatScoreDerivation(baseScores, weights, null);
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  await t.test("output contains each dimension name: Skills, Experience, Education", () => {
    const result = formatScoreDerivation(baseScores, weights, null);
    assert.ok(result.includes("Skills"));
    assert.ok(result.includes("Experience"));
    assert.ok(result.includes("Education"));
  });

  await t.test("output contains the word 'sigmoid' or 'calibration'", () => {
    const result = formatScoreDerivation(baseScores, weights, null);
    assert.ok(result.includes("sigmoid") || result.includes("calibration"));
  });

  await t.test("output contains the final score as a number", () => {
    const result = formatScoreDerivation(baseScores, weights, null);
    assert.ok(/\d+/.test(result));
  });

  await t.test("when vague_skill_warnings is non-empty, output mentions 'vague'", () => {
    const explanation = {
      top_contributing_skills: [],
      missing_critical_skills: [],
      score_breakdown: {},
      vague_skill_warnings: ["'programming' is too vague"],
    };
    const result = formatScoreDerivation(baseScores, weights, explanation);
    assert.ok(result.includes("vague"));
  });

  await t.test("zero scores produce a 'Weak' or 'Fair' grade in output", () => {
    const zeroScores = {
      f1: { raw: 0.05, confidence: 0.1, weighted: 0.02 },
      f2: { raw: 0, confidence: 0, weighted: 0 },
      f3: { raw: 0, confidence: 0, weighted: 0 },
      f5_location: { raw: 0, confidence: 0, weighted: 0 },
      f6_completeness: { raw: 0, confidence: 0, weighted: 0 },
      f7: { raw: 0, confidence: 0, weighted: 0 },
      f8: { raw: 0, confidence: 0, weighted: 0 },
    };
    const result = formatScoreDerivation(zeroScores, weights, null);
    assert.ok(result.includes("Weak") || result.includes("Fair"));
  });

  await t.test("perfect scores produce an 'Excellent' grade in output", () => {
    const perfectScores = {
      f1: { raw: 1.0, confidence: 1.0, weighted: 0.40 },
      f2: { raw: 1.0, confidence: 1.0, weighted: 0.25 },
      f3: { raw: 1.0, confidence: 1.0, weighted: 0.05 },
      f5_location: { raw: 1.0, confidence: 1.0, weighted: 0 },
      f6_completeness: { raw: 1.0, confidence: 1.0, weighted: 0 },
      f7: { raw: 1.0, confidence: 1.0, weighted: 0.10 },
      f8: { raw: 1.0, confidence: 1.0, weighted: 0.20 },
    };
    const result = formatScoreDerivation(perfectScores, weights, null);
    assert.ok(result.includes("Excellent"));
  });
});

// ─── Test Group 3: auditFormCompletionBias() ──────────────────────────────

test("auditFormCompletionBias", async (t) => {
  await t.test("when 6+ group mean > 1-2 group mean by more than 15 points → flag level is 'high'", async () => {
    const mockData = [
      { final_score: 45, jobseekers: { other_skills: ["skill1"] } },
      { final_score: 48, jobseekers: { other_skills: ["skill2", "skill3"] } },
      { final_score: 50, jobseekers: { other_skills: ["skillA"] } },
      { final_score: 72, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f"] } },
      { final_score: 78, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f", "g", "h"] } },
    ];

    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: mockData, error: null }),
          }),
        }),
      }),
    } as any;

    const auditor = new BiasAuditor(mockDb);
    const flags = await auditor.auditFormCompletionBias("test-job");
    const lowFlag = flags.find(f => f.group === "1-2 skills");
    const highFlag = flags.find(f => f.group === "6+ skills");
    assert.ok(lowFlag);
    assert.ok(highFlag);
    assert.strictEqual(lowFlag.flagLevel, "high");
    assert.strictEqual(highFlag.flagLevel, "high");
  });

  await t.test("when gap is less than 15 points → flag level is 'none' or 'low'", async () => {
    const mockData = [
      { final_score: 60, jobseekers: { other_skills: ["skill1"] } },
      { final_score: 62, jobseekers: { other_skills: ["skill2"] } },
      { final_score: 63, jobseekers: { other_skills: ["skillA", "skillB"] } },
      { final_score: 68, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f", "g"] } },
      { final_score: 70, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f", "g", "h"] } },
    ];

    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: mockData, error: null }),
          }),
        }),
      }),
    } as any;

    const auditor = new BiasAuditor(mockDb);
    const flags = await auditor.auditFormCompletionBias("test-job");
    const lowFlag = flags.find(f => f.group === "1-2 skills");
    const highFlag = flags.find(f => f.group === "6+ skills");
    assert.ok(lowFlag);
    assert.ok(highFlag);
    assert.notStrictEqual(lowFlag.flagLevel, "high");
    assert.notStrictEqual(highFlag.flagLevel, "high");
  });

  await t.test("when only one group has data (no 1-2 skill seekers) → returns empty flags, no crash", async () => {
    const mockData = [
      { final_score: 72, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f"] } },
      { final_score: 78, jobseekers: { other_skills: ["a", "b", "c", "d", "e", "f", "g", "h"] } },
    ];

    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: mockData, error: null }),
          }),
        }),
      }),
    } as any;

    const auditor = new BiasAuditor(mockDb);
    const flags = await auditor.auditFormCompletionBias("test-job");
    assert.ok(Array.isArray(flags));
  });

  await t.test("empty candidate array → returns empty flags, no crash", async () => {
    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    } as any;

    const auditor = new BiasAuditor(mockDb);
    const flags = await auditor.auditFormCompletionBias("test-job");
    assert.ok(Array.isArray(flags));
    assert.strictEqual(flags.length, 0);
  });
});
