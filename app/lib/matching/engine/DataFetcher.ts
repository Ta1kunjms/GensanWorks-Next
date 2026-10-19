import { supabaseAdmin } from "@/lib/supabase";

export interface RawCandidate {
  id: string;
  score: number; // Raw retrieval score (similarity or overlap count)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DataFetcher {
  /**
   * Raw pgvector Retrieval Pass
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
   * Dynamic SQL Filtering Pass
   */
  static async fetchRawSQL(jobId: string, limit: number = 200): Promise<RawCandidate[]> {
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('position_title')
      .eq('id', jobId)
      .single();

    if (!job) return [];

    // BREAK DOWN TITLE INTO KEYWORDS (e.g., "Marketing Officer" -> ["marketing", "officer"])
    const keywords = (job.position_title || '')
      .split(/\s+/)
      .map((k: string) => k.replace(/[^a-zA-Z]/g, '').toLowerCase())
      .filter((k: string) => k.length > 3);

    let query = supabaseAdmin.from('jobseekers').select('id');
    
    // Create a dynamic ilike filter for all keywords
    const orFilters = [
      `preferred_occupation_1.ilike.%${job.position_title}%`,
      `preferred_occupation_2.ilike.%${job.position_title}%`
    ];
    
    keywords.forEach((k: string) => {
      orFilters.push(`preferred_occupation_1.ilike.%${k}%`);
      orFilters.push(`preferred_occupation_2.ilike.%${k}%`);
    });

    const { data, error } = await query.or(orFilters.join(',')).limit(limit);

    // Also search experience history for keywords
    const expOrFilters = keywords.map((k: string) => `position.ilike.%${k}%`);
    const { data: expMatch } = await supabaseAdmin
      .from('jobseeker_experience')
      .select('jobseeker_id')
      .or(expOrFilters.join(','))
      .limit(limit);

    const matchedIds = new Set<string>();
    if (data) data.forEach((d: any) => matchedIds.add(d.id));
    if (expMatch) expMatch.forEach((e: any) => matchedIds.add(e.jobseeker_id));

    // If we have less than limit, backfill with active/open job seekers to ensure a full pool
    let finalCandidates = Array.from(matchedIds).map(id => ({
      id,
      score: 1.0
    }));

    if (finalCandidates.length < limit) {
      const existingIds = new Set(finalCandidates.map(c => c.id));
      const { data: fallbackSeekers } = await supabaseAdmin
        .from('jobseekers')
        .select('id')
        .order('created_at', { ascending: false }) // Newest users first
        .limit(Math.max(0, 500 - finalCandidates.length));
      
      const newCandidates = (fallbackSeekers || [])
        .filter(item => !existingIds.has(item.id))
        .map(item => ({ id: item.id, score: 0.05 }));
        
      finalCandidates = [...finalCandidates, ...newCandidates];
    }

    return finalCandidates;
  }
}
