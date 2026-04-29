/**
 * distillation-engine.ts
 * Distills LLM "Teacher" Signals into Lightweight Ranking Weights
 */

import { supabaseAdmin } from "@/lib/supabase";

export class DistillationEngine {
  /**
   * Refines the global scoring weights based on LLM reranking feedback.
   * This reduces long-term dependency on expensive LLM calls.
   */
  public async trainRankingModel(): Promise<Record<string, number>> {
    const { data } = await supabaseAdmin
      .from('training_ranking_dataset')
      .select('*')
      .limit(500);

    if (!data || data.length < 50) {
      console.warn('Insufficient data for distillation. Using default weights.');
      return { f1: 0.35, f2: 0.25, f3: 0.15, f4: 0.15, f5: 0.10 };
    }

    // Simplified Gradient Descent approach to optimize weights
    // In production, this would be a real ML training run.
    let w_skill = 0.35;
    let w_exp = 0.25;
    const learningRate = 0.01;

    data.forEach(instance => {
      const prediction = (instance.skill_similarity * w_skill) + (instance.experience_score * w_exp);
      const error = instance.label - prediction;
      
      // Update weights to minimize error vs LLM label
      w_skill += learningRate * error * instance.skill_similarity;
      w_exp += learningRate * error * instance.experience_score;
    });

    return {
      f1: Math.max(0.1, Math.min(0.6, w_skill)),
      f2: Math.max(0.1, Math.min(0.6, w_exp)),
      f3: 0.15,
      f4: 0.15,
      f5: 0.10
    };
  }

  /**
   * Fast inference using the distilled model weights.
   */
  public getDistilledScore(features: any, weights: any): number {
    return (features.skill_similarity * weights.f1) + (features.experience_score * weights.f2);
  }
}

export const distillationEngine = new DistillationEngine();
