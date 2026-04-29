/**
 * performance-analyzer.ts
 * Analyzes the request lifecycle to identify latency bottlenecks.
 */

import { supabaseAdmin } from "@/lib/supabase";

export class PerformanceAnalyzer {
  /**
   * Analyzes observability logs to identify slow modules.
   */
  public async analyzeSystemPerformance(): Promise<{ slowest_module: string; avg_latency: number; report: string }> {
    const { data } = await supabaseAdmin
      .from('system_observability_logs')
      .select('duration_ms, cache_hit')
      .order('captured_at', { ascending: false })
      .limit(100);

    if (!data || data.length === 0) {
      return { slowest_module: 'N/A', avg_latency: 0, report: 'No performance data available.' };
    }

    const totalLatency = data.reduce((acc, row) => acc + row.duration_ms, 0);
    const avgLatency = totalLatency / data.length;

    // Identify bottleneck logic
    const misses = data.filter(row => !row.cache_hit);
    const avgMissLatency = misses.length > 0 ? misses.reduce((acc, row) => acc + row.duration_ms, 0) / misses.length : 0;

    let slowest = 'Unknown';
    let recommendation = 'Increase cache TTL';

    if (avgMissLatency > 250) {
      slowest = 'Feature Store / Scoring Engine';
      recommendation = 'Optimize pgvector query or precompute more features.';
    }

    return {
      slowest_module: slowest,
      avg_latency: avgLatency,
      report: `Average Latency: ${Math.round(avgLatency)}ms. Recommendation: ${recommendation}`
    };
  }
}

export const performanceAnalyzer = new PerformanceAnalyzer();
