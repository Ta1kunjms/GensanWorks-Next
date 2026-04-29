import { test } from "node:test";
import assert from "node:assert";
import {
  buildVacancyPayload,
  computeUtilityScore,
} from "@/lib/matching/scoring-engine";
import { deidentifyJobseeker, BLINDED_FIELDS } from "@/lib/matching/deidentify";

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
  skills: [],
  certifications: [],
  languages: [],
  preferred_locations: [],
  preferred_occupations: ["customer service"],
  work_history: [],
  experience_years: 5,
  education_level: "high_school",
  job_seeking_status: "active",
  work_type_preference: "full-time",
  logistics_zone: "zone_1"
};

test("Utility score correctly ignores f4 (logistics) and f5 (salary) dimensions", () => {
  const seeker = deidentifyJobseeker(baseSeeker);

  const vacancy = buildVacancyPayload({
    id: "job-1",
    requiredSkills: [{ name: "customer service", years_min: 1, is_required: true }],
    preferredSkills: [],
    experienceMin: 3,
    experienceMax: 5,
    educationRequired: "high_school",
    educationFieldPreferred: "Business",
    city: "Manila",
    province: "Metro Manila",
    workSetup: "remote",
    workType: "full-time",
    salaryMin: 50000,
    salaryMax: 60000,
    description: "Mock job description"
  } as any);

  const result = computeUtilityScore(seeker, vacancy);
  
  // f4 and f5 should be computed internally but their weights should be 0
  assert.strictEqual(result.f4.weighted, 0);
  assert.strictEqual(result.f5.weighted, 0);
  
  // utility score should only be the sum of f1, f2, f3, and f6 weights
  const expectedSum = result.f1.weighted + result.f2.weighted + result.f3.weighted + result.f6_completeness.weighted;
  assert.strictEqual(result.utility_score, Math.round(expectedSum * 100));
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
