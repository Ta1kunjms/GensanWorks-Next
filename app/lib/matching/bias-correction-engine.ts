/**
 * bias-correction-engine.ts
 * Fairness Layer and Bias Mitigation System
 */

import { supabaseAdmin } from "@/lib/supabase";

export class BiasCorrectionEngine {
  /**
   * Applies counterfactual adjustments to mitigate systemic biases.
   * Prevents "Prestige Bias" and "Feedback Loops" from dominating the ranking.
   */
  public async applyBiasCorrectionScore(jobId: string, candidate: any, baseScore: number): Promise<number> {
    let adjustment = 0;

    // 1. Mitigate Prestige/Popularity Bias
    // If a candidate is from a "High Frequency" school or company that recruiters 
    // are overfitting on, we slightly dampen the score to allow diversity.
    if (this.isFromHighPrestigeGroup(candidate)) {
      adjustment -= 0.05;
    }

    // 2. Disparity Correction
    // If our monitor flags this job for education or location disparity, 
    // we apply a boost to the underrepresented group to ensure fairness.
    const hasDisparity = await this.checkActiveDisparityFlags(jobId);
    if (hasDisparity) {
      adjustment += 0.05;
    }

    return Math.max(0, Math.min(1.0, baseScore + adjustment));
  }

  /**
   * Detects if the candidate belongs to an overrepresented 'prestige' group
   * based on historical feedback patterns.
   */
  private isFromHighPrestigeGroup(candidate: any): boolean {
    const text = JSON.stringify(candidate.seeker || {}).toLowerCase();
    // Example: Overfitting on specific big-name institutions or companies
    const prestigeKeywords = ['top tier university', 'fortune 500', 'lead engineer'];
    return prestigeKeywords.some(kw => text.includes(kw));
  }

  private async checkActiveDisparityFlags(jobId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('match_disparity_flags')
      .select('id')
      .eq('job_id', jobId)
      .eq('reviewed', false)
      .limit(1);
    
    return (data || []).length > 0;
  }
}

export const biasCorrectionEngine = new BiasCorrectionEngine();
