// Offline unit tests for the public labour-market aggregation used by the landing page
// (app/lib/labor-market.ts, served by app/api/public/labor-market/route.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  aggregateVacanciesBySector,
  buildLaborMarket,
  carouselEmployers,
  computeSkillDemandSupply,
  computeSkillGaps,
  computeSuccessRates,
  employersHiringNow,
  hiringByCity,
  industryLabel,
  jobseekerSkillKeys,
  latestJobs,
  median,
  monthlyPay,
  normalizeVacancies,
  percentChange,
  percentRate,
  placementFunnel,
  safeLogoUrl,
  salaryBySector,
  salaryOverall,
  sectorForIndustryCode,
  splitSkillList,
  workArrangement,
  type OpenJobRow,
} from "../app/lib/labor-market";

describe("sector mapping", () => {
  it("maps the first SRS code to its label", () => {
    assert.deepEqual(sectorForIndustryCode("07"), { code: "07", sector: "Wholesale and Retail Trade" });
    assert.deepEqual(sectorForIndustryCode("06,08"), { code: "06", sector: "Construction" });
    assert.deepEqual(sectorForIndustryCode('["13","14"]'), { code: "13", sector: "Education" });
    assert.deepEqual(sectorForIndustryCode(["14", "13"]), { code: "14", sector: "Health and Social Work" });
    assert.deepEqual(sectorForIndustryCode("4"), { code: "04", sector: "Manufacturing" });
  });

  it("accepts a sector label and sends unknown values to Other", () => {
    assert.deepEqual(sectorForIndustryCode("construction"), { code: "06", sector: "Construction" });
    for (const value of [null, undefined, "", "99", "Space mining", {}, []]) {
      assert.deepEqual(sectorForIndustryCode(value), { code: "other", sector: "Other" });
    }
  });

  it("aggregates jobs and vacancies by sector, largest first", () => {
    const rows = aggregateVacanciesBySector([
      { industry_code: "06", vacancies: 2 },
      { industry_code: "08", vacancies: 5 },
      { industry_code: "06", vacancies: 1 },
      { industry_code: null, vacancies: null },
    ]);
    assert.deepEqual(rows, [
      { code: "08", sector: "Hotels and Restaurant", jobs: 1, vacancies: 5 },
      { code: "06", sector: "Construction", jobs: 2, vacancies: 3 },
      { code: "other", sector: "Other", jobs: 1, vacancies: 1 },
    ]);
  });

  it("industryLabel maps codes and keeps free text", () => {
    assert.equal(industryLabel("13"), "Education");
    assert.equal(industryLabel("Retail"), "Retail");
    assert.equal(industryLabel("  "), null);
    assert.equal(industryLabel("99"), null);
  });

  it("normalizeVacancies uses the column default for missing values", () => {
    assert.equal(normalizeVacancies(null), 1);
    assert.equal(normalizeVacancies("3"), 3);
    assert.equal(normalizeVacancies(-2), 0);
    assert.equal(normalizeVacancies("abc"), 0);
  });
});

describe("skills", () => {
  it("splits on commas and semicolons", () => {
    assert.deepEqual(splitSkillList(" Welding; Driving ,, Cooking "), ["Welding", "Driving", "Cooking"]);
    assert.deepEqual(splitSkillList(null), []);
  });

  it("collects jobseeker skill keys from checkboxes, typed skills and trainings", () => {
    const keys = jobseekerSkillKeys(
      { other_skills: ["Driving", "Others", { name: "Cooking" }, 5], other_skills_others: "Welding , Excel" },
      ["Bookkeeping, customer service", null]
    );
    assert.deepEqual([...keys].sort(), ["bookkeeping", "cooking", "customer service", "driving", "excel", "welding"]);
  });

  it("demand sums vacancies, supply counts jobseekers, matching is case-insensitive", () => {
    const rows = computeSkillDemandSupply(
      [
        { main_skill_desired: "Welding, Driving", vacancies: 3 },
        { main_skill_desired: "welding; welding", vacancies: 2 },
        { main_skill_desired: "Cooking", vacancies: null },
      ],
      [new Set(["welding"]), new Set(["driving", "welding"]), new Set(["baking"])]
    );
    assert.deepEqual(rows, [
      { skill: "Welding", demand: 5, jobs: 2, supply: 2 },
      { skill: "Driving", demand: 3, jobs: 1, supply: 1 },
      { skill: "Cooking", demand: 1, jobs: 1, supply: 0 },
    ]);
  });

  it("gaps keep positive demand minus supply, largest first", () => {
    const gaps = computeSkillGaps([
      { skill: "A", demand: 5, supply: 2 },
      { skill: "B", demand: 3, supply: 3 },
      { skill: "C", demand: 1, supply: 4 },
      { skill: "D", demand: 9, supply: 1 },
    ]);
    assert.deepEqual(gaps, [
      { skill: "D", demand: 9, supply: 1, gap: 8 },
      { skill: "A", demand: 5, supply: 2, gap: 3 },
    ]);
  });
});

describe("rates and outcomes", () => {
  it("percentRate returns null for a zero denominator", () => {
    assert.equal(percentRate(0, 0), null);
    assert.equal(percentRate(1, 3), 33.3);
    assert.equal(percentRate(2, 2), 100);
  });

  it("success rates use referral Hired spellings and application status hired", () => {
    const rates = computeSuccessRates(
      [{ status: "hired" }, { status: "rejected" }, { status: "interview" }, { status: "HIRED" }],
      [{ status: "hired" }, { status: "Hired" }, { status: "referred" }, { status: "interview" }]
    );
    assert.deepEqual(rates, {
      placementRate: 50,
      referrals: 4,
      hiredReferrals: 2,
      applicationSuccessRate: 50,
      applications: 4,
      hiredApplications: 2,
    });
  });

  it("success rates are null, not 0, with no applications or referrals", () => {
    const rates = computeSuccessRates([], []);
    assert.equal(rates.placementRate, null);
    assert.equal(rates.applicationSuccessRate, null);
    assert.equal(rates.referrals, 0);
    assert.equal(rates.applications, 0);
  });

  it("funnel de-duplicates interview and hired per jobseeker and job", () => {
    const funnel = placementFunnel(
      [
        { jobseeker_id: "s1", job_id: "j1", status: "interview" },
        { jobseeker_id: "s2", job_id: "j1", status: "hired" },
        { jobseeker_id: "s3", job_id: "j2", status: "pending" },
      ],
      [
        { jobseeker_id: "s1", job_id: "j1", status: "For Interview" },
        { jobseeker_id: "s2", job_id: "j1", status: "Hired" },
        { jobseeker_id: "s4", job_id: "j3", status: "hired" },
      ]
    );
    assert.deepEqual(funnel, { applications: 3, referrals: 3, interview: 1, hired: 2 });
  });

  it("funnel is all zeros with no data", () => {
    assert.deepEqual(placementFunnel([], []), { applications: 0, referrals: 0, interview: 0, hired: 0 });
  });
});

describe("salary by sector", () => {
  it("uses the midpoint and converts daily rates at 26 working days", () => {
    assert.equal(monthlyPay({ salary_min: 10000, salary_max: 20000, salary_period: "monthly" }), 15000);
    assert.equal(monthlyPay({ salary_min: 500, salary_max: 500, salary_period: "daily" }), 13000);
    assert.equal(monthlyPay({ salary_min: 600, salary_max: null, salary_period: "Daily" }), 15600);
    assert.equal(monthlyPay({ salary_min: 12000, salary_max: null, salary_period: null }), 12000);
    assert.equal(monthlyPay({ salary_min: null, salary_max: 0, salary_period: "monthly" }), null);
    assert.equal(monthlyPay({ salary_min: 100, salary_max: 100, salary_period: "per project" }), null);
  });

  it("median handles odd, even and empty lists", () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(median([]), null);
  });

  it("reports n and a null median for sectors without salaries", () => {
    const rows = salaryBySector([
      { industry_code: "06", salary_min: 10000, salary_max: 14000, salary_period: "monthly" },
      { industry_code: "06", salary_min: 500, salary_max: 500, salary_period: "daily" },
      { industry_code: "06", salary_min: 20000, salary_max: 20000, salary_period: "monthly" },
      { industry_code: "13", salary_min: null, salary_max: null, salary_period: "monthly" },
    ]);
    assert.deepEqual(rows, [
      { code: "06", sector: "Construction", medianMonthly: 13000, n: 3 },
      { code: "13", sector: "Education", medianMonthly: null, n: 0 },
    ]);
  });
});

describe("work arrangement and city", () => {
  it("counts setups and types with fixed buckets", () => {
    const result = workArrangement([
      { work_setup: "onsite", work_type: "Full-time", vacancies: 2 },
      { work_setup: "Remote", work_type: "Part-time", vacancies: 1 },
      { work_setup: "on-site", work_type: null, vacancies: 3 },
    ]);
    assert.deepEqual(result.setup, [
      { key: "onsite", label: "On-site", jobs: 2, vacancies: 5 },
      { key: "hybrid", label: "Hybrid", jobs: 0, vacancies: 0 },
      { key: "remote", label: "Remote", jobs: 1, vacancies: 1 },
    ]);
    assert.deepEqual(result.type, [
      { key: "full-time", label: "Full-time", jobs: 1, vacancies: 2 },
      { key: "part-time", label: "Part-time", jobs: 1, vacancies: 1 },
      { key: "unspecified", label: "Not specified", jobs: 1, vacancies: 3 },
    ]);
  });

  it("groups by employer city case-insensitively", () => {
    const rows = hiringByCity([
      { employers: { city: "General Santos City" }, vacancies: 2 },
      { employers: [{ city: "general santos city" }], vacancies: 1 },
      { employers: { city: "Koronadal" }, vacancies: 5 },
      { employers: null, vacancies: 1 },
    ]);
    assert.deepEqual(rows, [
      { city: "Koronadal", jobs: 1, vacancies: 5 },
      { city: "General Santos City", jobs: 2, vacancies: 3 },
      { city: "Not specified", jobs: 1, vacancies: 1 },
    ]);
  });
});

describe("listings", () => {
  const jobs: OpenJobRow[] = [
    { id: "a", employer_id: "e1", position_title: "Cook", industry_code: "08", vacancies: 2, work_setup: "onsite", published_at: "2026-10-01T00:00:00Z", employers: { establishment_name: "Tuna Grill", city: "GenSan" } },
    { id: "b", employer_id: "e2", position_title: "Welder", industry_code: "06", vacancies: 4, work_setup: "hybrid", published_at: null, created_at: "2026-10-05T00:00:00Z", employers: { establishment_name: "Steel Co", city: null } },
    { id: "c", employer_id: "e1", position_title: " ", industry_code: null, vacancies: 1, work_setup: null, published_at: "2026-09-01T00:00:00Z" },
  ];

  it("latest jobs are newest first with public fields only", () => {
    const rows = latestJobs(jobs, 2);
    assert.deepEqual(rows, [
      { id: "b", title: "Welder", employer: "Steel Co", sector: "Construction", city: null, workSetup: "Hybrid", postedAt: "2026-10-05T00:00:00Z" },
      { id: "a", title: "Cook", employer: "Tuna Grill", sector: "Hotels and Restaurant", city: "GenSan", workSetup: "On-site", postedAt: "2026-10-01T00:00:00Z" },
    ]);
    assert.equal(latestJobs(jobs)[2]?.title, "Untitled position");
  });

  it("employers hiring now ranks approved employers by open vacancies", () => {
    const rows = employersHiringNow(jobs, [
      { id: "e1", establishment_name: "Tuna Grill", industry: "08", city: "GenSan" },
      { id: "e2", establishment_name: "Steel Co", industry: "Construction", city: null },
      { id: "e3", establishment_name: "No Jobs Inc", industry: null, city: null },
    ]);
    assert.deepEqual(rows, [
      { name: "Steel Co", industry: "Construction", city: null, openJobs: 1, openVacancies: 4 },
      { name: "Tuna Grill", industry: "Hotels and Restaurant", city: "GenSan", openJobs: 2, openVacancies: 3 },
    ]);
  });

  it("carousel employers are sorted by name and only keep https logos", () => {
    const rows = carouselEmployers([
      { id: "2", establishment_name: "Zeta Foods", industry: null, city: "GenSan", profile_image: "javascript:alert(1)" },
      { id: "1", establishment_name: "Alpha Builders", industry: "06", city: null, profile_image: "https://x.supabase.co/logo.png" },
      { id: "3", establishment_name: "  ", industry: null, city: null, profile_image: null },
    ]);
    assert.deepEqual(rows, [
      { id: "1", name: "Alpha Builders", industry: "Construction", city: null, logo: "https://x.supabase.co/logo.png" },
      { id: "2", name: "Zeta Foods", industry: null, city: "GenSan", logo: null },
    ]);
    assert.equal(safeLogoUrl("http://insecure.example/logo.png"), null);
  });
});

describe("overall salary and sign-up change (live hero look 2026-10-27)", () => {
  it("overall median uses the same conversion as salaryBySector and skips posts without salary", () => {
    assert.deepEqual(
      salaryOverall([
        { salary_min: 10000, salary_max: 14000, salary_period: "monthly" },
        { salary_min: 500, salary_max: 500, salary_period: "daily" },
        { salary_min: 20000, salary_max: 20000, salary_period: "monthly" },
        { salary_min: 18000, salary_max: 22000, salary_period: null },
        { salary_min: null, salary_max: null, salary_period: "monthly" },
        { salary_min: 100, salary_max: 100, salary_period: "per project" },
      ]),
      { medianMonthly: 16500, n: 4 }
    );
    assert.deepEqual(salaryOverall([]), { medianMonthly: null, n: 0 });
  });

  it("percent change is null without a previous figure and never invented", () => {
    assert.equal(percentChange(5, 0), null);
    assert.equal(percentChange(0, 0), null);
    assert.equal(percentChange(15, 10), 50);
    assert.equal(percentChange(5, 10), -50);
    assert.equal(percentChange(1, 3), -66.7);
  });

  it("buildLaborMarket reports sign-ups for the last two 30-day windows and their real change", () => {
    const base = { activeJobseekers: 30, employers: [], openJobs: [], jobseekerSkills: [], applications: [], referrals: [] };
    const result = buildLaborMarket({ ...base, jobseekersNewThisMonth: 12, jobseekersPrev30: 8 });
    assert.equal(result.jobseekersNewThisMonth, 12);
    assert.equal(result.jobseekersPrev30, 8);
    assert.equal(result.jobseekersNewChangePct, 50);
    assert.equal(buildLaborMarket({ ...base, jobseekersNewThisMonth: 4, jobseekersPrev30: 0 }).jobseekersNewChangePct, null);
  });
});

describe("buildLaborMarket", () => {
  it("assembles totals and every block, and returns no jobseeker identifiers", () => {
    const result = buildLaborMarket({
      activeJobseekers: 12,
      employers: [{ id: "e1", establishment_name: "Tuna Grill", industry: "08", city: "GenSan", profile_image: null }],
      openJobs: [
        { id: "j1", employer_id: "e1", position_title: "Cook", industry_code: "08", main_skill_desired: "Cooking", vacancies: 3, employers: { establishment_name: "Tuna Grill", city: "GenSan" } },
      ],
      jobseekerSkills: [new Set(["cooking"])],
      applications: [{ jobseeker_id: "secret-seeker-id", job_id: "j1", status: "hired" }],
      referrals: [],
      now: new Date("2026-10-23T00:00:00Z"),
    });
    assert.deepEqual(result.totals, { jobseekers: 12, employers: 1, openJobs: 1, openVacancies: 3 });
    assert.deepEqual(result.skills, [{ skill: "Cooking", demand: 3, jobs: 1, supply: 1 }]);
    assert.deepEqual(result.skillGaps, [{ skill: "Cooking", demand: 3, supply: 1, gap: 2 }]);
    assert.equal(result.successRates.placementRate, null);
    assert.equal(result.successRates.applicationSuccessRate, 100);
    assert.equal(result.asOf, "2026-10-23T00:00:00.000Z");
    assert.deepEqual(result.salaryOverall, { medianMonthly: null, n: 0 });
    assert.equal(result.jobseekersNewThisMonth, 0);
    assert.equal(result.jobseekersPrev30, 0);
    assert.equal(result.jobseekersNewChangePct, null);
    assert.ok(!JSON.stringify(result).includes("secret-seeker-id"));
  });

  it("skill gaps are ranked across all demanded skills, not only the top 10", () => {
    const openJobs: OpenJobRow[] = Array.from({ length: 12 }, (_, index) => ({
      id: `j${index}`,
      main_skill_desired: `Skill ${String(index).padStart(2, "0")}`,
      vacancies: 20 - index,
    }));
    const covered = openJobs.slice(0, 10).map((job) => (job.main_skill_desired ?? "").toLowerCase());
    const jobseekerSkills = Array.from({ length: 25 }, () => new Set(covered));
    const result = buildLaborMarket({ activeJobseekers: 25, employers: [], openJobs, jobseekerSkills, applications: [], referrals: [] });
    assert.equal(result.skills.length, 10);
    assert.deepEqual(result.skillGaps.map((row) => row.skill), ["Skill 10", "Skill 11"]);
  });
});

describe("public labor-market route", () => {
  const src = readFileSync(path.join(process.cwd(), "app/api/public/labor-market/route.ts"), "utf8");

  it("is rate limited, cached as public aggregate data and pages past 1000 rows", () => {
    assert.match(src, /enforceRateLimit\(/);
    assert.match(src, /"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"/);
    assert.match(src, /PAGE_SIZE = 1000/);
    assert.match(src, /\.range\(from, to\)/);
  });

  it("selects no jobseeker personal fields and returns a generic error", () => {
    const jobseekerSelects = src.match(/from\("jobseekers"\)[\s\S]*?\.select\("([^"]*)"/g) ?? [];
    assert.ok(jobseekerSelects.length >= 4);
    // Sign-up windows are head-only counts; no jobseeker rows are read for them.
    assert.match(src, /\.gte\("created_at", since30\)/);
    assert.match(src, /\.lt\("created_at", since30\)/);
    for (const select of jobseekerSelects) {
      assert.doesNotMatch(select, /first_name|last_name|email|phone|birth|gender|address/);
    }
    assert.doesNotMatch(src, /from\("employers"\)[\s\S]{0,80}\.select\("[^"]*(email|phone|tin|tax)/i);
    assert.match(src, /status: 500/);
    assert.match(src, /Labour-market data is unavailable right now\./);
  });
});
