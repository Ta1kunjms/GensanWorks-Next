/**
 * cache-invalidation-engine.ts
 * Manages precise invalidation triggers for the ranking cache.
 */

import { rankingCacheEngine } from "./ranking-cache-engine";

export class CacheInvalidationEngine {
  /**
   * Invalidates job ranking cache based on system events.
   */
  public async invalidateOnEvent(event: 'new_applicant' | 'job_updated' | 'feedback_threshold', jobId: string) {
    switch (event) {
      case 'job_updated':
        await rankingCacheEngine.invalidate(jobId);
        break;
      case 'new_applicant':
        // For new applicants, we might want to invalidate to show the new candidate
        await rankingCacheEngine.invalidate(jobId);
        break;
      case 'feedback_threshold':
        // If enough feedback gathered, invalidate to re-rank with new intelligence
        await rankingCacheEngine.invalidate(jobId);
        break;
    }
  }
}

export const cacheInvalidationEngine = new CacheInvalidationEngine();
