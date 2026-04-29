/**
 * cost-control-engine.ts
 * Manages Compute Budgets and Latency Safeguards
 */

export class CostControlEngine {
  private dailyBudget: number = 50.00; // USD
  private currentSpend: number = 0;

  /**
   * Enforces compute limits. If budget is tight, falls back to faster models or deterministic scoring.
   */
  public shouldThrottleLLM(): boolean {
    if (this.currentSpend > this.dailyBudget * 0.9) return true;
    return false;
  }

  /**
   * Estimates cost of a rerank operation
   */
  public logLLMUsage(tokens: number) {
    // ~$0.000001 per token for Llama-3-70B on some providers
    this.currentSpend += tokens * 0.000001;
  }

  /**
   * If pool is too large, budget forces a smaller rerank size
   */
  public getOptimizedRerankSize(poolSize: number): number {
    if (this.shouldThrottleLLM()) return Math.min(5, poolSize);
    return Math.min(20, poolSize);
  }
}

export const costControlEngine = new CostControlEngine();
