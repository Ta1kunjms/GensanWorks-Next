/**
 * billing-engine.ts
 * Tracks AI compute usage and enforces tenant-specific budget limits.
 */

import { supabaseAdmin } from "@/lib/supabase";

export class BillingEngine {
  /**
   * Records AI usage for a specific tenant.
   */
  public async trackUsage(tenantId: string, type: 'embedding' | 'llm_rerank' | 'ranking_request', amount: number = 1) {
    const { error } = await supabaseAdmin.from('tenant_usage_logs').insert({
      tenant_id: tenantId,
      usage_type: type,
      amount: amount,
      captured_at: new Date().toISOString()
    });

    if (error) console.error('[Billing] Failed to log usage:', error);
  }

  /**
   * Checks if a tenant has exceeded their monthly quota.
   */
  public async isWithinLimit(tenantId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('tenant_usage_stats')
      .select('monthly_limit, current_usage')
      .eq('tenant_id', tenantId)
      .single();

    if (!data) return true; // Default to free tier
    return data.current_usage < data.monthly_limit;
  }
}

export const billingEngine = new BillingEngine();
