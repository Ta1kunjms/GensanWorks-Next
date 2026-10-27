export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";
import {
  buildLaborMarket,
  jobseekerSkillKeys,
  type EmployerRow,
  type JobseekerSkillRow,
  type OpenJobRow,
  type OutcomeRow,
} from "@/lib/labor-market";

// Public, read-only labour-market aggregates for the landing page.
// Server-side service-role reads; the response carries counts, sector/skill
// aggregates and public listing data (employer names, job titles) only.
// No jobseeker names, emails or ids are returned.

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

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `labor-market:public:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  const limitHeaders = {
    "X-Request-ID": requestId,
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: limitHeaders });
  }

  try {
    const db = supabaseAdmin;

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

    const payload = buildLaborMarket({
      activeJobseekers: jobseekerCount.count ?? 0,
      employers,
      openJobs,
      jobseekerSkills,
      applications: applications.map(({ jobseeker_id, job_id, status }) => ({ jobseeker_id, job_id, status })),
      referrals: referrals.map(({ jobseeker_id, job_id, status }) => ({ jobseeker_id, job_id, status })),
    });

    return NextResponse.json(payload, {
      headers: {
        ...limitHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    // Table/query label and database message only; no row data is logged.
    console.error("[GET /api/public/labor-market] Failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Labour-market data is unavailable right now." },
      { status: 500, headers: limitHeaders }
    );
  }
}
