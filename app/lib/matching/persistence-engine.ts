/**
 * persistence-engine.ts
 * Manages the storage of ranking results into the database.
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface RankingResult {
  id: string;
  utility_score: number;
}

export class PersistenceEngine {
  /**
   * Persists ranking results to the job_match_scores table.
   */
  public async saveRankingResults(jobId: string, results: RankingResult[]) {
    if (!results || results.length === 0) return;

    // 1. Clear old scores for this job to maintain freshness
    await supabaseAdmin.from('job_match_scores').delete().eq('job_id', jobId);

    // 2. Prepare batch insert
    const payload = results.map(r => ({
      job_id: jobId,
      jobseeker_id: r.id,
      utility_score: r.utility_score,
      suitability_score: r.utility_score, // Sync both for compatibility
      computed_at: new Date().toISOString(),
      match_evidence: {
        rule: "High-performance online match",
        semantic: "Ranked via feature-weighted hybrid engine"
      }
    }));

    const { error } = await supabaseAdmin.from('job_match_scores').insert(payload);

    if (error) {
      console.error('[Persistence] Failed to save ranking results:', error);
    }
  }
}

export const persistenceEngine = new PersistenceEngine();
