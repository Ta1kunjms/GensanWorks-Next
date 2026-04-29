/**
 * ranking-cache-engine.ts
 * Production-grade caching strategy for ranked results.
 */

import { supabaseAdmin } from "@/lib/supabase";

export class RankingCacheEngine {
  /**
   * Retrieves cached ranking for a job.
   */
  public async getCachedResults(jobId: string): Promise<any[] | null> {
    const { data } = await supabaseAdmin
      .from('ranking_cache')
      .select('results, expires_at')
      .eq('job_id', jobId)
      .single();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;

    return data.results;
  }

  /**
   * Caches ranked results.
   */
  public async setCachedResults(jobId: string, results: any[], ttlMinutes: number = 60) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();
    await supabaseAdmin.from('ranking_cache').upsert({
      job_id: jobId,
      results,
      expires_at: expiresAt
    });
  }

  /**
   * Invalidation logic.
   */
  public async invalidate(jobId: string) {
    await supabaseAdmin.from('ranking_cache').delete().eq('job_id', jobId);
  }
}

export const rankingCacheEngine = new RankingCacheEngine();
