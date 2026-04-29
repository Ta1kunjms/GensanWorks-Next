/**
 * feedback-filter-engine.ts
 * Filters and Purifies Noisy Recruiter Feedback
 */

export class FeedbackFilterEngine {
  /**
   * Assigns confidence to signals and filters out noise.
   * High confidence: interview/hire decisions.
   * Low confidence: rapid rejections or short view times.
   */
  public filterRecruiterSignals(signals: any[]): any[] {
    return signals.filter(signal => {
      // Rule 1: Rejection in less than 5 seconds is likely 'noise' or 'prejudice'
      if (signal.interaction_type === 'rejected' && (signal.metadata?.view_duration_ms || 10000) < 5000) {
        return false;
      }

      // Rule 2: Multiple conflicting signals from same recruiter (rare but possible)
      if (signal.metadata?.is_conflicting) return false;

      return true;
    });
  }

  /**
   * Weights the signal based on its 'hardness'
   */
  public getSignalConfidence(type: string): number {
    switch (type) {
      case 'hired': return 1.0;
      case 'interview_selected': return 0.8;
      case 'clicked_profile': return 0.4;
      default: return 0.2;
    }
  }
}

export const feedbackFilterEngine = new FeedbackFilterEngine();
