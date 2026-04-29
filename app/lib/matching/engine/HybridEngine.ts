import { DataFetcher } from "./DataFetcher";
import { scoringEngine } from "../scoring-engine";
import { rankingCacheEngine } from "../ranking-cache-engine";
import { featureStore } from "../feature-store";
import { latencyBudgetEngine } from "../latency-budget-engine";
import { observabilityEngine } from "../observability-engine";
import { featureFreshnessEngine } from "../feature-freshness-engine";
import { failsafeEngine } from "../failsafe-engine";

export class HybridEngine {
  /**
   * ENTERPRISE-GRADE AI RANKING INFRASTRUCTURE
   * High-Performance, Observable, and Fault-Tolerant.
   */
  static async match(jobId: string) {
    const startTime = Date.now();
    let cacheHit = false;
    let fallbackTriggered = false;

    try {
      return await latencyBudgetEngine.executeWithSLA(
        jobId,
        async () => {
          // 1. Check Result Cache
          const cached = await rankingCacheEngine.getCachedResults(jobId);
          if (cached) {
            cacheHit = true;
            this.logMetrics(jobId, startTime, true, false);
            return cached;
          }

          // 2. Vector Retrieval
          let candidates = await DataFetcher.fetchRawVector(jobId, 100);

          // Fallback to SQL Keyword Search if Vector is empty or fails
          if (!candidates || candidates.length === 0) {
            console.log(`[Matching] Vector results empty. Falling back to SQL search.`);
            candidates = await DataFetcher.fetchRawSQL(jobId, 100);
          }

          // 3. Feature Store + Freshness Check
          const seekerIds = candidates.map(c => c.id);
          const features = await featureStore.getBatchFeatures(seekerIds);
          
          let totalStaleness = 0;
          const results = candidates.map(c => {
            const f = features.get(c.id);
            if (f) {
              // Check freshness for skill similarity as a proxy for feature health
              totalStaleness += 1 - featureFreshnessEngine.checkFeatureFreshness(new Date().toISOString(), 'skill_similarity');
            }
            const score = scoringEngine.calculateOnlineScore(f || this.getDefaultFeatures());
            return { id: c.id, utility_score: score * 100 };
          }).sort((a, b) => b.utility_score - a.utility_score);

          // 4. Async Pipeline Trigger
          this.triggerOfflinePipeline(jobId);

          this.logMetrics(jobId, startTime, false, false, totalStaleness / (candidates.length || 1));
          return results;
        },
        async () => {
          fallbackTriggered = true;
          const res = await failsafeEngine.getSafeRankingResponse(jobId);
          this.logMetrics(jobId, startTime, false, true);
          return res;
        }
      );
    } catch (error) {
      fallbackTriggered = true;
      const res = await failsafeEngine.getSafeRankingResponse(jobId, error);
      this.logMetrics(jobId, startTime, false, true);
      return res;
    }
  }

  private static logMetrics(jobId: string, start: number, cacheHit: boolean, fallback: boolean, staleness: number = 0) {
    observabilityEngine.trackRankingMetrics({
      job_id: jobId,
      duration_ms: Date.now() - start,
      cache_hit: cacheHit,
      fallback_triggered: fallback,
      feature_staleness: staleness
    }).catch(e => console.error('[Observability] Silent failure in metrics logging', e));
  }

  private static triggerOfflinePipeline(jobId: string) {
    // console.log('[Queue] Triggering intelligence refresh for', jobId);
  }

  private static getDefaultFeatures() {
    return { skill_match_score: 0.5, experience_match_score: 0.5, ontology_score: 0.5 };
  }
}
