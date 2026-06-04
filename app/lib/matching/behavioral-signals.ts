import type { SupabaseClient } from '@supabase/supabase-js';

export interface InteractionEvent {
  jobseeker_id: string;
  job_id: string;
  event_type: 'view' | 'save' | 'apply' | 'ignore' | 'click';
  created_at: string;
}

export interface BehavioralSignal {
  jobseeker_id: string;
  job_id: string;
  bayesian_score: number;
  interaction_count: number;
  signal_strength: 'strong' | 'moderate' | 'weak' | 'none';
  window_days: number;
  computed_at: string;
  note: string;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  apply: 1.00,
  save: 0.70,
  click: 0.40,
  view: 0.20,
  ignore: -0.30,
};

const BAYESIAN_PRIOR = 0.5;
const WINDOW_DAYS = 14;

export function computeBehavioralScore(
  events: InteractionEvent[],
  jobseekerId: string,
  jobId: string
): BehavioralSignal {
  let sumWeighted = 0;
  for (const event of events) {
    const weight = SIGNAL_WEIGHTS[event.event_type] ?? 0;
    sumWeighted += weight;
  }

  const totalInteractions = events.length;
  const posterior = BAYESIAN_PRIOR + sumWeighted / (1 + totalInteractions);
  const bayesian_score = Math.max(0, Math.min(1, posterior));

  let signal_strength: BehavioralSignal['signal_strength'];
  if (bayesian_score >= 0.70) signal_strength = 'strong';
  else if (bayesian_score >= 0.50) signal_strength = 'moderate';
  else if (bayesian_score >= 0.30) signal_strength = 'weak';
  else signal_strength = 'none';

  return {
    jobseeker_id: jobseekerId,
    job_id: jobId,
    bayesian_score,
    interaction_count: totalInteractions,
    signal_strength,
    window_days: WINDOW_DAYS,
    computed_at: new Date().toISOString(),
    note: bayesian_score > BAYESIAN_PRIOR
      ? `Positive behavioral signal (${totalInteractions} interactions, score: ${(bayesian_score * 100).toFixed(0)}%)`
      : `Neutral or negative behavioral signal (${totalInteractions} interactions, score: ${(bayesian_score * 100).toFixed(0)}%)`,
  };
}

export async function fetchBehavioralSignals(
  supabase: SupabaseClient,
  jobId: string
): Promise<BehavioralSignal[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);

  const { data, error } = await supabase
    .from('jobseeker_interactions')
    .select('jobseeker_id, job_id, event_type, created_at')
    .eq('job_id', jobId)
    .gte('created_at', cutoff.toISOString());

  if (error || !data || data.length === 0) return [];

  const grouped = new Map<string, InteractionEvent[]>();
  for (const row of data as InteractionEvent[]) {
    const key = row.jobseeker_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const results: BehavioralSignal[] = [];
  for (const [jsId, events] of grouped.entries()) {
    results.push(computeBehavioralScore(events, jsId, jobId));
  }

  return results;
}

export function neutralPrior(jobseekerId: string, jobId: string): BehavioralSignal {
  return {
    jobseeker_id: jobseekerId,
    job_id: jobId,
    bayesian_score: 0.5,
    interaction_count: 0,
    signal_strength: 'none',
    window_days: WINDOW_DAYS,
    computed_at: new Date().toISOString(),
    note: 'No interaction data yet — using neutral prior. This module activates automatically after 14 days of usage.',
  };
}
