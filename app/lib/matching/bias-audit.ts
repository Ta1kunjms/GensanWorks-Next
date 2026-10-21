import type { SupabaseClient } from '@supabase/supabase-js';

export type DemographicDimension =
  | 'gender'
  | 'age_bracket'
  | 'logistics_zone'
  | 'education_level';

export type FlagLevel = 'none' | 'low' | 'high';

export interface GroupStats {
  groupValue: string;
  n: number;
  meanScore: number;
  stddev: number;
  scores: number[];
}

export interface BiasAuditRecord {
  dimension: DemographicDimension;
  groupValue: string;
  n: number;
  meanScore: number;
  overallMean: number;
  deviationPct: number;
  pValue: number;
  ksStatistic: number;
  cohensD: number;
  flagLevel: FlagLevel;
  interpretation: string;
}

export interface FormCompletionFlag {
  group: string;
  count: number;
  meanScore: number;
  flagLevel: FlagLevel;
  interpretation: string;
}

export interface BiasAuditReport {
  jobId: string;
  auditedAt: string;
  totalCandidates: number;
  overallMeanScore: number;
  overallStddev: number;
  records: BiasAuditRecord[];
  flags: BiasAuditRecord[];
  passed: boolean;
  summary: string;
  formCompletionFlags?: FormCompletionFlag[];
}

function ksTwoSample(sample1: number[], sample2: number[]): { D: number; pValue: number } {
  if (sample1.length < 2 || sample2.length < 2) {
    return { D: 0, pValue: 1 };
  }

  const sorted1 = [...sample1].sort((a, b) => a - b);
  const sorted2 = [...sample2].sort((a, b) => a - b);
  const n1 = sorted1.length;
  const n2 = sorted2.length;

  let i = 0, j = 0, maxD = 0;

  while (i < n1 && j < n2) {
    const cdf1 = (i + 1) / n1;
    const cdf2 = (j + 1) / n2;

    if ((sorted1[i] ?? 0) <= (sorted2[j] ?? 0)) {
      i++;
    } else {
      j++;
    }

    const D = Math.abs(cdf1 - cdf2);
    if (D > maxD) maxD = D;
  }

  const en = Math.sqrt((n1 * n2) / (n1 + n2));
  const lambda = (en + 0.12 + 0.11 / en) * maxD;

  let pValue = 0;
  for (let k = 1; k <= 100; k++) {
    pValue += (k % 2 === 0 ? -1 : 1) * Math.exp(-2 * k * k * lambda * lambda);
  }
  pValue = Math.min(1, Math.max(0, 2 * pValue));

  return { D: maxD, pValue };
}

function cohensD(group: number[], overall: number[]): number {
  if (group.length < 2 || overall.length < 2) return 0;

  const mean1 = group.reduce((s, v) => s + v, 0) / group.length;
  const mean2 = overall.reduce((s, v) => s + v, 0) / overall.length;

  const var1 = group.reduce((s, v) => s + (v - mean1) ** 2, 0) / (group.length - 1);
  const var2 = overall.reduce((s, v) => s + (v - mean2) ** 2, 0) / (overall.length - 1);

  const pooledStd = Math.sqrt(
    ((group.length - 1) * var1 + (overall.length - 1) * var2) /
    (group.length + overall.length - 2),
  );

  if (pooledStd === 0) return 0;
  return (mean1 - mean2) / pooledStd;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function toAgeBracket(ageOrDob: number | string | null): string {
  if (ageOrDob === null || ageOrDob === undefined) return 'unknown';

  let age: number;

  if (typeof ageOrDob === 'string') {
    const dob = new Date(ageOrDob);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  } else {
    age = ageOrDob;
  }

  if (age < 18) return 'under_18';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  return '55+';
}

function determineFlagLevel(
  pValue: number,
  cohensD: number,
  deviationPct: number,
  n: number,
): FlagLevel {
  const absD = Math.abs(cohensD);
  const absDevPct = Math.abs(deviationPct);

  if (
    n >= 5 &&
    pValue < 0.05 &&
    (absD >= 0.50 || absDevPct >= 15)
  ) {
    return 'high';
  }

  if (
    n >= 3 &&
    (pValue < 0.10 || absD >= 0.20 || absDevPct >= 10)
  ) {
    return 'low';
  }

  return 'none';
}

function buildInterpretation(
  dimension: string,
  groupValue: string,
  deviationPct: number,
  flagLevel: FlagLevel,
  n: number,
  cohensD: number,
): string {
  if (flagLevel === 'none') {
    return `No detectable disparity for ${dimension}="${groupValue}" (n=${n}).`;
  }

  const direction = deviationPct > 0 ? 'above' : 'below';
  const dLabel = Math.abs(cohensD) >= 0.80 ? 'large' :
                 Math.abs(cohensD) >= 0.50 ? 'medium' :
                 Math.abs(cohensD) >= 0.20 ? 'small' : 'negligible';

  const flag = flagLevel === 'high' ? 'HIGH' : 'LOW';

  return `${flag}: ${dimension}="${groupValue}" scores ${Math.abs(deviationPct).toFixed(1)}% ` +
    `${direction} overall average (n=${n}, Cohen's d=${cohensD.toFixed(2)} [${dLabel} effect]). ` +
    `${flagLevel === 'high' ? 'Investigate for systemic bias.' : 'Monitor over time.'}`;
}

export class BiasAuditor {
  constructor(private db: SupabaseClient) {}

  async auditJob(jobId: string): Promise<BiasAuditReport> {
    const { data, error } = await this.db
      .from('job_match_scores')
      // Live columns, aliased to the audit's field names (2026-10-22). jobseekers
      // has no education level column, so that dimension reads "unknown".
      .select(`
        final_score:suitability_score,
        jobseekers (
          gender,
          date_of_birth:birth_date,
          logistics_zone:city
        )
      `)
      .eq('job_id', jobId)
      .not('suitability_score', 'is', null);

    if (error) throw new Error(`BiasAuditor: DB query failed — ${error.message}`);
    if (!data || data.length < 3) {
      return this.emptyReport(jobId, data?.length ?? 0);
    }

    const rows = (data as any[]).map(row => ({
      score: row.final_score as number,
      gender: (row.jobseekers?.gender as string | null) ?? 'unknown',
      age_bracket: toAgeBracket(row.jobseekers?.date_of_birth ?? null),
      logistics_zone: (row.jobseekers?.logistics_zone as string | null) ?? 'unknown',
      education_level: (row.jobseekers?.education_level as string | null) ?? 'unknown',
    }));

    const allScores = rows.map(r => r.score);
    const overallMean = mean(allScores);
    const overallStd = stddev(allScores);

    const records: BiasAuditRecord[] = [];

    const dimensions: DemographicDimension[] = [
      'gender',
      'age_bracket',
      'logistics_zone',
      'education_level',
    ];

    for (const dim of dimensions) {
      const grouped = this.groupByDimension(rows, dim);
      for (const [groupValue, groupScores] of grouped.entries()) {
        if (groupScores.length < 2) continue;

        const { D, pValue } = ksTwoSample(groupScores, allScores);
        const d = cohensD(groupScores, allScores);
        const groupMean = mean(groupScores);
        const deviationPct = overallMean > 0
          ? ((groupMean - overallMean) / overallMean) * 100
          : 0;

        const flagLevel = determineFlagLevel(pValue, d, deviationPct, groupScores.length);

        records.push({
          dimension: dim,
          groupValue,
          n: groupScores.length,
          meanScore: Math.round(groupMean * 100) / 100,
          overallMean: Math.round(overallMean * 100) / 100,
          deviationPct: Math.round(deviationPct * 10) / 10,
          pValue: Math.round(pValue * 10000) / 10000,
          ksStatistic: Math.round(D * 10000) / 10000,
          cohensD: Math.round(d * 1000) / 1000,
          flagLevel,
          interpretation: buildInterpretation(dim, groupValue, deviationPct, flagLevel, groupScores.length, d),
        });
      }
    }

    const formCompletionFlags = await this.auditFormCompletionBias(jobId);

    const flags = records.filter(r => r.flagLevel === 'high');

    const formHighFlags = formCompletionFlags.filter(f => f.flagLevel === 'high');
    const formSummary = formHighFlags.length > 0
      ? `${formHighFlags.length} form completion bias flag(s): seekers with more declared skills score significantly higher. Consider manual review for candidates with low skill counts.`
      : '';
    const summaryParts = [
      flags.length === 0
        ? `Audit passed — no significant demographic disparity detected across ${records.length} group comparisons.`
        : `${flags.length} high-level disparity flag(s) detected. Review the flagged dimensions before publishing results.`,
    ];
    if (formSummary) summaryParts.push(formSummary);
    const summary = summaryParts.join(' ');

    return {
      jobId,
      auditedAt: new Date().toISOString(),
      totalCandidates: rows.length,
      overallMeanScore: Math.round(overallMean * 100) / 100,
      overallStddev: Math.round(overallStd * 100) / 100,
      records,
      flags,
      passed: flags.length === 0 && formHighFlags.length === 0,
      summary,
      formCompletionFlags,
    };
  }

  async auditFormCompletionBias(jobId: string): Promise<FormCompletionFlag[]> {
    const { data, error } = await this.db
      .from('job_match_scores')
      .select(`
        final_score:suitability_score,
        jobseekers!inner (
          other_skills
        )
      `)
      .eq('job_id', jobId)
      .not('suitability_score', 'is', null);

    if (error || !data || data.length < 5) return [];

    const rows = (data as any[]).map(row => {
      const raw = row.jobseekers?.other_skills;
      let skillCount = 0;
      if (Array.isArray(raw)) skillCount = raw.length;
      else if (typeof raw === 'string') {
        try { const parsed = JSON.parse(raw); skillCount = Array.isArray(parsed) ? parsed.length : 1; }
        catch { skillCount = raw.split(',').map(s => s.trim()).filter(Boolean).length; }
      }
      return { score: row.final_score as number, skillCount };
    });

    const groups = [
      { label: '1-2 skills', min: 1, max: 2 },
      { label: '3-5 skills', min: 3, max: 5 },
      { label: '6+ skills', min: 6, max: Infinity },
    ];

    const flags: FormCompletionFlag[] = [];
    let group1Mean = 0;

    for (const group of groups) {
      const scores = rows.filter(r => r.skillCount >= group.min && r.skillCount <= group.max).map(r => r.score);
      if (scores.length < 2) continue;
      const groupMean = mean(scores);
      if (group.label === '1-2 skills') group1Mean = groupMean;
      flags.push({
        group: group.label,
        count: scores.length,
        meanScore: Math.round(groupMean * 100) / 100,
        flagLevel: 'none',
        interpretation: `${group.label}: n=${scores.length}, mean=${groupMean.toFixed(1)}`,
      });
    }

    const lowGroup = flags.find(f => f.group === '1-2 skills');
    const highGroup = flags.find(f => f.group === '6+ skills');
    if (lowGroup && highGroup && (highGroup.meanScore - lowGroup.meanScore) > 15) {
      lowGroup.flagLevel = 'high';
      lowGroup.interpretation = `HIGH: Seekers with 1-2 skills score ${lowGroup.meanScore.toFixed(1)} vs ${highGroup.meanScore.toFixed(1)} for 6+ skills (gap: ${(highGroup.meanScore - lowGroup.meanScore).toFixed(1)} pts). Form completion bias may be inflating scores.`;
      highGroup.flagLevel = 'high';
      highGroup.interpretation = `HIGH: Seekers with 6+ skills score ${highGroup.meanScore.toFixed(1)} vs ${lowGroup.meanScore.toFixed(1)} for 1-2 skills (gap: ${(highGroup.meanScore - lowGroup.meanScore).toFixed(1)} pts). Form completion bias may be inflating scores.`;
    }

    return flags;
  }

  async auditAllJobs(): Promise<BiasAuditReport[]> {
    const { data, error } = await this.db
      .from('jobs')
      .select('id')
      .limit(200);

    if (error || !data) return [];

    const reports = await Promise.all(
      data.map(job => this.auditJob(job.id).catch(() => null)),
    );

    return reports
      .filter((r): r is BiasAuditReport => r !== null && r.flags.length > 0)
      .sort((a, b) => b.flags.length - a.flags.length);
  }

  private groupByDimension(
    rows: Array<{ score: number; [key: string]: any }>,
    dimension: DemographicDimension,
  ): Map<string, number[]> {
    const grouped = new Map<string, number[]>();

    for (const row of rows) {
      const key = String(row[dimension] ?? 'unknown');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row.score);
    }

    return grouped;
  }

  private emptyReport(jobId: string, n: number): BiasAuditReport {
    return {
      jobId,
      auditedAt: new Date().toISOString(),
      totalCandidates: n,
      overallMeanScore: 0,
      overallStddev: 0,
      records: [],
      flags: [],
      formCompletionFlags: [],
      passed: true,
      summary: `Insufficient data — need at least 3 candidates to run bias audit (found ${n}).`,
    };
  }
}

export async function auditDemographicDisparity(
  db: SupabaseClient,
  jobId: string,
): Promise<BiasAuditReport> {
  const auditor = new BiasAuditor(db);
  return auditor.auditJob(jobId);
}
