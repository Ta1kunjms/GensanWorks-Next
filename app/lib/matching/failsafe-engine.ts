/**
 * failsafe-engine.ts
 * Robust fallback routing for the AI Ranking Engine.
 */

import { DataFetcher } from "./engine/DataFetcher";

export class FailsafeEngine {
  /**
   * Ensures a valid ranking response even if subsystems fail.
   */
  public async getSafeRankingResponse(jobId: string, error?: any): Promise<any[]> {
    console.error(`[Failsafe] Triggered for Job:${jobId}`, error);

    try {
      // Level 1 Fallback: Pure Vector Search
      const vectorResults = await DataFetcher.fetchRawVector(jobId, 50);
      if (vectorResults && vectorResults.length > 0) {
        return vectorResults.map(r => ({ id: r.id, utility_score: r.score * 100 }));
      }

      // Level 2 Fallback: Basic Keyword Search
      const sqlResults = await DataFetcher.fetchRawSQL(jobId, 20);
      if (sqlResults && sqlResults.length > 0) {
        return sqlResults.map(r => ({ id: r.id, utility_score: r.score * 100 }));
      }

      return [];
    } catch (criticalError) {
      console.error('[Failsafe] CRITICAL: Even fallback failed.', criticalError);
      return [];
    }
  }
}

export const failsafeEngine = new FailsafeEngine();
