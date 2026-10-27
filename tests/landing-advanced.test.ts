// Landing page "advanced" round 1 (2026-10-27): Server Component + 5-minute cache,
// hero paths / snapshot / quick search, Labour Market Snapshot hub (tabs, sortable
// tables, key findings, CSV) and the lazy showreel. Static source checks plus
// pure-function tests on app/lib/labor-market.ts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCsv,
  buildInsightTables,
  buildLaborMarket,
  csvCell,
  csvFileName,
  formatUpdatedAt,
  isStaleAsOf,
  keyFindings,
  quickSearchTerms,
  sortInsightRows,
  type LaborMarketResponse,
  type OpenJobRow,
} from "../app/lib/labor-market";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
const HOME = "app/components/homepage";
const PAGE = read("app/page.tsx");
const HERO = read(`${HOME}/hero-section.tsx`);
const HUB = read(`${HOME}/labour-market-insights-section.tsx`);
const VIDEO = read(`${HOME}/video-section.tsx`);
const SERVER = read("app/lib/labor-market-server.ts");

function sampleMarket(): LaborMarketResponse {
  const job = (id: string, extra: Partial<OpenJobRow>): OpenJobRow => ({ id, ...extra });
  const openJobs: OpenJobRow[] = [
    job("1", { industry_code: "01", vacancies: 120, main_skill_desired: "Sanitation", salary_min: 500, salary_period: "daily", work_setup: "onsite", work_type: "Full-time", employers: { establishment_name: "Farm A", city: "General Santos City" } }),
    job("2", { industry_code: "01", vacancies: 48, main_skill_desired: "Sanitation, Driving", salary_min: 15000, salary_max: 17000, work_setup: "onsite", work_type: "Full-time", employers: { establishment_name: "Farm B", city: "General Santos City" } }),
    job("3", { industry_code: "07", vacancies: 10, main_skill_desired: "Customer Service", salary_min: 20000, salary_max: 30000, work_setup: "hybrid", work_type: "Part-time", employers: { establishment_name: "Shop C", city: "Polomolok" } }),
  ];
  const jobseekerSkills = [new Set(["sanitation", "customer service"]), new Set(["customer service"]), new Set(["driving"])];
  return buildLaborMarket({
    activeJobseekers: 3,
    employers: [],
    openJobs,
    jobseekerSkills,
    applications: [],
    referrals: [],
    now: new Date("2026-10-27T07:05:00.000Z"),
  });
}

describe("landing page is a cached Server Component", () => {
  it("app/page.tsx has no \"use client\" and revalidates every 300 seconds", () => {
    assert.doesNotMatch(PAGE, /["']use client["']/);
    assert.match(PAGE, /export const revalidate = 300;/);
    assert.match(PAGE, /export default async function Landing\(\)/);
    assert.match(SERVER, /import "server-only";/);
    assert.match(SERVER, /export const LANDING_REVALIDATE_SECONDS = 300;/);
    assert.match(SERVER, /unstable_cache\(loadLaborMarket, \["landing-labor-market"\], \{\n\s+revalidate: LANDING_REVALIDATE_SECONDS,/);
  });

  it("a data failure yields null (rendered as \"—\"), not invented numbers", () => {
    assert.match(SERVER, /export async function getLaborMarketData\(\): Promise<LaborMarketResponse \| null>/);
    assert.match(SERVER, /return null;/);
    assert.match(PAGE, /const failed = market === null;/);
  });

  it("the page no longer fetches landing data in the browser", () => {
    assert.doesNotMatch(PAGE, /useQuery|fetch\(/);
  });
});

describe("hero", () => {
  it("path cards link only to existing routes", () => {
    const hrefs = Array.from(HERO.matchAll(/href: "([^"]+)"/g)).map((match) => match[1]);
    assert.deepEqual(hrefs, ["/jobs", "/signup/jobseeker", "/employer/jobs", "/signup/employer", "/login/admin"]);
    for (const route of ["app/signup/jobseeker", "app/signup/employer", "app/login/admin", "app/employer/jobs"]) {
      assert.ok(existsSync(path.join(process.cwd(), route, "page.tsx")), route);
    }
    // /jobs is a redirect to the jobseeker job list.
    assert.match(read("next.config.ts"), /source: "\/jobs",\s*\n\s*destination: "\/jobseeker\/jobs"/);
    assert.match(HERO, /I am a…/);
  });

  it("keeps the Browse Jobs CTA and the sign-in note", () => {
    assert.match(PAGE, /primaryCTA: "Browse Jobs"/);
    assert.match(HERO, /<Link href="\/jobs">\n\s+\{generalSettings\.primaryCTA\}/);
    assert.match(HERO, /Sign in or register as a jobseeker to see results\./);
  });

  it("snapshot is labelled with its update time and flags stale data", () => {
    assert.match(HERO, /Updated <time dateTime=\{market\?\.asOf\}>/);
    assert.match(HERO, /\{updatedAt \? "Live snapshot" : "Snapshot"\}/);
    assert.match(HERO, /isStaleAsOf\(market\?\.asOf, Date\.now\(\)\)/);
    for (const field of ["jobseekers", "employers", "openJobs", "openVacancies"]) assert.match(HERO, new RegExp(`totals\\?\\.${field}`));
  });

  it("quick-search chips use real terms and link to /jobs?search=", () => {
    assert.match(HERO, /quickSearchTerms\(market, 4\)/);
    assert.match(HERO, /href=\{`\/jobs\?search=\$\{encodeURIComponent\(term\)\}`\}/);
    const terms = quickSearchTerms(sampleMarket(), 4);
    assert.deepEqual(terms.sectors, ["Agriculture", "Wholesale and Retail Trade"]);
    assert.deepEqual(terms.cities, ["General Santos City", "Polomolok"]);
    assert.deepEqual(quickSearchTerms(null), { sectors: [], cities: [] });
  });
});

describe("Labour Market Snapshot hub", () => {
  it("uses accessible tabs with arrow-key navigation", () => {
    assert.match(HUB, /id="labour-market"/);
    assert.match(HUB, /role="tablist"/);
    assert.match(HUB, /role="tab"/);
    assert.match(HUB, /role="tabpanel"/);
    assert.match(HUB, /aria-selected=\{selected\}/);
    assert.match(HUB, /aria-controls=\{`lm-panel-\$\{table\.id\}`\}/);
    assert.match(HUB, /aria-labelledby=\{`lm-tab-\$\{table\.id\}`\}/);
    assert.match(HUB, /tabIndex=\{selected \? 0 : -1\}/);
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.match(HUB, new RegExp(`"${key}"`));
  });

  it("tables have sortable headers with aria-sort, a toggle and a CSV download", () => {
    assert.match(HUB, /aria-sort=\{ariaSort\}/);
    assert.match(HUB, /"none"/);
    assert.match(HUB, /<Button\n\s+type="button"\n\s+variant="ghost"\n\s+size="sm"\n\s+onClick=\{\(\) => onSort\(column\.key\)\}/);
    assert.match(HUB, /aria-expanded=\{showTable\}/);
    assert.match(HUB, /Download data \(CSV\)/);
    assert.match(HUB, /csvFileName\(table\.id, new Date\(\)\)/);
  });

  it("has six tabs built from the aggregates, each with a summary", () => {
    const tables = buildInsightTables(sampleMarket());
    assert.deepEqual(tables.map((table) => table.label), ["Sectors", "Skills vs Supply", "Skill Gaps", "Salaries", "Work Setup", "Cities"]);
    for (const table of tables) assert.ok(table.summary.length > 0, table.id);
    const sectors = tables[0]!;
    assert.deepEqual(sectors.rows.map((row) => row.vacancies), [168, 10]);
    const empty = buildInsightTables(null);
    assert.equal(empty.length, 6);
    for (const table of empty) assert.equal(table.rows.filter((row) => Number(row.jobs ?? 0) > 0).length, 0);
  });

  it("About this data states sources, refresh, definitions and no personal data", () => {
    assert.match(HUB, /<summary[^>]*>[\s\S]*?About this data\n\s+<\/summary>/);
    assert.match(HUB, /Figures refresh every 5 minutes\./);
    assert.match(HUB, /Referrals marked hired ÷ all referrals\./);
    assert.match(HUB, /Applications marked hired ÷ all applications\./);
    assert.match(HUB, /Totals only — no personal data is shown\./);
    assert.match(HUB, /Active jobseekers who gave consent, are looking for work, and list the skill\./);
  });
});

describe("key findings", () => {
  it("are deterministic sentences from the data", () => {
    const findings = keyFindings(sampleMarket());
    assert.ok(findings.length >= 3 && findings.length <= 5);
    assert.equal(findings[0], "Agriculture has the most open vacancies (168).");
    assert.ok(findings.includes("The largest skill gap is Sanitation: 168 vacancies need it; 1 jobseeker lists it."), findings.join(" | "));
    assert.ok(findings.includes("Median monthly pay is highest in Wholesale and Retail Trade (₱25,000, 1 post)."), findings.join(" | "));
    assert.ok(findings.includes("On-site is the most common work setup (2 of 3 open posts)."), findings.join(" | "));
    assert.deepEqual(keyFindings(sampleMarket()), findings);
  });

  it("are empty for missing or empty data", () => {
    assert.deepEqual(keyFindings(null), []);
    const empty = buildLaborMarket({ activeJobseekers: 0, employers: [], openJobs: [], jobseekerSkills: [], applications: [], referrals: [] });
    assert.deepEqual(keyFindings(empty), []);
  });

  it("do not use AI wording", () => {
    assert.doesNotMatch(HUB, /AI-generated insight|AI-powered|guaranteed|unbiased|accurate/i);
  });
});

describe("CSV and table helpers", () => {
  it("escapes commas, quotes and line breaks and neutralises formulas", () => {
    assert.equal(csvCell("Agriculture, Hunting"), '"Agriculture, Hunting"');
    assert.equal(csvCell('Say "hi"'), '"Say ""hi"""');
    assert.equal(csvCell("Line\nbreak"), '"Line\nbreak"');
    assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(1234), "1234");
    const csv = buildCsv([{ key: "a", label: "Name, full" }, { key: "b", label: "Count" }], [{ a: 'x"y', b: 2 }]);
    assert.equal(csv, '"Name, full",Count\r\n"x""y",2\r\n');
  });

  it("names files gensanworks-labour-market-<tab>-<date>.csv", () => {
    assert.equal(csvFileName("skills", new Date("2026-10-27T10:00:00Z")), "gensanworks-labour-market-skills-2026-10-27.csv");
  });

  it("sorts numbers and text, with empty cells last", () => {
    const rows = [{ k: "b", n: 2 }, { k: "a", n: null }, { k: "c", n: 5 }];
    assert.deepEqual(sortInsightRows(rows, "n", "descending").map((row) => row.k), ["c", "b", "a"]);
    assert.deepEqual(sortInsightRows(rows, "n", "ascending").map((row) => row.k), ["b", "c", "a"]);
    assert.deepEqual(sortInsightRows(rows, "k", "ascending").map((row) => row.k), ["a", "b", "c"]);
  });

  it("formats the update time in Philippine time and flags data older than an hour", () => {
    assert.equal(formatUpdatedAt("2026-10-27T07:05:00.000Z"), "27 Oct 2026, 3:05 PM");
    assert.equal(formatUpdatedAt("2026-10-26T16:00:00.000Z"), "27 Oct 2026, 12:00 AM");
    assert.equal(formatUpdatedAt("not a date"), null);
    const asOf = "2026-10-27T07:00:00.000Z";
    assert.equal(isStaleAsOf(asOf, Date.parse("2026-10-27T07:59:00.000Z")), false);
    assert.equal(isStaleAsOf(asOf, Date.parse("2026-10-27T08:01:00.000Z")), true);
    assert.equal(isStaleAsOf(null, Date.now()), false);
  });
});

describe("lazy showreel", () => {
  it("mounts the video on scroll with preload=none, a poster and a play button", () => {
    assert.match(VIDEO, /new IntersectionObserver\(/);
    assert.match(VIDEO, /preload="none"/);
    assert.match(VIDEO, /poster=\{SHOWREEL_POSTER\}/);
    assert.match(VIDEO, /Play video/);
    assert.match(VIDEO, /playsInline/);
    assert.doesNotMatch(VIDEO, /autoPlay|autoplay/);
    assert.match(VIDEO, /add a <track kind="captions">/);
    assert.ok(existsSync(path.join(process.cwd(), "public/videos/showreel-poster.png")));
  });
});

describe("no fabricated claims in new landing code", () => {
  // Comments are skipped (they explain what is avoided, e.g. "No guaranteed timeframes").
  const code = (src: string) => src.split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join("\n");
  for (const [name, raw] of [["page", PAGE], ["hero", HERO], ["hub", HUB], ["video", VIDEO]] as const) {
    it(name, () => {
      const src = code(raw);
      assert.doesNotMatch(src, /real-time|realtime/i);
      assert.doesNotMatch(src, /official PESO|endorsed by|certified/i);
      assert.doesNotMatch(src, /guaranteed|100% accurate|unbiased|AI-powered/i);
      assert.doesNotMatch(src, /\b(?:10,000\+|450\+|120\+|30k\+|94%|95%)/);
    });
  }
});
