import { supabaseAdmin } from "../supabase";

export interface MatchScoreResult {
  jobseeker_id: string;
  utility_score: number;
  logistics_zone: string;
  education_level: string;
}

const DEFAULT_DEVIATION_THRESHOLD = Number(process.env.MATCHING_DISPARITY_DEVIATION_THRESHOLD ?? 0.15);
const DEFAULT_MIN_GROUP_SIZE = Number(process.env.MATCHING_DISPARITY_MIN_GROUP_SIZE ?? 3);

/**
 * Bias monitor: analyzes a batch of match scores for systemic disparity.
 * It keeps the existing average-deviation rule and adds a KS test for distribution drift.
 */
export async function monitorDisparity(jobId: string, scores: MatchScoreResult[]): Promise<number> {
  if (scores.length < DEFAULT_MIN_GROUP_SIZE) return 0;

  const overallAvg = average(scores.map((score) => score.utility_score));
  let insertedFlags = 0;

  const zoneGroups = groupBy(scores, "logistics_zone");
  insertedFlags += await checkDisparity(jobId, zoneGroups, overallAvg, scores, "LOCATION_DISPARITY");

  const educationGroups = groupBy(scores, "education_level");
  insertedFlags += await checkDisparity(jobId, educationGroups, overallAvg, scores, "EDUCATION_DISPARITY");

  return insertedFlags;
}

async function checkDisparity(
  jobId: string,
  groups: Record<string, MatchScoreResult[]>,
  overallAvg: number,
  allScores: MatchScoreResult[],
  type: "LOCATION_DISPARITY" | "EDUCATION_DISPARITY"
) {
  let inserted = 0;

  for (const [groupValue, groupScores] of Object.entries(groups)) {
    if (groupScores.length < DEFAULT_MIN_GROUP_SIZE) continue;

    const groupValues = groupScores.map((score) => score.utility_score);
    const overallValues = allScores.map((score) => score.utility_score);
    const groupAvg = average(groupValues);
    const deviationPct = overallAvg === 0 ? 0 : ((groupAvg - overallAvg) / overallAvg) * 100;
    const ksPValue = ksTestPValue(groupValues, overallValues);

    if (deviationPct < -(DEFAULT_DEVIATION_THRESHOLD * 100) || ksPValue < 0.05) {
      const { error } = await supabaseAdmin.from("match_disparity_flags").insert({
        job_id: jobId,
        flag_type: type,
        affected_group: groupValue,
        avg_score_overall: overallAvg,
        avg_score_group: groupAvg,
        deviation_pct: Math.abs(deviationPct),
        candidate_count: groupScores.length,
        statistical_test: "ks",
        p_value: ksPValue,
        reviewed: false,
        disparity_reviewed_by: null,
        disparity_reviewed_at: null,
        review_notes: null,
        flagged_at: new Date().toISOString(),
      });

      if (!error) inserted += 1;
    }
  }

  return inserted;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const value = String(item[key]);
    if (!acc[value]) acc[value] = [];
    acc[value].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function ksTestPValue(sampleA: number[], sampleB: number[]): number {
  if (!sampleA.length || !sampleB.length) return 1;

  const sortedA = [...sampleA].sort((left, right) => left - right);
  const sortedB = [...sampleB].sort((left, right) => left - right);
  let indexA = 0;
  let indexB = 0;
  let cdfA = 0;
  let cdfB = 0;
  let d = 0;

  while (indexA < sortedA.length && indexB < sortedB.length) {
    const valueA = sortedA[indexA]!;
    const valueB = sortedB[indexB]!;
    if (valueA <= valueB) {
      while (indexA < sortedA.length && sortedA[indexA] === valueA) indexA += 1;
      cdfA = indexA / sortedA.length;
    }
    if (valueB <= valueA) {
      while (indexB < sortedB.length && sortedB[indexB] === valueB) indexB += 1;
      cdfB = indexB / sortedB.length;
    }
    d = Math.max(d, Math.abs(cdfA - cdfB));
  }

  const nEff = (sortedA.length * sortedB.length) / (sortedA.length + sortedB.length);
  const lambda = (Math.sqrt(nEff) + 0.12 + 0.11 / Math.sqrt(nEff)) * d;
  const pValue = 2 * Math.exp(-2 * lambda * lambda);
  return Math.max(0, Math.min(1, pValue));
}
