import { test } from "node:test";
import assert from "node:assert";
import {
  applySemanticConfidenceAdjustments,
  buildVacancyPayload,
  computeEducationQPE,
  computeLogistics,
  computeSalary,
  computeUtilityScore,
  deidentifyJobseeker,
} from "@/lib/matching/scoring-engine";
import { BLINDED_FIELDS } from "@/lib/matching/deidentify";

const baseSeeker = {
  id: "seeker-1",
  city: "General Santos City",
  province: "South Cotabato",
  work_setup_preference: "onsite",
  expected_salary_min: 15000,
  expected_salary_max: 20000,
  other_skills: [{ name: "customer service", proficiency_level: "Intermediate", years: 2 }],
  jobseeker_experience: [{ number_of_months: 60, position: "Support Associate", responsibilities: "Handled front desk" }],
  jobseeker_education: [{ level: "no_formal", school_name: "Some Private School", course: "General Studies" }],
  jobseeker_trainings: [],
  jobseeker_licenses: [],
};

test("QPE applies for 5+ years experience without degree", () => {
  const seeker = deidentifyJobseeker({
    ...baseSeeker,
    jobseeker_education: [{ level: "no_formal", school_name: "Community Training Center", course: "General Studies" }],
    jobseeker_experience: [{ number_of_months: 72, position: "Senior Clerk", responsibilities: "Office work" }],
  });

  const vacancy = buildVacancyPayload({
    requiredSkills: [],
    preferredSkills: [],
    experienceMin: 3,
    experienceMax: 5,
    educationRequired: "bachelor",
    educationFieldPreferred: "Business",
    city: "General Santos City",
    province: "South Cotabato",
    workSetup: "onsite",
    salaryMin: 15000,
    salaryMax: 25000,
  });

  const result = computeUtilityScore(seeker, vacancy);
  assert.ok(result.f3.raw >= 0.8, `Expected f3 >= 0.8, received ${result.f3.raw}`);
  assert.ok(result.f3.tags.includes("QPE_APPLIED"));
});

test("Required skill miss forces utility score to zero", () => {
  const seeker = deidentifyJobseeker({
    ...baseSeeker,
    other_skills: [{ name: "data entry", proficiency_level: "Intermediate", years: 2 }],
  });

  const vacancy = buildVacancyPayload({
    requiredSkills: [{ name: "react", years_min: 2, is_required: true }],
    preferredSkills: [],
    experienceMin: 1,
    experienceMax: 3,
    educationRequired: "high_school",
    city: "General Santos City",
    province: "South Cotabato",
    workSetup: "onsite",
    salaryMin: 15000,
    salaryMax: 18000,
  });

  const result = computeUtilityScore(seeker, vacancy);
  assert.strictEqual(result.utility_score, 0);
  assert.ok(result.constraint_violations.some((item) => item.includes("missing required skill")));
});

test("Identical inputs produce identical utility scores across runs", () => {
  const seeker = deidentifyJobseeker({
    ...baseSeeker,
    other_skills: [{ name: "customer service", proficiency_level: "Intermediate", years: 3 }],
  });

  const vacancy = buildVacancyPayload({
    requiredSkills: [{ name: "customer service", years_min: 1, is_required: true }],
    preferredSkills: [{ name: "communication", years_min: 1 }],
    experienceMin: 3,
    experienceMax: 5,
    educationRequired: "high_school",
    educationFieldPreferred: "Business",
    city: "General Santos City",
    province: "South Cotabato",
    workSetup: "onsite",
    salaryMin: 15000,
    salaryMax: 22000,
  });

  const first = computeUtilityScore(seeker, vacancy).utility_score;
  const second = computeUtilityScore(seeker, vacancy).utility_score;
  const third = computeUtilityScore(seeker, vacancy).utility_score;

  assert.strictEqual(first, second);
  assert.strictEqual(second, third);
});

test("Deidentify strips demographic fields", () => {
  const raw = {
    ...baseSeeker,
    gender: "Female",
    religion: "Catholic",
    civil_status: "Single",
    email: "test@example.com",
    phone: "09171234567",
    barangay: "Lagao",
  };

  const deidentified = deidentifyJobseeker(raw);

  assert.strictEqual((deidentified as unknown as Record<string, unknown>).gender, undefined);
  assert.strictEqual((deidentified as unknown as Record<string, unknown>).religion, undefined);
  assert.strictEqual((deidentified as unknown as Record<string, unknown>).civil_status, undefined);
  assert.ok(!JSON.stringify(deidentified).includes("Female"));
  assert.ok(!JSON.stringify(deidentified).includes("Catholic"));
  assert.ok(BLINDED_FIELDS.includes("gender"));
  assert.ok(BLINDED_FIELDS.includes("religion"));
});

test("Salary null on both sides returns 0.5", () => {
  const salary = computeSalary(null, null, null, null);
  assert.strictEqual(salary.raw, 0.5);
  assert.strictEqual(salary.weighted, 0.5);
});

test("Same city and same work setup score as 1.0", () => {
  const logistics = computeLogistics("same city", "same city", "onsite", "onsite");
  assert.strictEqual(logistics.raw, 1);
  assert.strictEqual(logistics.weighted, 1);
});

test("Semantic confidence downgrade reduces f1 contribution", () => {
  const result = {
    utility_score: 82,
    grade: "Strong",
    f1: { raw: 0.5, weighted: 0.5, tags: [], violations: [] },
    f2: { raw: 1, weighted: 1, tags: [], violations: [] },
    f3: { raw: 1, weighted: 1, tags: [], violations: [] },
    f4: { raw: 1, weighted: 1, tags: [], violations: [] },
    f5: { raw: 1, weighted: 1, tags: [], violations: [] },
    matched_skills: ["react"],
    skill_gaps: [],
    pending_semantic_review: [{ jobseeker_skill: "react js", vacancy_skill: "react", similarity: 0.9 }],
    constraint_violations: [],
  };

  const adjusted = applySemanticConfidenceAdjustments(
    result,
    [{ jobseeker_skill: "react js", vacancy_skill: "react", is_semantic_match: true, confidence: 0.5 }],
    0.75
  );

  assert.ok(adjusted.f1.weighted < result.f1.weighted);
  assert.ok(adjusted.utility_score < result.utility_score);
});
