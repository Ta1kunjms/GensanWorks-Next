import { supabaseAdmin } from "@/lib/supabase";

export interface RawCandidate {
  id: string;
  score: number; // Raw retrieval score (similarity or overlap count)
}

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

    return data.map((item: any) => ({
      id: item.id || item.nsrp_id,
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
    const keywords = job.position_title
      .split(/\s+/)
      .map(k => k.replace(/[^a-zA-Z]/g, '').toLowerCase())
      .filter(k => k.length > 3);

    let query = supabaseAdmin.from('jobseekers').select('id');
    
    // Create a dynamic ilike filter for all keywords
    const orFilters = [
      `preferred_occupation_1.ilike.%${job.position_title}%`,
      `preferred_occupation_2.ilike.%${job.position_title}%`
    ];
    
    keywords.forEach(k => {
      orFilters.push(`preferred_occupation_1.ilike.%${k}%`);
      orFilters.push(`preferred_occupation_2.ilike.%${k}%`);
    });

    const { data, error } = await query.or(orFilters.join(',')).limit(limit);

    if (error || !data || data.length === 0) {
      // FALLBACK: If no keyword matches, just get active jobseekers to ensure list is NOT empty
      const { data: activeSeekers } = await supabaseAdmin
        .from('jobseekers')
        .select('id')
        .in('job_seeking_status', ['actively_looking', 'open'])
        .limit(20);
      
      return (activeSeekers || []).map(item => ({ id: item.id, score: 0.1 }));
    }

    return data.map((item: any) => ({
      id: item.id,
      score: 1.0
    }));
  }
}
