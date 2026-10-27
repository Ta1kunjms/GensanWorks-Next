// Public labour-market aggregation for the landing page (GET /api/public/labor-market).
// Pure and dependency-light so every rule can be unit tested offline
// (tests/landing-labor-market.test.ts).
//
// Output is aggregate only. Jobseeker rows are reduced to skill keys and counted;
// no jobseeker names, emails or ids leave these helpers. Employer names, job titles
// and job ids are public listing data (owner decision 2026-10-23).

import { SRS_INDUSTRY_CODES } from "./validation-schemas";
import { referralStatusDbValues, referralStatusLabel } from "./referral-status";

// ---------------------------------------------------------------------------
// Row shapes (only the columns the route selects)
// ---------------------------------------------------------------------------

export interface JobEmployerRef {
  establishment_name?: string | null;
  city?: string | null;
}

export interface OpenJobRow {
  id: string;
  employer_id?: string | null;
  position_title?: string | null;
  industry_code?: unknown;
  main_skill_desired?: string | null;
  vacancies?: number | string | null;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  salary_period?: string | null;
  work_setup?: string | null;
  work_type?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  /** PostgREST embeds a to-one relation as an object; tolerate an array too. */
  employers?: JobEmployerRef | JobEmployerRef[] | null;
}

export interface EmployerRow {
  id: string;
  establishment_name?: string | null;
  industry?: string | null;
  city?: string | null;
  profile_image?: string | null;
}

export interface JobseekerSkillRow {
  other_skills?: unknown;
  other_skills_others?: string | null;
}

export interface OutcomeRow {
  jobseeker_id?: string | null;
  job_id?: string | null;
  status?: string | null;
}

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface SectorVacancies {
  code: string;
  sector: string;
  jobs: number;
  vacancies: number;
}

export interface SkillDemandSupply {
  skill: string;
  /** Sum of vacancies on open jobs that list the skill. */
  demand: number;
  /** Open jobs that list the skill. */
  jobs: number;
  /** Active, consented, job-seeking jobseekers who list the skill. */
  supply: number;
}

export interface SkillGapRow {
  skill: string;
  demand: number;
  supply: number;
  gap: number;
}

export interface SuccessRates {
  /** Percent (0-100, one decimal) of referrals marked Hired; null when there are no referrals. */
  placementRate: number | null;
  referrals: number;
  hiredReferrals: number;
  /** Percent (0-100, one decimal) of applications marked hired; null when there are no applications. */
  applicationSuccessRate: number | null;
  applications: number;
  hiredApplications: number;
}

export interface CarouselEmployer {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logo: string | null;
}

export interface LatestJob {
  id: string;
  title: string;
  employer: string | null;
  sector: string;
  city: string | null;
  workSetup: string | null;
  postedAt: string | null;
}

export interface SectorSalary {
  code: string;
  sector: string;
  /** Median monthly pay in PHP, rounded to the peso; null when no post in the sector has a salary. */
  medianMonthly: number | null;
  /** Number of job posts with a usable salary. */
  n: number;
}

export interface OverallSalary {
  /** Median monthly pay in PHP across all open posts with a usable salary, rounded to the peso; null when none. */
  medianMonthly: number | null;
  /** Number of job posts with a usable salary. */
  n: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  jobs: number;
  vacancies: number;
}

export interface WorkArrangement {
  setup: BreakdownRow[];
  type: BreakdownRow[];
}

export interface CityHiring {
  city: string;
  jobs: number;
  vacancies: number;
}

export interface PlacementFunnel {
  applications: number;
  referrals: number;
  /** Distinct jobseeker+job pairs whose application or referral is at interview. */
  interview: number;
  /** Distinct jobseeker+job pairs hired through an application or a referral. */
  hired: number;
}

export interface EmployerHiringNow {
  name: string;
  industry: string | null;
  city: string | null;
  openJobs: number;
  openVacancies: number;
}

export interface LaborMarketResponse {
  totals: { jobseekers: number; employers: number; openJobs: number; openVacancies: number };
  vacanciesBySector: SectorVacancies[];
  skills: SkillDemandSupply[];
  skillGaps: SkillGapRow[];
  successRates: SuccessRates;
  employers: CarouselEmployer[];
  latestJobs: LatestJob[];
  salaryBySector: SectorSalary[];
  salaryOverall: OverallSalary;
  workArrangement: WorkArrangement;
  hiringByCity: CityHiring[];
  funnel: PlacementFunnel;
  employersHiringNow: EmployerHiringNow[];
  /** Active jobseeker accounts created in the last 30 days. */
  jobseekersNewThisMonth: number;
  /** Active jobseeker accounts created 30-60 days ago (the previous 30-day window). */
  jobseekersPrev30: number;
  /** Percent change of jobseekersNewThisMonth against jobseekersPrev30; null when the previous window is 0. */
  jobseekersNewChangePct: number | null;
  asOf: string;
}

// ---------------------------------------------------------------------------
// Basic normalisers
// ---------------------------------------------------------------------------

export const OTHER_SECTOR = { code: "other", sector: "Other" } as const;

const SECTOR_BY_CODE = new Map<string, string>(SRS_INDUSTRY_CODES.map((entry) => [entry.code, entry.label]));
const SECTOR_BY_LABEL = new Map<string, { code: string; sector: string }>(
  SRS_INDUSTRY_CODES.map((entry) => [entry.label.toLowerCase(), { code: entry.code, sector: entry.label }])
);

/** First industry code on a job (text "07", "07,08", '["07"]' or an array) mapped to its SRS sector. */
export function sectorForIndustryCode(value: unknown): { code: string; sector: string } {
  let first: unknown = value;
  if (Array.isArray(value)) first = value[0];
  if (typeof first === "number") first = String(first);
  if (typeof first !== "string") return { ...OTHER_SECTOR };

  const token = first
    .replace(/[[\]"{}]/g, " ")
    .split(/[,;|]/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!token) return { ...OTHER_SECTOR };

  const digits = token.match(/^\d{1,2}\b/);
  if (digits) {
    const code = digits[0].padStart(2, "0");
    const sector = SECTOR_BY_CODE.get(code);
    return sector ? { code, sector } : { ...OTHER_SECTOR };
  }
  return SECTOR_BY_LABEL.get(token.toLowerCase()) ?? { ...OTHER_SECTOR };
}

/** Employer industry for display: SRS codes become their label; free text is kept. */
export function industryLabel(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (/^\d{1,2}$/.test(text)) {
    const mapped = sectorForIndustryCode(text);
    return mapped.code === OTHER_SECTOR.code ? null : mapped.sector;
  }
  return text;
}

/** Vacancies on a job; a missing value means the column default (1), invalid values count as 0. */
export function normalizeVacancies(value: unknown): number {
  if (value === null || value === undefined || value === "") return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

function employerOf(job: OpenJobRow): JobEmployerRef | null {
  const ref = job.employers;
  if (Array.isArray(ref)) return ref[0] ?? null;
  return ref ?? null;
}

/** Only absolute https URLs are passed to the browser as logos. */
export function safeLogoUrl(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(text) ? text : null;
}

/**
 * Percent change (one decimal) from previous to current; null when there is no
 * previous figure to compare with (previous <= 0), so no growth is invented.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(current)) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Rounded percentage (one decimal) or null when the denominator is 0. */
export function percentRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  if (!Number.isFinite(numerator) || numerator < 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/** Splits a skills text on commas and semicolons, trimming blanks. */
export function splitSkillList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/** Case-insensitive key for a skill. */
export function skillKey(skill: string): string {
  return skill.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Lower-case skill keys for one jobseeker: NSRP "Other Skills" checkbox values
 * (strings or {name|skill} objects, "Others" placeholder skipped), the typed
 * other_skills_others list, and skills acquired in trainings.
 */
export function jobseekerSkillKeys(row: JobseekerSkillRow, trainingSkills: Array<string | null | undefined> = []): Set<string> {
  const keys = new Set<string>();
  const add = (value: string) => {
    const key = skillKey(value);
    if (key && key !== "others") keys.add(key);
  };

  const raw = row.other_skills;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string") add(entry);
      else if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const name = record.name ?? record.skill;
        if (typeof name === "string") add(name);
      }
    }
  } else if (typeof raw === "string") {
    splitSkillList(raw).forEach(add);
  }

  for (const value of (row.other_skills_others ?? "").split(",")) add(value);
  for (const training of trainingSkills) {
    for (const value of (training ?? "").split(",")) add(value);
  }
  return keys;
}

/**
 * Demand (vacancies and job count per skill on open jobs) against supply
 * (jobseekers whose skill set contains the skill). Display casing is the first
 * spelling seen on a job post.
 */
export function computeSkillDemandSupply(
  jobs: Array<Pick<OpenJobRow, "main_skill_desired" | "vacancies">>,
  jobseekerSkills: Array<Set<string>>,
  limit = 10
): SkillDemandSupply[] {
  const demand = new Map<string, SkillDemandSupply>();
  for (const job of jobs) {
    const vacancies = normalizeVacancies(job.vacancies);
    const seen = new Set<string>();
    for (const token of splitSkillList(job.main_skill_desired)) {
      const key = skillKey(token);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const row = demand.get(key);
      if (row) {
        row.demand += vacancies;
        row.jobs += 1;
      } else {
        demand.set(key, { skill: token.trim().replace(/\s+/g, " "), demand: vacancies, jobs: 1, supply: 0 });
      }
    }
  }

  for (const [key, row] of demand) {
    row.supply = jobseekerSkills.reduce((count, keys) => count + (keys.has(key) ? 1 : 0), 0);
  }

  return Array.from(demand.values())
    .sort((a, b) => b.demand - a.demand || b.jobs - a.jobs || a.skill.localeCompare(b.skill))
    .slice(0, limit);
}

/** Largest positive gaps (demand minus supply) among the given skills. */
export function computeSkillGaps(rows: Array<Pick<SkillDemandSupply, "skill" | "demand" | "supply">>, limit = 8): SkillGapRow[] {
  return rows
    .map((row) => ({ skill: row.skill, demand: row.demand, supply: row.supply, gap: row.demand - row.supply }))
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand || a.skill.localeCompare(b.skill))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Sectors, salary, work arrangement, city
// ---------------------------------------------------------------------------

export function aggregateVacanciesBySector(jobs: Array<Pick<OpenJobRow, "industry_code" | "vacancies">>): SectorVacancies[] {
  const bySector = new Map<string, SectorVacancies>();
  for (const job of jobs) {
    const { code, sector } = sectorForIndustryCode(job.industry_code);
    const row = bySector.get(code) ?? { code, sector, jobs: 0, vacancies: 0 };
    row.jobs += 1;
    row.vacancies += normalizeVacancies(job.vacancies);
    bySector.set(code, row);
  }
  return Array.from(bySector.values()).sort(
    (a, b) => b.vacancies - a.vacancies || b.jobs - a.jobs || a.sector.localeCompare(b.sector)
  );
}

/** Working days used to turn a daily rate into a monthly figure. */
export const WORKING_DAYS_PER_MONTH = 26;
/** Hours per working day used for hourly rates. */
export const HOURS_PER_DAY = 8;

const PERIOD_TO_MONTHLY: Record<string, number> = {
  monthly: 1,
  daily: WORKING_DAYS_PER_MONTH,
  weekly: 52 / 12,
  hourly: HOURS_PER_DAY * WORKING_DAYS_PER_MONTH,
};

/**
 * Monthly pay for a job post: midpoint of salary_min/salary_max (or the one that
 * is set), converted by salary_period (missing = monthly, the column default).
 * Returns null when there is no positive salary or the period is unknown.
 */
export function monthlyPay(job: Pick<OpenJobRow, "salary_min" | "salary_max" | "salary_period">): number | null {
  const bounds = [job.salary_min, job.salary_max]
    .map((value) => (value === null || value === undefined || value === "" ? NaN : Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (bounds.length === 0) return null;
  const midpoint = bounds.reduce((sum, value) => sum + value, 0) / bounds.length;
  const period = (job.salary_period ?? "monthly").trim().toLowerCase() || "monthly";
  const factor = PERIOD_TO_MONTHLY[period];
  if (!factor) return null;
  return midpoint * factor;
}

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Median monthly pay per sector that has open jobs; sectors with no salaries have n = 0 and a null median. */
export function salaryBySector(jobs: Array<Pick<OpenJobRow, "industry_code" | "salary_min" | "salary_max" | "salary_period">>): SectorSalary[] {
  const bySector = new Map<string, { code: string; sector: string; pays: number[] }>();
  for (const job of jobs) {
    const { code, sector } = sectorForIndustryCode(job.industry_code);
    const row = bySector.get(code) ?? { code, sector, pays: [] };
    const pay = monthlyPay(job);
    if (pay !== null) row.pays.push(pay);
    bySector.set(code, row);
  }
  return Array.from(bySector.values())
    .map(({ code, sector, pays }) => {
      const mid = median(pays);
      return { code, sector, medianMonthly: mid === null ? null : Math.round(mid), n: pays.length };
    })
    .sort((a, b) => {
      if (a.medianMonthly === null && b.medianMonthly !== null) return 1;
      if (b.medianMonthly === null && a.medianMonthly !== null) return -1;
      return (b.medianMonthly ?? 0) - (a.medianMonthly ?? 0) || b.n - a.n || a.sector.localeCompare(b.sector);
    });
}

/** Median monthly pay across every open job post with a usable salary (same conversion as salaryBySector). */
export function salaryOverall(jobs: Array<Pick<OpenJobRow, "salary_min" | "salary_max" | "salary_period">>): OverallSalary {
  const pays = jobs.map((job) => monthlyPay(job)).filter((pay): pay is number => pay !== null);
  const mid = median(pays);
  return { medianMonthly: mid === null ? null : Math.round(mid), n: pays.length };
}

export function workSetupKey(value: string | null | undefined): "onsite" | "hybrid" | "remote" | "unspecified" {
  const text = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (text === "onsite") return "onsite";
  if (text === "hybrid") return "hybrid";
  if (text === "remote" || text === "workfromhome" || text === "wfh") return "remote";
  return "unspecified";
}

export function workTypeKey(value: string | null | undefined): "full-time" | "part-time" | "unspecified" {
  const text = (value ?? "").trim().toLowerCase();
  if (text.includes("part")) return "part-time";
  if (text.includes("full")) return "full-time";
  return "unspecified";
}

const SETUP_LABELS: Record<string, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote", unspecified: "Not specified" };
const TYPE_LABELS: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", unspecified: "Not specified" };

/** Jobs and vacancies by work setup and by work type. The three setups and two types are always present. */
export function workArrangement(jobs: Array<Pick<OpenJobRow, "work_setup" | "work_type" | "vacancies">>): WorkArrangement {
  const setup = new Map<string, BreakdownRow>(
    ["onsite", "hybrid", "remote"].map((key) => [key, { key, label: SETUP_LABELS[key]!, jobs: 0, vacancies: 0 }])
  );
  const type = new Map<string, BreakdownRow>(
    ["full-time", "part-time"].map((key) => [key, { key, label: TYPE_LABELS[key]!, jobs: 0, vacancies: 0 }])
  );
  const bump = (map: Map<string, BreakdownRow>, key: string, labels: Record<string, string>, vacancies: number) => {
    const row = map.get(key) ?? { key, label: labels[key] ?? key, jobs: 0, vacancies: 0 };
    row.jobs += 1;
    row.vacancies += vacancies;
    map.set(key, row);
  };
  for (const job of jobs) {
    const vacancies = normalizeVacancies(job.vacancies);
    bump(setup, workSetupKey(job.work_setup), SETUP_LABELS, vacancies);
    bump(type, workTypeKey(job.work_type), TYPE_LABELS, vacancies);
  }
  return { setup: Array.from(setup.values()), type: Array.from(type.values()) };
}

/** Open jobs and vacancies per employer city, largest first. */
export function hiringByCity(jobs: Array<Pick<OpenJobRow, "employers" | "vacancies">>): CityHiring[] {
  const byCity = new Map<string, CityHiring>();
  for (const job of jobs) {
    const name = cleanText(employerOf(job as OpenJobRow)?.city)?.replace(/\s+/g, " ") ?? "Not specified";
    const key = name.toLowerCase();
    const row = byCity.get(key) ?? { city: name, jobs: 0, vacancies: 0 };
    row.jobs += 1;
    row.vacancies += normalizeVacancies(job.vacancies);
    byCity.set(key, row);
  }
  return Array.from(byCity.values()).sort(
    (a, b) => b.vacancies - a.vacancies || b.jobs - a.jobs || a.city.localeCompare(b.city)
  );
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

function postedTime(job: Pick<OpenJobRow, "published_at" | "created_at">): number {
  const time = Date.parse(job.published_at ?? job.created_at ?? "");
  return Number.isFinite(time) ? time : 0;
}

/** Newest open jobs by published_at (falling back to created_at). */
export function latestJobs(jobs: OpenJobRow[], limit = 6): LatestJob[] {
  return [...jobs]
    .sort((a, b) => postedTime(b) - postedTime(a) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((job) => {
      const employer = employerOf(job);
      const setup = workSetupKey(job.work_setup);
      return {
        id: job.id,
        title: cleanText(job.position_title) ?? "Untitled position",
        employer: cleanText(employer?.establishment_name),
        sector: sectorForIndustryCode(job.industry_code).sector,
        city: cleanText(employer?.city),
        workSetup: setup === "unspecified" ? null : SETUP_LABELS[setup]!,
        postedAt: job.published_at ?? job.created_at ?? null,
      };
    });
}

export function carouselEmployers(employers: EmployerRow[]): CarouselEmployer[] {
  return employers
    .map((row) => ({
      id: row.id,
      name: cleanText(row.establishment_name) ?? "",
      industry: industryLabel(row.industry),
      city: cleanText(row.city),
      logo: safeLogoUrl(row.profile_image),
    }))
    .filter((row) => row.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Approved employers with the most open vacancies. */
export function employersHiringNow(jobs: Array<Pick<OpenJobRow, "employer_id" | "vacancies">>, employers: EmployerRow[], limit = 6): EmployerHiringNow[] {
  const totals = new Map<string, { openJobs: number; openVacancies: number }>();
  for (const job of jobs) {
    if (!job.employer_id) continue;
    const row = totals.get(job.employer_id) ?? { openJobs: 0, openVacancies: 0 };
    row.openJobs += 1;
    row.openVacancies += normalizeVacancies(job.vacancies);
    totals.set(job.employer_id, row);
  }
  return employers
    .flatMap((employer) => {
      const total = totals.get(employer.id);
      const name = cleanText(employer.establishment_name);
      if (!total || !name) return [];
      return [{ name, industry: industryLabel(employer.industry), city: cleanText(employer.city), ...total }];
    })
    .sort((a, b) => b.openVacancies - a.openVacancies || b.openJobs - a.openJobs || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

const HIRED_REFERRAL_VALUES = new Set(referralStatusDbValues("Hired"));

export function isHiredReferral(status: string | null | undefined): boolean {
  return HIRED_REFERRAL_VALUES.has(status ?? "");
}

export function isHiredApplication(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === "hired";
}

export function computeSuccessRates(applications: OutcomeRow[], referrals: OutcomeRow[]): SuccessRates {
  const hiredReferrals = referrals.filter((row) => isHiredReferral(row.status)).length;
  const hiredApplications = applications.filter((row) => isHiredApplication(row.status)).length;
  return {
    placementRate: percentRate(hiredReferrals, referrals.length),
    referrals: referrals.length,
    hiredReferrals,
    applicationSuccessRate: percentRate(hiredApplications, applications.length),
    applications: applications.length,
    hiredApplications,
  };
}

/**
 * Applications -> referrals -> interview -> hired. Interview and hired count
 * distinct jobseeker+job pairs so an application and its referral for the same
 * job are counted once. Rows without both ids are counted on their own.
 */
export function placementFunnel(applications: OutcomeRow[], referrals: OutcomeRow[]): PlacementFunnel {
  const interview = new Set<string>();
  const hired = new Set<string>();
  const pairKey = (row: OutcomeRow, fallback: string) =>
    row.jobseeker_id && row.job_id ? `${row.jobseeker_id}:${row.job_id}` : fallback;

  applications.forEach((row, index) => {
    const status = (row.status ?? "").trim().toLowerCase();
    const key = pairKey(row, `application:${index}`);
    if (status === "interview") interview.add(key);
    if (isHiredApplication(row.status)) hired.add(key);
  });
  referrals.forEach((row, index) => {
    const key = pairKey(row, `referral:${index}`);
    if (row.status && referralStatusLabel(row.status) === "For Interview") interview.add(key);
    if (isHiredReferral(row.status)) hired.add(key);
  });

  return { applications: applications.length, referrals: referrals.length, interview: interview.size, hired: hired.size };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface LaborMarketInputs {
  activeJobseekers: number;
  employers: EmployerRow[];
  openJobs: OpenJobRow[];
  /** One skill-key set per active, consented, job-seeking jobseeker. */
  jobseekerSkills: Array<Set<string>>;
  applications: OutcomeRow[];
  referrals: OutcomeRow[];
  /** Active jobseekers created in the last 30 days (count query in the route). */
  jobseekersNewThisMonth?: number;
  /** Active jobseekers created 30-60 days ago. */
  jobseekersPrev30?: number;
  now?: Date;
}

export function buildLaborMarket(input: LaborMarketInputs): LaborMarketResponse {
  const newJobseekers = Math.max(0, input.jobseekersNewThisMonth ?? 0);
  const prevJobseekers = Math.max(0, input.jobseekersPrev30 ?? 0);
  const skills = computeSkillDemandSupply(input.openJobs, input.jobseekerSkills, Number.POSITIVE_INFINITY);
  return {
    totals: {
      jobseekers: input.activeJobseekers,
      employers: input.employers.length,
      openJobs: input.openJobs.length,
      openVacancies: input.openJobs.reduce((sum, job) => sum + normalizeVacancies(job.vacancies), 0),
    },
    vacanciesBySector: aggregateVacanciesBySector(input.openJobs),
    skills: skills.slice(0, 10),
    // Gaps are ranked across every demanded skill, not only the top 10 by demand.
    skillGaps: computeSkillGaps(skills, 8),
    successRates: computeSuccessRates(input.applications, input.referrals),
    employers: carouselEmployers(input.employers),
    latestJobs: latestJobs(input.openJobs, 6),
    salaryBySector: salaryBySector(input.openJobs),
    salaryOverall: salaryOverall(input.openJobs),
    workArrangement: workArrangement(input.openJobs),
    hiringByCity: hiringByCity(input.openJobs),
    funnel: placementFunnel(input.applications, input.referrals),
    employersHiringNow: employersHiringNow(input.openJobs, input.employers, 6),
    jobseekersNewThisMonth: newJobseekers,
    jobseekersPrev30: prevJobseekers,
    jobseekersNewChangePct: percentChange(newJobseekers, prevJobseekers),
    asOf: (input.now ?? new Date()).toISOString(),
  };
}
