import { matchJobToSeeker } from "../agent";

export class MatchingService {
  /**
   * Wrapper for the existing deterministic scoring engine.
   * This represents the 60% Structured Rule component.
   */
  static async calculateBaseScore(jobId: string, jobseekerId: string) {
    // We reuse the existing logic but pass a flag to skip LLM generation
    const result = await matchJobToSeeker(jobId, jobseekerId, undefined);
    
    if (!result.ok) {
      return { utility_score: 0 };
    }

    return {
      utility_score: result.value.result.utility_score,
      details: result.value.result
    };
  }
}
