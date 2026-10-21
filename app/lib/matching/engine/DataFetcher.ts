import { supabaseAdmin } from "@/lib/supabase";
import { sanitizeSearchTerm } from "@/lib/postgrest-safe";

export interface RawCandidate {
  id: string;
  score: number; // Raw retrieval score (similarity or overlap count)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DataFetcher {
  /**
   * Raw pgvector retrieval pass. The match_jobseekers_to_job RPC is not
   * deployed in the live database; when it is missing this pass contributes
   * nothing and keyword retrieval is used alone.
   */
  static async fetchRawVector(jobId: string, limit: number = 200): Promise<RawCandidate[]> {
    const { data, error } = await supabaseAdmin.rpc('match_jobseekers_to_job', {
      job_id: jobId,
      match_count: limit
    });

    if (error || !data) return [];

    // Identity is jobseekers.id (UUID) only. Rows without a valid UUID are
    // dropped; nsrp_id is never substituted as an identity.
    const valid = data.filter((item: any) => typeof item?.id === 'string' && UUID_PATTERN.test(item.id));
    if (valid.length < data.length) {
      console.warn(`match_jobseekers_to_job returned ${data.length - valid.length} row(s) without a valid jobseeker UUID; skipped.`);
    }

    return valid.map((item: any) => ({
      id: item.id,
      score: item.similarity || 0
    }));
  }

  /**
   * Keyword retrieval pass on preferred occupations and work history, then a
   * backfill of eligible jobseekers so the pool is never empty.
   */
  static async fetchRawSQL(jobId: string, limit: number = 200): Promise<RawCandidate[]> {
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('position_title')
      .eq('id', jobId)
      .single();

    if (!job) return [];

    // Title and keywords are reduced to a safe character set before they are
    // placed into PostgREST .or() filters (commas/parentheses break the grammar).
    const title = sanitizeSearchTerm(job.position_title);
    const keywords = title
      .split(/\s+/)
      .map((k: string) => k.replace(/[^\p{L}]/gu, '').toLowerCase())
      .filter((k: string) => k.length > 3);

    const orFilters: string[] = [];
    if (title) {
      orFilters.push(`preferred_occupation_1.ilike.%${title}%`, `preferred_occupation_2.ilike.%${title}%`);
    }
    keywords.forEach((k: string) => {
      orFilters.push(`preferred_occupation_1.ilike.%${k}%`);
      orFilters.push(`preferred_occupation_2.ilike.%${k}%`);
    });

    const matchedIds = new Set<string>();

    if (orFilters.length) {
      const { data, error } = await supabaseAdmin.from('jobseekers').select('id').or(orFilters.join(',')).limit(limit);
      if (error) console.error("[DataFetcher] occupation keyword query failed", { code: error.code });
      (data ?? []).forEach((d: any) => matchedIds.add(d.id));
    }

    if (keywords.length) {
      const { data: expMatch, error: expError } = await supabaseAdmin
        .from('jobseeker_experience')
        .select('jobseeker_id')
        .or(keywords.map((k: string) => `position.ilike.%${k}%`).join(','))
        .limit(limit);
      if (expError) console.error("[DataFetcher] experience keyword query failed", { code: expError.code });
      (expMatch ?? []).forEach((e: any) => matchedIds.add(e.jobseeker_id));
    }

    let finalCandidates = Array.from(matchedIds).map(id => ({ id, score: 1.0 }));

    if (finalCandidates.length < limit) {
      const existingIds = new Set(finalCandidates.map(c => c.id));
      const { data: fallbackSeekers } = await eligibleJobseekers()
        .order('created_at', { ascending: false })
        .limit(Math.max(0, 500 - finalCandidates.length));

      const newCandidates = (fallbackSeekers || [])
        .filter((item: { id: string }) => !existingIds.has(item.id))
        .map((item: { id: string }) => ({ id: item.id, score: 0.05 }));

      finalCandidates = [...finalCandidates, ...newCandidates];
    }

    return finalCandidates;
  }

  /**
   * Keeps only candidates eligible for matching under the pilot rules: an
   * active profile, recorded privacy consent, and not marked "not looking".
   */
  static async filterEligible(ids: string[]): Promise<string[]> {
    const unique = Array.from(new Set(ids.filter((id) => UUID_PATTERN.test(id))));
    if (unique.length === 0) return [];
    const eligible = new Set<string>();
    for (let i = 0; i < unique.length; i += 500) {
      const { data, error } = await eligibleJobseekers().in('id', unique.slice(i, i + 500));
      if (error) throw error;
      (data ?? []).forEach((row: { id: string }) => eligible.add(row.id));
    }
    return unique.filter((id) => eligible.has(id));
  }
}

function eligibleJobseekers() {
  return supabaseAdmin
    .from('jobseekers')
    .select('id')
    .eq('is_active', true)
    .not('consent_given_at', 'is', null)
    .neq('job_seeking_status', 'not_looking');
}
