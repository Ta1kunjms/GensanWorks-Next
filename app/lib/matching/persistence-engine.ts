/**
 * persistence-engine.ts
 * Manages the storage of ranking results into the database.
 */

import { supabaseAdmin } from "@/lib/supabase";

import { ScoringResult } from "./scoring-engine";

export interface RankingResult {
  id: string;
  utility_score: number;
  scoring_result?: ScoringResult;
}

export class PersistenceEngine {
  /**
   * Persists ranking results to the job_match_scores table.
   */
  public async saveRankingResults(jobId: string, results: RankingResult[]) {
    const startTime = Date.now();
    if (!results || results.length === 0) return;

    // 1. Prepare batch insert payload
    const payload = results.map(r => {
      const res = r.scoring_result;
      return {
        job_id: jobId,
        jobseeker_id: r.id,
        utility_score: r.utility_score,
        suitability_score: res?.final_score ?? r.utility_score,
        grade: res?.grade ?? null,
        dimension_scores: res ? {
          f1: res.f1, f2: res.f2, f3: res.f3, 
          f6: res.f6_completeness, f7: res.f7,
          relevant_experience_months: res.relevant_experience_months
        } : null,
        constraint_violations: res?.constraint_violations ?? [],
        match_evidence: res ? {
          rule: "Semantic Skill-Weighted Match",
          semantic: res.explanation.top_contributing_skills.length > 0 
            ? `Matches: ${res.explanation.top_contributing_skills.join(', ')}`
            : "Ranked via production-grade semantic engine",
          explanation: res.explanation
        } : {
          rule: "High-performance online match",
          semantic: "Ranked via feature-weighted hybrid engine"
        },
        strengths: res?.explanation?.top_contributing_skills ?? [],
        gaps: res?.explanation?.missing_critical_skills ?? [],
        percentile_rank: res?.percentile_rank ?? 0,
        computed_at: new Date().toISOString(),
      };
    });

    // 2. Call the atomic RPC function
    const { error } = await supabaseAdmin.rpc('upsert_job_match_scores', {
      target_job_id: jobId,
      new_scores: payload
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error(JSON.stringify({
        event: "PERSISTENCE_FAILURE",
        job_id: jobId,
        candidate_count: results.length,
        error_code: error.code,
        error_message: error.message,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    console.log(JSON.stringify({
      event: "PERSISTENCE_SUCCESS",
      job_id: jobId,
      candidate_count: results.length,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }));

    // 3. Trigger true percentile calculation across the entire pool
    await this.computeTruePercentileRank(jobId);
  }

  /**
   * Calculates actual percent_rank() using Postgres window functions
   * and updates all candidates for the given job.
   */
  private async computeTruePercentileRank(jobId: string) {
    const { error } = await supabaseAdmin.rpc('compute_job_percentiles', {
      target_job_id: jobId
    });

    if (error) {
      console.error('[Persistence] Percentile calculation failed:', error);
    }
  }
}

export const persistenceEngine = new PersistenceEngine();
