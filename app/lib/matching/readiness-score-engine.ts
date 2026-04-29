/**
 * readiness-score-engine.ts
 * Computes a weighted score to determine if the system is ready for launch.
 */

import { performanceAnalyzer } from "./performance-analyzer";
import { loadTestSuite } from "./load-test-suite";

export class ReadinessScoreEngine {
  /**
   * Computes the overall production readiness score (0-100).
   */
  public async getProductionReadinessScore(jobId: string) {
    const perf = await performanceAnalyzer.analyzeSystemPerformance();
    const load = await loadTestSuite.runLoadTestSimulation(jobId, 10); // Minimal load for score

    const latencyScore = Math.max(0, 100 - (perf.avg_latency / 3)); // 300ms SLA
    const cacheScore = load.cache_hit_ratio * 100;
    const stabilityScore = (1 - load.fallback_rate) * 100;

    // Weighted average
    const finalScore = Math.round(
      (latencyScore * 0.3) + 
      (cacheScore * 0.2) + 
      (stabilityScore * 0.5) // Failsafe recovery is critical
    );

    let status: 'READY' | 'NEEDS_OPTIMIZATION' | 'NOT_READY' = 'NOT_READY';
    if (finalScore >= 85) status = 'READY';
    else if (finalScore >= 60) status = 'NEEDS_OPTIMIZATION';

    return {
      readiness_score: finalScore,
      status,
      blockers: finalScore < 60 ? ['High latency or low stability detected'] : [],
      recommendations: perf.report
    };
  }
}

export const readinessScoreEngine = new ReadinessScoreEngine();
