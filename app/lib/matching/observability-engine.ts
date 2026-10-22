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
  private static missingTableWarned = false;

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
      // The metrics table is optional; when it is not deployed, say so once instead of erroring on every run.
      if (error.code === 'PGRST205' || error.code === '42P01') {
        if (!ObservabilityEngine.missingTableWarned) {
          ObservabilityEngine.missingTableWarned = true;
          console.warn('[Observability] system_observability_logs is not deployed; ranking metrics are not stored.');
        }
        return;
      }
      console.error('[Observability] Failed to log metrics:', { code: error.code });
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
