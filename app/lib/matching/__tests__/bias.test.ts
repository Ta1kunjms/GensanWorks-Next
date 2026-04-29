import { test } from "node:test";
import assert from "node:assert";
import { deidentifyJobseeker, MATCHING_SYSTEM_PROMPT } from "../agent";

test("Task 6: Bias Verification", async (t) => {

  await t.test("Test 1 — Gender Neutrality", () => {
    const job = { employers: { city: "General Santos City" } };
    const seekerMale = { id: "1", sex: "Male", city: "General Santos City" };
    const seekerFemale = { id: "1", sex: "Female", city: "General Santos City" };

    const outputMale = deidentifyJobseeker(seekerMale, job);
    const outputFemale = deidentifyJobseeker(seekerFemale, job);

    // Verify sex/gender field is absent
    assert.strictEqual((outputMale as any).sex, undefined);
    assert.strictEqual((outputFemale as any).sex, undefined);
    
    // Verify results are identical regardless of original gender
    assert.deepStrictEqual(outputMale, outputFemale);
  });

  await t.test("Test 2 — School Prestige Neutrality", () => {
    const job = { employers: { industry: "Technology" } };
    const seekerA = { 
      jobseeker_education: [{ school_name: "Harvard University", course: "Computer Science" }] 
    };
    const seekerB = { 
      jobseeker_education: [{ school_name: "Cotabato City State Polytechnic College", course: "Information Systems" }] 
    };

    const outputA = deidentifyJobseeker(seekerA, job);
    const outputB = deidentifyJobseeker(seekerB, job);

    assert.strictEqual(outputA.school_category, "Private Institution");
    assert.strictEqual(outputB.school_category, "State University");
    assert.strictEqual(outputA.education_field, "Technology");
    assert.strictEqual(outputB.education_field, "Technology");
    
    // Raw names should not be present
    assert.ok(!JSON.stringify(outputA).includes("Harvard"));
    assert.ok(!JSON.stringify(outputB).includes("Cotabato"));
  });

  await t.test("Test 3 — Employment Gap Neutrality", () => {
    const job = { employers: { industry: "Business" } };
    // Candidate A: 3 years continuous
    const seekerA = {
      jobseeker_experience: [
        { position: "Manager", number_of_months: 36, start_date: "2020-01-01", end_date: "2023-01-01" }
      ]
    };
    // Candidate B: 3 years total with a gap
    const seekerB = {
      jobseeker_experience: [
        { position: "Manager", number_of_months: 18, start_date: "2018-01-01", end_date: "2019-06-01" },
        { position: "Manager", number_of_months: 18, start_date: "2021-01-01", end_date: "2022-06-01" }
      ]
    };

    const outputA = deidentifyJobseeker(seekerA, job);
    const outputB = deidentifyJobseeker(seekerB, job);

    assert.strictEqual(outputA.experience_years, 3.0);
    assert.strictEqual(outputB.experience_years, 3.0);
    
    // Dates should be stripped
    assert.strictEqual((outputA.work_history[0] as any).start_date, undefined);
    assert.strictEqual((outputB.work_history[0] as any).end_date, undefined);
  });

  await t.test("Test 4 — QPE Enforcement Instruction", () => {
    // Assert: the system prompt received by the LLM contains the QPE rule text
    assert.ok(MATCHING_SYSTEM_PROMPT.includes("QPE RULE — NON-NEGOTIABLE"));
    assert.ok(MATCHING_SYSTEM_PROMPT.includes("If experience_years >= 5"));
  });

  await t.test("Test 5 — Location Abstraction", () => {
    const job = { employers: { city: "General Santos City" } };
    const seeker = { barangay: "Lagao", city: "General Santos City" };

    const output = deidentifyJobseeker(seeker, job);

    assert.strictEqual(output.logistics_zone, "Same City");
    // Barangay and raw city should not be present in de-identified payload
    assert.ok(!JSON.stringify(output).includes("Lagao"));
    assert.ok(!JSON.stringify(output).includes("location_city")); // It was renamed to logistics_zone
  });
});
