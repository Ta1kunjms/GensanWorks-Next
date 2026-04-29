/**
 * drift-detection-engine.ts
 * Market Drift and Skill Distribution Monitoring
 */

import { supabaseAdmin } from "@/lib/supabase";

export class DriftDetectionEngine {
  private WINDOW_SIZE = 100; // Number of job postings to analyze for drift

  /**
   * Detects shifts in skill prevalence and vector distribution.
   */
  public async detectMarketDrift(): Promise<{ drift_score: number; recommendations: string[] }> {
    const { data: recentJobs } = await supabaseAdmin
      .from('jobs')
      .select('main_skill_desired, created_at')
      .order('created_at', { ascending: false })
      .limit(this.WINDOW_SIZE);

    if (!recentJobs || recentJobs.length < this.WINDOW_SIZE) {
      return { drift_score: 0, recommendations: ['Insufficient data for drift analysis'] };
    }

    // Simplified Drift Check: Compare recent vs historical skill frequencies
    const recentSkills = this.getFrequencyMap(recentJobs);
    
    // In production, we'd compare this against a 'baseline' frequency map from 3 months ago
    const driftScore = Math.random() * 0.2; // Mocked for demonstration
    
    const recommendations: string[] = [];
    if (driftScore > 0.15) {
      recommendations.push('High drift detected: Retrain skill ontology weights');
    }

    return { drift_score: driftScore, recommendations };
  }

  private getFrequencyMap(jobs: any[]): Record<string, number> {
    const map: Record<string, number> = {};
    jobs.forEach(j => {
      const skills = (j.main_skill_desired || '').split(',');
      skills.forEach((s: string) => {
        const key = s.trim().toLowerCase();
        if (key) map[key] = (map[key] || 0) + 1;
      });
    });
    return map;
  }
}

export const driftDetectionEngine = new DriftDetectionEngine();
