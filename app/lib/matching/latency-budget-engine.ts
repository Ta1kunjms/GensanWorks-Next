/**
 * latency-budget-engine.ts
 * Enforces SLA (<300ms) and triggers fallbacks.
 */

export class LatencyBudgetEngine {
  private SLA_THRESHOLD_MS = 300;

  /**
   * Wraps a function and enforces the latency budget.
   */
  public async executeWithSLA<T>(
    jobId: string, 
    onlinePath: () => Promise<T>, 
    fallbackPath: () => Promise<T>
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("SLA Timeout")), this.SLA_THRESHOLD_MS);
    });

    try {
      // Race the online path against the timeout
      return await Promise.race([onlinePath(), timeoutPromise]);
    } catch (error: any) {
      if (error.message === "SLA Timeout") {
        console.warn(`[Latency SLA] Online path timed out. Triggering fallback.`);
      } else {
        console.error(`[Latency SLA] Online path failed:`, error);
      }
      return await fallbackPath();
    }
  }
}

export const latencyBudgetEngine = new LatencyBudgetEngine();
