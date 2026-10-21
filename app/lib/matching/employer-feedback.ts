import type { SupabaseClient } from '@supabase/supabase-js';

export interface HiringOutcome {
  job_id: string;
  jobseeker_id: string;
  employer_id: string;
  outcome: 'hired' | 'shortlisted' | 'interviewed' | 'rejected' | 'withdrew';
  match_score_at_decision: number;
  dimension_scores_snapshot: Record<string, number>;
  employer_notes?: string | null;
}

export interface RecalibrationSignal {
  job_id: string;
  sample_size: number;
  hire_rate: number;
  avg_score_hired: number;
  avg_score_rejected: number;
  score_discrimination: number;
  recalibration_needed: boolean;
  note: string;
}

export async function recordHiringOutcome(
  supabase: SupabaseClient,
  outcome: HiringOutcome
): Promise<void> {
  const { error } = await supabase.from('employer_hiring_outcomes').insert({
    job_id: outcome.job_id,
    jobseeker_id: outcome.jobseeker_id,
    employer_id: outcome.employer_id,
    outcome: outcome.outcome,
    match_score_at_decision: outcome.match_score_at_decision,
    dimension_scores_snapshot: outcome.dimension_scores_snapshot,
    employer_notes: outcome.employer_notes ?? null,
  });

  if (error) throw new Error(`Failed to record hiring outcome: ${error.message}`);
}

export async function computeRecalibrationSignal(
  supabase: SupabaseClient,
  jobId: string
): Promise<RecalibrationSignal | null> {
  const { data, error } = await supabase
    .from('employer_hiring_outcomes')
    .select('outcome, match_score_at_decision')
    .eq('job_id', jobId);

  if (error) throw new Error(`Failed to fetch outcomes: ${error.message}`);
  if (!data || data.length < 5) return null;

  const hired = data.filter(r => r.outcome === 'hired').map(r => r.match_score_at_decision);
  const rejected = data.filter(r => r.outcome === 'rejected').map(r => r.match_score_at_decision);
  const all = data.length;
  const hireRate = hired.length / all;

  const avgHired = hired.length > 0
    ? hired.reduce((s, v) => s + v, 0) / hired.length
    : 0;
  const avgRejected = rejected.length > 0
    ? rejected.reduce((s, v) => s + v, 0) / rejected.length
    : 0;
  const discrimination = avgHired - avgRejected;
  const recalibrationNeeded = discrimination < 10;

  return {
    job_id: jobId,
    sample_size: all,
    hire_rate: Math.round(hireRate * 100) / 100,
    avg_score_hired: Math.round(avgHired * 100) / 100,
    avg_score_rejected: Math.round(avgRejected * 100) / 100,
    score_discrimination: Math.round(discrimination * 100) / 100,
    recalibration_needed: recalibrationNeeded,
    note: recalibrationNeeded
      ? `Score discrimination is weak (${(discrimination).toFixed(1)} pts). Consider recalibrating dimension weights.`
      : `Score discrimination is adequate (${(discrimination).toFixed(1)} pts). Model is predictive.`,
  };
}
