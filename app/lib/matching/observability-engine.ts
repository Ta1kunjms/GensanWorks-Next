/**
 * observability-engine.ts
 * Real-time monitoring and metrics for the AI Ranking Engine.
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface SystemMetrics {
  duration_ms: number;
  cache_hit: boolean;
  feature_staleness: number;
  fallback_triggered: boolean;
  job_id: string;
}

export class ObservabilityEngine {
  /**
   * Tracks and logs ranking performance metrics.
   */
  public async trackRankingMetrics(metrics: SystemMetrics) {
    const { error } = await supabaseAdmin.from('system_observability_logs').insert({
      job_id: metrics.job_id,
      duration_ms: metrics.duration_ms,
      cache_hit: metrics.cache_hit,
      feature_staleness: metrics.feature_staleness,
      fallback_triggered: metrics.fallback_triggered,
      captured_at: new Date().toISOString()
    });

    if (error) {
      console.error('[Observability] Failed to log metrics:', error);
    }
  }

  /**
   * Mock for queue/LLM usage metrics (in production, queries BullMQ/API logs)
   */
  public async getExternalMetrics() {
    return {
      queue_backlog: 0,
      llm_usage_today: 150,
      failed_jobs_24h: 2
    };
  }
}

export const observabilityEngine = new ObservabilityEngine();
