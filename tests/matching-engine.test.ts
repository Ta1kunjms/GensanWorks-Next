import { test } from "node:test";
import assert from "node:assert";
import {
  buildVacancyPayload,
  computeUtilityScore,
  scoreCompleteness,
  computeMatchingCompleteness,
  AI_COMPATIBLE_COMPLETENESS_THRESHOLD,
  AI_COMPATIBLE_COMPLETENESS_THRESHOLD_PCT,
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

test("Utility score correctly computes weighted dimensions and ignores f4/f5", async () => {
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

  const result = await computeUtilityScore(seeker, vacancy);
  
  // utility score should include f1, f2, f3, f7, and f8 dimensions
  const expectedSum = result.f1.weighted + result.f2.weighted + result.f3.weighted + result.f7.weighted + result.f8.weighted;
  assert.strictEqual(result.utility_score, Math.round(expectedSum * 10000) / 100);
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

test("Title-relevance constraint caps score at 40 and assigns low confidence when title mismatch occurs for junior seeker", async () => {
  const lowTitleSeeker = deidentifyJobseeker({
    ...baseSeeker,
    other_skills: [{ name: "Pipe Fitting", proficiency_level: "Beginner", years: 1 }], // Condition 3: skills.length < 2 (1 skill)
    jobseeker_experience: [{ number_of_months: 12, position: "Cook", responsibilities: "Food prep" }], // Condition 2: experience_years < 2 (1 year)
    jobseeker_education: [{ level: "high_school", school_name: "Technical High School", course: "Plumbing" }],
    preferred_occupation_1: "Plumber", // Condition 1: title relevance < 0.45 for "Software Engineer"
  } as any);

  const vacancy = buildVacancyPayload({
    id: "job-software-eng",
    title: "Software Engineer",
    requiredSkills: [{ name: "JavaScript", years_min: 1, is_required: true }],
    preferredSkills: [],
    experienceMin: 3,
    experienceMax: 5,
    educationRequired: "bachelor",
    educationFieldPreferred: "Computer Science",
    city: "General Santos City",
    province: "South Cotabato",
    workSetup: "onsite",
    workType: "full-time",
    salaryMin: 30000,
    salaryMax: 45000,
    description: "Build web applications with TypeScript and React",
  } as any);

  const result = await computeUtilityScore(lowTitleSeeker, vacancy);

  // 1. utility_score <= 40
  assert.ok(result.utility_score <= 40, `utility_score should be <= 40, got ${result.utility_score}`);

  // 2. final_score <= 40
  assert.ok(result.final_score <= 40, `final_score should be <= 40, got ${result.final_score}`);

  // 3. confidence_band equals "low"
  assert.strictEqual(result.confidence_band, "low");

  // 4. grade is either "Weak" or "Fair" and never "Good", "Strong", or "Excellent"
  assert.ok(
    result.grade === "Weak" || result.grade === "Fair",
    `grade should be 'Weak' or 'Fair', got ${result.grade}`
  );
  assert.notStrictEqual(result.grade, "Good");
  assert.notStrictEqual(result.grade, "Strong");
  assert.notStrictEqual(result.grade, "Excellent");

  // 5. constraint_violations contains expected title/profile mismatch message
  assert.ok(
    result.constraint_violations.includes("Profile does not match job title or description."),
    "constraint_violations must contain title mismatch warning"
  );
});

test("computeMatchingCompleteness returns 100 for a Full Profile (10/10 matching fields)", () => {
  const fullRaw = {
    id: "full-seeker",
    city: "General Santos City",
    province: "South Cotabato",
    work_setup_preference: "onsite",
    expected_salary_min: 20000,
    other_skills: [{ name: "JavaScript", proficiency_level: "Advanced" }],
    jobseeker_experience: [{ number_of_months: 24, position: "Developer" }],
    jobseeker_education: [{ level: "college", school_name: "Mindanao State University" }],
    jobseeker_licenses: [{ professional_license: "CS Professional" }],
    jobseeker_languages: [{ language: "English" }],
    preferred_occupation_1: "Software Engineer",
    preference_full_time: true,
    preference_part_time: false,
    job_seeking_status: "actively_looking"
  };

  const fullSeeker = deidentifyJobseeker(fullRaw);
  const fullScore = scoreCompleteness(fullSeeker);
  assert.strictEqual(fullScore.raw, 1.0);
  assert.strictEqual(computeMatchingCompleteness(fullRaw), 100);
});

test("computeMatchingCompleteness returns 0 for an Empty Profile (0/10 matching fields)", () => {
  const emptyRaw = {
    id: "empty-seeker",
    city: null,
    province: null,
    work_setup_preference: null,
    expected_salary_min: null,
    other_skills: [],
    jobseeker_experience: [],
    jobseeker_education: [],
    jobseeker_licenses: [],
    jobseeker_languages: [],
    preferred_occupation_1: null,
    preference_full_time: null,
    preference_part_time: null,
    job_seeking_status: "unknown"
  };

  const emptySeeker = deidentifyJobseeker(emptyRaw);
  const emptyScore = scoreCompleteness(emptySeeker);
  assert.strictEqual(emptyScore.raw, 0.0);
  assert.strictEqual(computeMatchingCompleteness(emptyRaw), 0);
});

test("computeMatchingCompleteness returns 60 for Threshold Boundary Profile (6/10 matching fields)", () => {
  const boundaryRaw = {
    id: "boundary-seeker",
    city: "General Santos City", // 1. logistics_zone
    province: null,
    work_setup_preference: null,
    expected_salary_min: 12000, // 2. salary
    other_skills: [{ name: "Typing", proficiency_level: "Intermediate" }], // 3. skills
    jobseeker_experience: [{ number_of_months: 12, position: "Clerk" }], // 4. experience
    jobseeker_education: [{ level: "high_school" }], // 5. education
    jobseeker_licenses: [],
    jobseeker_languages: [],
    preferred_occupation_1: "Data Encoder", // 6. occupations
    preference_full_time: null,
    preference_part_time: null,
    job_seeking_status: "unknown"
  };

  const boundarySeeker = deidentifyJobseeker(boundaryRaw);
  const boundaryScore = scoreCompleteness(boundarySeeker);
  assert.strictEqual(boundaryScore.raw, 0.6);
  assert.strictEqual(boundaryScore.raw >= AI_COMPATIBLE_COMPLETENESS_THRESHOLD, true);
  assert.strictEqual(computeMatchingCompleteness(boundaryRaw), 60);
  assert.strictEqual(computeMatchingCompleteness(boundaryRaw) >= AI_COMPATIBLE_COMPLETENESS_THRESHOLD_PCT, true);
});

test("computeMatchingCompleteness is deterministic across multiple calls", () => {
  const sampleRaw = {
    other_skills: [{ name: "Typing", proficiency_level: "Intermediate" }],
    jobseeker_experience: [{ number_of_months: 12, position: "Clerk" }],
    jobseeker_education: [{ level: "high_school" }],
    preferred_occupation_1: "Data Encoder",
  };

  const firstCall = computeMatchingCompleteness(sampleRaw);
  const secondCall = computeMatchingCompleteness(sampleRaw);
  assert.strictEqual(firstCall, secondCall);
});

test("computeMatchingCompleteness is strictly independent from NSRP profile_completeness", () => {
  const nsrpProfile = {
    first_name: "Juan",
    last_name: "Dela Cruz",
    tin: "123-456-789",
    profile_completeness: 85,
    profile_complete: true,
    other_skills: [],
    jobseeker_experience: [],
    jobseeker_education: [],
    expected_salary_min: null,
    preferred_occupation_1: null,
    job_seeking_status: "unknown"
  };

  const matchingScore = computeMatchingCompleteness(nsrpProfile);
  assert.strictEqual(matchingScore, 0);
  assert.notStrictEqual(matchingScore, nsrpProfile.profile_completeness);
});


