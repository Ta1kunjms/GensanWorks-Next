/**
 * feature-freshness-engine.ts
 * Detects and manages stale data in the feature store.
 */

export class FeatureFreshnessEngine {
  private TTL_CONFIG = {
    skill_similarity: 7, // days
    experience_vectors: 14,
    ontology_scores: 30
  };

  /**
   * Checks staleness of feature data.
   * Returns a score (0-1) where 1 is completely fresh.
   */
  public checkFeatureFreshness(lastUpdated: string, type: keyof typeof this.TTL_CONFIG): number {
    const updatedAt = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    const ageDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
    
    const ttl = this.TTL_CONFIG[type];
    const freshness = Math.max(0, 1 - (ageDays / ttl));

    if (freshness < 0.2) {
      this.triggerAsyncRefresh(type);
    }

    return freshness;
  }

  private triggerAsyncRefresh(type: string) {
    // console.log(`[Freshness] Triggering background refresh for ${type}`);
    // In production, pushes to BullMQ
  }
}

export const featureFreshnessEngine = new FeatureFreshnessEngine();
