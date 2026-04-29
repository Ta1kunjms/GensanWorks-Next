/**
 * feedback-engine.ts
 * Recruiter Feedback & Learning-to-Rank Signals
 */

import { supabaseAdmin } from "@/lib/supabase";

export type InteractionType = 'clicked_profile' | 'interview_selected' | 'hired' | 'rejected' | 'time_spent_viewing';

const FEEDBACK_WEIGHTS: Record<InteractionType, number> = {
  hired: 1.0,
  interview_selected: 0.5,
  clicked_profile: 0.2,
  time_spent_viewing: 0.1,
  rejected: -1.0
};

export class FeedbackEngine {
  /**
   * Log an interaction and persist to Supabase.
   */
  public async logInteraction(jobId: string, seekerId: string, type: InteractionType, metadata?: any) {
    const { error } = await supabaseAdmin.from('match_feedback_logs').insert({
      job_id: jobId,
      jobseeker_id: seekerId,
      interaction_type: type,
      weight: FEEDBACK_WEIGHTS[type],
      metadata,
      captured_at: new Date().toISOString()
    });

    if (error) console.error('Failed to log match feedback:', error);
  }

  /**
   * Computes a feedback adjustment score for a candidate.
   * This score can be added to the final ranking utility.
   */
  public async getFeedbackAdjustment(jobId: string, seekerId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('match_feedback_logs')
      .select('weight')
      .eq('job_id', jobId)
      .eq('jobseeker_id', seekerId);

    if (!data || data.length === 0) return 0;

    // Sum weights and cap at +/- 0.2 adjustment
    const total = data.reduce((acc, row) => acc + (row.weight || 0), 0);
    return Math.max(-0.2, Math.min(0.2, total));
  }
}

export const feedbackEngine = new FeedbackEngine();
