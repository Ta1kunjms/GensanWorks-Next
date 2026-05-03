/**
 * load-test-suite.ts
 * Simulates high-concurrency traffic to measure system performance and reliability.
 */

import { HybridEngine } from "./engine/HybridEngine";

export interface LoadTestMetrics {
  p50: number;
  p95: number;
  p99: number;
  cache_hit_ratio: number;
  fallback_rate: number;
  total_requests: number;
}

export class LoadTestSuite {
  /**
   * Runs a simulated load test for a specific job.
   */
  public async runLoadTestSimulation(jobId: string, concurrency: number): Promise<LoadTestMetrics> {
    const latencies: number[] = [];
    let cacheHits = 0;
    let fallbacks = 0;

    const requests = Array.from({ length: concurrency }).map(async () => {
      const start = Date.now();
      try {
        const result = await HybridEngine.match(jobId);
        const latency = Date.now() - start;
        latencies.push(latency);
        
        // Infer cache hit and fallback from dummy results for simulation
        // In reality, this would be scraped from observability logs
        if (latency < 50) cacheHits++;
      } catch (e) {
        fallbacks++;
      }
    });

    await Promise.all(requests);

    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    return {
      p50: sortedLatencies[Math.floor(concurrency * 0.5)] || 0,
      p95: sortedLatencies[Math.floor(concurrency * 0.95)] || 0,
      p99: sortedLatencies[Math.floor(concurrency * 0.99)] || 0,
      cache_hit_ratio: cacheHits / concurrency,
      fallback_rate: fallbacks / concurrency,
      total_requests: concurrency
    };
  }
}

export const loadTestSuite = new LoadTestSuite();
