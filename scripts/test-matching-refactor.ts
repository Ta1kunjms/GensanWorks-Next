import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { matchJobToSeeker } from "../app/lib/matching/agent";

async function testRefactor() {
  const jobseekerId = "d17239ff-ad51-488e-8bb5-dec368f9f5af";
  const jobId = "4f277162-8d37-479d-a4ce-f2dad13b7fdf";

  console.log("--- Starting AI Matching Refactor Test ---");
  
  try {
    const result = await matchJobToSeeker(jobId, jobseekerId);

    if (result.ok) {
      console.log("\n✅ Matching Succeeded!");
      console.log("Utility Score:", result.value.result.utility_score);
      console.log("Grade:", result.value.result.grade);
      console.log("\n--- AI Narrative ---");
      console.log("Headline:", result.value.result.headline);
      console.log("Summary:", result.value.result.summary);
      console.log("Strengths:", result.value.result.strengths);
      console.log("Concerns:", result.value.result.concerns || result.value.result.gaps);
      console.log("Logistics Note:", result.value.result.logistics_note);
      console.log("Salary Note:", result.value.result.salary_note);
      console.log("Recommendation:", result.value.result.recommendation);
      
      console.log("\n--- Dimension Breakdown ---");
      console.log("f1 (Skills):", result.value.result.f1.raw);
      console.log("f2 (Experience):", result.value.result.f2.raw);
      console.log("f3 (Education):", result.value.result.f3.raw);
      console.log("f4 (Logistics):", result.value.result.f4.raw);
      console.log("f5 (Salary):", result.value.result.f5.raw);
      
      process.exit(0);
    } else {
      console.error("\n❌ Matching Failed!");
      console.error("Error Code:", result.error.code);
      console.error("Message:", result.error.message);
      console.error("Details:", result.error.details);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 Unexpected Error:", error);
    process.exit(1);
  }
}

testRefactor();
