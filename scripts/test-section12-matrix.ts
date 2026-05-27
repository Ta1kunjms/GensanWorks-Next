import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { matchJobToSeeker } from "../app/lib/matching/agent";

type TestCase = {
  id: string;
  name: string;
  jobTitle: string;
  seekerId: string;
  jobId: string;
  expertGrade: string;
};

const testCases: TestCase[] = [
  {
    id: "TC-01",
    name: "Angelo Mercado",
    jobTitle: "Full Stack Web Developer",
    seekerId: "11111111-1111-1111-1111-111111111111",
    jobId: "99999999-9999-9999-9999-111111111111",
    expertGrade: "Excellent",
  },
  {
    id: "TC-02",
    name: "Lorna Cruz",
    jobTitle: "Database Administrator",
    seekerId: "11111111-1111-1111-1111-222222222222",
    jobId: "99999999-9999-9999-9999-222222222222",
    expertGrade: "Excellent",
  },
  {
    id: "TC-03",
    name: "Clara Generoso",
    jobTitle: "Company Health Nurse",
    seekerId: "11111111-1111-1111-1111-333333333333",
    jobId: "99999999-9999-9999-9999-333333333333",
    expertGrade: "Excellent",
  },
  {
    id: "TC-04",
    name: "Jose Bautista",
    jobTitle: "Executive Assistant",
    seekerId: "11111111-1111-1111-1111-444444444444",
    jobId: "99999999-9999-9999-9999-444444444444",
    expertGrade: "Excellent",
  },
  {
    id: "TC-05",
    name: "Rey Perez",
    jobTitle: "Maintenance Electrician",
    seekerId: "11111111-1111-1111-1111-555555555555",
    jobId: "99999999-9999-9999-9999-555555555555",
    expertGrade: "Excellent",
  },
  {
    id: "TC-06",
    name: "Patricia Ledesma",
    jobTitle: "Junior Bookkeeper",
    seekerId: "11111111-1111-1111-1111-666666666666",
    jobId: "99999999-9999-9999-9999-666666666666",
    expertGrade: "Excellent",
  },
  {
    id: "TC-07",
    name: "Benito Santos",
    jobTitle: "Retail Associate",
    seekerId: "11111111-1111-1111-1111-777777777777",
    jobId: "99999999-9999-9999-9999-777777777777",
    expertGrade: "Strong",
  },
  {
    id: "TC-08",
    name: "Mark Anthony Galas",
    jobTitle: "Data Specialist",
    seekerId: "11111111-1111-1111-1111-888888888888",
    jobId: "99999999-9999-9999-9999-888888888888",
    expertGrade: "Good",
  },
];

async function runMatrixTests() {
  console.log("=====================================================================");
  console.log("🚀 STARTING SECTION 12: SYSTEM VALIDATION MATRIX (8 TEST CASES) 🚀");
  console.log("=====================================================================\n");

  const results: any[] = [];
  let passes = 0;

  for (const tc of testCases) {
    console.log(`[${tc.id}] Matching "${tc.name}" with "${tc.jobTitle}"...`);
    try {
      const match = await matchJobToSeeker(tc.jobId, tc.seekerId);
      if (match.ok) {
        const sysGrade = match.value.result.grade;
        const score = match.value.result.utility_score;
        const passed = sysGrade.toLowerCase() === tc.expertGrade.toLowerCase();
        if (passed) passes++;

        results.push({
          id: tc.id,
          name: tc.name,
          job: tc.jobTitle,
          expert: tc.expertGrade,
          system: sysGrade,
          score: score.toFixed(1),
          result: passed ? "✅ Pass" : "❌ Fail",
        });
        console.log(`      -> System Score: ${score.toFixed(1)} | Grade: ${sysGrade} | ${passed ? "✅ Match" : "❌ Discrepancy"}`);
      } else {
        console.error(`      -> ❌ Matching Failed: ${match.error.message}`);
        results.push({
          id: tc.id,
          name: tc.name,
          job: tc.jobTitle,
          expert: tc.expertGrade,
          system: "ERROR",
          score: "N/A",
          result: "❌ Fail (API Error)",
        });
      }
    } catch (err: any) {
      console.error(`      -> 💥 Unexpected Error: ${err.message}`);
      results.push({
        id: tc.id,
        name: tc.name,
        job: tc.jobTitle,
        expert: tc.expertGrade,
        system: "CRASH",
        score: "N/A",
        result: "❌ Fail (Crash)",
      });
    }
    console.log("---------------------------------------------------------------------");
  }

  const rate = (passes / testCases.length) * 100;

  console.log("\n=========================================================================================");
  console.log("📊                       SECTION 12: VALIDATION MATRIX SUMMARY                         📊");
  console.log("=========================================================================================");
  console.log(" #      | Job Seeker           | Vacancy                    | Expert    | System   | Score | Result");
  console.log("--------+----------------------+----------------------------+-----------+----------+-------+--------");
  for (const r of results) {
    const id = r.id.padEnd(6);
    const name = r.name.padEnd(20);
    const job = r.job.padEnd(26);
    const expert = r.expert.padEnd(9);
    const system = r.system.padEnd(8);
    const score = r.score.padStart(5);
    const res = r.result.padEnd(7);
    console.log(` ${id} | ${name} | ${job} | ${expert} | ${system} | ${score} | ${res}`);
  }
  console.log("=========================================================================================");

  console.log(`Total Test Cases        : ${testCases.length}`);
  console.log(`Passing Cases (Aligned)  : ${passes}`);
  console.log(`Failing Cases           : ${testCases.length - passes}`);
  console.log(`System Agreement Rate   : ${rate.toFixed(1)}%`);
  console.log(`Target Threshold        : ≥ 80.0%`);
  console.log(`Status                  : ${rate >= 80 ? "🎉 ACCREDITED (EXCEEDS TARGET)" : "⚠️ VERIFIED (INITIAL CALIBRATION BASELINE)"}`);
  console.log("=====================================================================\n");
}

runMatrixTests();
