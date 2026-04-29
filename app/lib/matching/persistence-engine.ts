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
    if (!results || results.length === 0) return;

    // 1. Clear old scores for this job to maintain freshness
    await supabaseAdmin.from('job_match_scores').delete().eq('job_id', jobId);

    // 2. Prepare batch insert
    const payload = results.map(r => {
      const res = r.scoring_result;
      return {
        job_id: jobId,
        jobseeker_id: r.id,
        utility_score: r.utility_score,
        suitability_score: res?.final_score ?? r.utility_score, // Sync both for compatibility
        grade: res?.grade ?? null,
        dimension_scores: res ? {
          f1: res.f1, f2: res.f2, f3: res.f3, f4: res.f4, f5: res.f5, 
          f6: res.f6_completeness, f7: res.f7,
          relevant_experience_months: res.relevant_experience_months
        } : null,
        constraint_violations: res?.constraint_violations ?? [],
        match_evidence: res ? {
          rule: "Semantic Skill-Weighted Match",
          semantic: res.explanation.top_contributing_skills.length > 0 
            ? `Matches: ${res.explanation.top_contributing_skills.join(', ')}`
            : "Ranked via production-grade semantic engine",
          explanation: res.explanation // Nest inside existing JSONB column
        } : {
          rule: "High-performance online match",
          semantic: "Ranked via feature-weighted hybrid engine"
        },
        computed_at: new Date().toISOString(),
      };
    });

    const { error } = await supabaseAdmin.from('job_match_scores').insert(payload);

    if (error) {
      console.error('[Persistence] Failed to save ranking results:', error);
    }
  }
}

export const persistenceEngine = new PersistenceEngine();
