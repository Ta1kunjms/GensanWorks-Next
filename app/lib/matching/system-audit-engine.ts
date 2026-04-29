/**
 * system-audit-engine.ts
 * Final Gatekeeper: Orchestrates the full validation and hardening suite.
 */

import { loadTestSuite } from "./load-test-suite";
import { rankingCorrectnessTest } from "./ranking-correctness-test";
import { chaosTestEngine } from "./chaos-test-engine";
import { performanceAnalyzer } from "./performance-analyzer";
import { readinessScoreEngine } from "./readiness-score-engine";

export class SystemAuditEngine {
  /**
   * Runs the full production audit suite.
   */
  public async runFullAudit(jobId: string) {
    console.log(`[Audit] Starting production audit for Job:${jobId}`);

    // 1. Ranking Consistency
    const consistency = await rankingCorrectnessTest.validateRankingConsistency(jobId);
    
    // 2. Resilience (Chaos)
    const resilience = await chaosTestEngine.runChaosSimulation(jobId);

    // 3. Performance & Load
    const loadResults = await loadTestSuite.runLoadTestSimulation(jobId, 50);

    // 4. Bottleneck Analysis
    const bottlenecks = await performanceAnalyzer.analyzeSystemPerformance();

    // 5. Final Readiness
    const readiness = await readinessScoreEngine.getProductionReadinessScore(jobId);

    const report = {
      timestamp: new Date().toISOString(),
      job_id: jobId,
      verdict: readiness.status,
      readiness_score: readiness.readiness_score,
      tests: {
        consistency: consistency.success ? 'PASS' : 'FAIL',
        resilience: resilience.surviving ? 'PASS' : 'FAIL',
        load_performance: loadResults.p95 < 300 ? 'PASS' : 'DEGRADED'
      },
      metrics: {
        p95_latency: loadResults.p95,
        cache_hit_ratio: loadResults.cache_hit_ratio,
        fallback_rate: loadResults.fallback_rate
      },
      recommendations: readiness.recommendations,
      blockers: readiness.blockers
    };

    console.log(`[Audit] Audit Complete. Verdict: ${readiness.status} (Score: ${readiness.readiness_score})`);
    return report;
  }
}

export const systemAuditEngine = new SystemAuditEngine();
