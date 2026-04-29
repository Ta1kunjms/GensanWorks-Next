/**
 * evaluation-engine.ts
 * AI Ranking Quality Metrics (Precision@K, NDCG@K)
 */

import { supabaseAdmin } from "@/lib/supabase";

export class EvaluationEngine {
  /**
   * Evaluates the ranking quality against actual recruiter decisions.
   */
  public async evaluateRankingQuality(jobId: string, rankings: any[]): Promise<any> {
    // 1. Fetch "Ground Truth" (recruiter positive signals)
    const { data: feedback } = await supabaseAdmin
      .from('match_feedback_logs')
      .select('jobseeker_id, weight')
      .eq('job_id', jobId)
      .gt('weight', 0);

    if (!feedback || feedback.length === 0) return null;

    const relevantIds = new Set(feedback.map(f => f.jobseeker_id));
    
    // 2. Compute Metrics
    const k = Math.min(10, rankings.length);
    const pAtK = this.precisionAtK(rankings, relevantIds, k);
    const ndcg = this.ndcg(rankings, feedback, k);

    // 3. Persist Metrics
    const { error } = await supabaseAdmin.from('system_evaluation_logs').insert({
      job_id: jobId,
      p_at_10: pAtK,
      ndcg_at_10: ndcg,
      candidate_pool_size: rankings.length,
      evaluated_at: new Date().toISOString()
    });

    if (error) console.error('Failed to log evaluation:', error);

    return { pAtK, ndcg };
  }

  private precisionAtK(rankings: any[], relevantIds: Set<string>, k: number): number {
    const hits = rankings.slice(0, k).filter(r => relevantIds.has(r.id)).length;
    return hits / k;
  }

  private ndcg(rankings: any[], feedback: any[], k: number): number {
    const relevanceMap = new Map(feedback.map(f => [f.jobseeker_id, f.weight]));
    
    let dcg = 0;
    for (let i = 0; i < Math.min(k, rankings.length); i++) {
      const rel = relevanceMap.get(rankings[i].id) || 0;
      dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }

    // Ideal DCG (if all relevant items were at the top)
    const sortedRelevance = [...feedback].sort((a, b) => b.weight - a.weight);
    let idcg = 0;
    for (let i = 0; i < Math.min(k, sortedRelevance.length); i++) {
      idcg += (Math.pow(2, sortedRelevance[i].weight) - 1) / Math.log2(i + 2);
    }

    return idcg === 0 ? 0 : dcg / idcg;
  }
}

export const evaluationEngine = new EvaluationEngine();
