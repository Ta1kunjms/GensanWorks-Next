// Server-only loaders for the public landing page.
// One aggregation path: GET /api/public/labor-market and the landing Server Component
// both call loadLaborMarket(), so the numbers can never differ between the two.
//
// Service-role reads stay on the server. Output is aggregate only (see app/lib/labor-market.ts):
// no jobseeker names, emails or ids leave this module.

import "server-only";
import { unstable_cache } from "next/cache";
import {
  buildLaborMarket,
  jobseekerSkillKeys,
  type EmployerRow,
  type JobseekerSkillRow,
  type LaborMarketResponse,
  type OpenJobRow,
  type OutcomeRow,
} from "./labor-market";

/** Landing data is cached for 5 minutes (matches the API's s-maxage=300). */
export const LANDING_REVALIDATE_SECONDS = 300;

const PAGE_SIZE = 1000;
// Safety stop for the paging loop (100k rows per table).
const MAX_PAGES = 100;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message?: string } | null }>;

/** Reads every row of a query in pages of 1000 (PostgREST caps a single response). */
async function fetchAll<T>(label: string, page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message ?? "query failed"}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new Error(`${label}: more than ${MAX_PAGES * PAGE_SIZE} rows`);
}

/** The Supabase service-role client, imported lazily so missing env vars surface as a caught error. */
async function adminClient() {
  const { supabaseAdmin } = await import("./supabase");
  return supabaseAdmin;
}

/** Reads the source tables and builds the public aggregates. Throws on any query failure. */
export async function loadLaborMarket(): Promise<LaborMarketResponse> {
  const db = await adminClient();

  const jobseekerCountPromise = db
    .from("jobseekers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const [jobseekerCount, employers, openJobs, supplyRows, trainings, applications, referrals] = await Promise.all([
    jobseekerCountPromise,
    fetchAll<EmployerRow>("employers", (from, to) =>
      db
        .from("employers")
        .select("id, establishment_name, industry, city, profile_image")
        .eq("account_status", "approved")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAll<OpenJobRow>("jobs", (from, to) =>
      db
        .from("jobs")
        .select(
          "id, employer_id, position_title, industry_code, main_skill_desired, vacancies, salary_min, salary_max, salary_period, work_setup, work_type, published_at, created_at, employers(establishment_name, city)"
        )
        .eq("job_status", "active")
        .eq("is_active", true)
        .eq("archived", false)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    // Supply side: active, consented jobseekers who are looking for work.
    // The id is used only to attach training skills below and is never returned.
    fetchAll<JobseekerSkillRow & { id: string }>("jobseekers", (from, to) =>
      db
        .from("jobseekers")
        .select("id, other_skills, other_skills_others")
        .eq("is_active", true)
        .not("consent_given_at", "is", null)
        .neq("job_seeking_status", "not_looking")
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAll<{ jobseeker_id: string | null; skills_acquired: string | null }>("jobseeker_trainings", (from, to) =>
      db
        .from("jobseeker_trainings")
        .select("id, jobseeker_id, skills_acquired")
        .not("skills_acquired", "is", null)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAll<OutcomeRow>("applications", (from, to) =>
      db.from("applications").select("id, jobseeker_id, job_id, status").order("id", { ascending: true }).range(from, to)
    ),
    fetchAll<OutcomeRow>("referrals", (from, to) =>
      db.from("referrals").select("id, jobseeker_id, job_id, status").order("id", { ascending: true }).range(from, to)
    ),
  ]);

  if (jobseekerCount.error) throw new Error(`jobseekers count: ${jobseekerCount.error.message}`);

  const trainingSkills = new Map<string, string[]>();
  for (const row of trainings) {
    if (!row.jobseeker_id || !row.skills_acquired) continue;
    const list = trainingSkills.get(row.jobseeker_id) ?? [];
    list.push(row.skills_acquired);
    trainingSkills.set(row.jobseeker_id, list);
  }
  const jobseekerSkills = supplyRows.map((row) => jobseekerSkillKeys(row, trainingSkills.get(row.id) ?? []));

  return buildLaborMarket({
    activeJobseekers: jobseekerCount.count ?? 0,
    employers,
    openJobs,
    jobseekerSkills,
    applications: applications.map(({ jobseeker_id, job_id, status }) => ({ jobseeker_id, job_id, status })),
    referrals: referrals.map(({ jobseeker_id, job_id, status }) => ({ jobseeker_id, job_id, status })),
  });
}

const cachedLaborMarket = unstable_cache(loadLaborMarket, ["landing-labor-market"], {
  revalidate: LANDING_REVALIDATE_SECONDS,
});

/** Cached aggregates for the landing page; null when the data cannot be loaded (the page then shows "—"). */
export async function getLaborMarketData(): Promise<LaborMarketResponse | null> {
  try {
    return await cachedLaborMarket();
  } catch (error) {
    // Table/query label and database message only; no row data is logged.
    console.error("[landing] labour-market data unavailable:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Other landing content (same reads as /api/landing/faqs, /news, /categories)
// ---------------------------------------------------------------------------

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingNewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  link_url: string;
  published_at: string;
}

export interface LandingCategory {
  name: string;
  category: string;
  jobs: string;
}

export interface LandingContent {
  faqs: LandingFaq[];
  news: LandingNewsItem[];
  categories: LandingCategory[];
}

async function loadLandingContent(): Promise<LandingContent> {
  const db = await adminClient();
  const [faqs, news, categories] = await Promise.all([
    db.from("landing_faqs").select("question, answer, display_order").order("display_order", { ascending: true }),
    db.from("landing_news").select("*").order("published_at", { ascending: false }).limit(6),
    db.from("jobs").select("category").eq("is_active", true).eq("archived", false).not("category", "is", null),
  ]);

  const counts = new Map<string, number>();
  for (const row of (categories.error ? [] : categories.data ?? []) as Array<{ category: string | null }>) {
    if (!row.category) continue;
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  return {
    faqs: faqs.error ? [] : ((faqs.data ?? []) as LandingFaq[]).map(({ question, answer }) => ({ question, answer })),
    news: news.error ? [] : ((news.data ?? []) as LandingNewsItem[]),
    categories: Array.from(counts.entries()).map(([name, count]) => ({
      name,
      category: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      jobs: `${count.toLocaleString()} open roles`,
    })),
  };
}

const cachedLandingContent = unstable_cache(loadLandingContent, ["landing-content"], {
  revalidate: LANDING_REVALIDATE_SECONDS,
});

/** FAQs, news and job categories for the landing page; empty lists when unavailable. */
export async function getLandingContent(): Promise<LandingContent> {
  try {
    return await cachedLandingContent();
  } catch (error) {
    console.error("[landing] content unavailable:", error instanceof Error ? error.message : "unknown error");
    return { faqs: [], news: [], categories: [] };
  }
}
