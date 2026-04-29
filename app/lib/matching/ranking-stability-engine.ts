/**
 * ranking-stability-engine.ts
 * Ensures Deterministic and Persistent Ranking Results
 */

import crypto from 'node:crypto';

export class RankingStabilityEngine {
  private cache: Map<string, any[]> = new Map();

  /**
   * Generates a stable ranking by caching outputs per job_id and controlling randomness seeds.
   */
  public getCachedRanking(jobId: string, inputHash: string): any[] | null {
    const key = `${jobId}:${inputHash}`;
    return this.cache.get(key) || null;
  }

  public setCachedRanking(jobId: string, inputHash: string, ranking: any[]) {
    const key = `${jobId}:${inputHash}`;
    this.cache.set(key, ranking);
  }

  /**
   * Generates a deterministic "random" factor for exploration.
   * Ensures the same candidate gets the same exploration boost for the same job.
   */
  public getDeterministicSeed(jobId: string, seekerId: string): number {
    const hash = crypto.createHash('md5').update(jobId + seekerId).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  }
}

export const rankingStabilityEngine = new RankingStabilityEngine();
