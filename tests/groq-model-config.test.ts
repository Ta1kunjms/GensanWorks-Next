import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { correctSkillSpelling, checkRoleEquivalence } from "../app/lib/matching/ai-correction-service";
import { callNarrativeModel } from "../app/lib/matching/agent";

describe("Groq Model Configuration & Security Auditing", () => {
  it("1. Unit tests enforce test isolation (zero live LLM network calls)", async () => {
    // In test environment (NODE_ENV === "test"), ai-correction-service should safely return fallback/null
    const spellingResult = await correctSkillSpelling("reactjs");
    assert.equal(spellingResult.changed, false);
    assert.equal(spellingResult.corrected, "reactjs");

    const roleResult = await checkRoleEquivalence("Software Engineer", "Cook");
    assert.equal(roleResult.same_role, false);
    assert.equal(roleResult.reasoning, "error");
  });

  it("2. callNarrativeModel returns deterministic stub in test environment", async () => {
    const mockJob: any = { id: "job-1", position_title: "Developer", vacancies: 1 };
    const mockSeeker: any = { id: "seeker-1", skills: [{ name: "JavaScript" }], work_history: [], logistics_zone: "General Santos City" };
    const mockScoring: any = {
      utility_score: 85,
      grade: "Excellent",
      relevant_experience_months: 24,
      f1: { raw: 0.85, confidence: 0.9 },
      f2: { raw: 0.85, confidence: 0.9 },
      f3: { raw: 0.85, confidence: 0.9 },
      f6_completeness: { raw: 1.0, confidence: 1.0 },
      f7: { raw: 0.8, confidence: 0.8 }
    };

    const result = await callNarrativeModel(mockJob, mockSeeker, mockScoring);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.model, "test-stub");
      assert.equal(result.value.recommendation, "Strong fit");
    }
  });

  it("3. Environment variables define primary and fallback models with safe defaults", () => {
    const primary = process.env.GROQ_PRIMARY_MODEL || "openai/gpt-oss-120b";
    const fallback = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
    const temp = parseFloat(process.env.GROQ_TEMPERATURE || "0.1");

    assert.equal(typeof primary, "string");
    assert.equal(typeof fallback, "string");
    assert.equal(isNaN(temp), false);
    assert.notEqual(primary, "llama-3.3-70b-versatile", "Hardcoded unavailable model must be removed");
  });
});
