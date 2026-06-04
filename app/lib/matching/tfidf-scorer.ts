import { TFIDFVectorizer, TFIDFVector } from './tfidf-vectorizer';
import { skillMapper } from './skill-taxonomy-mapper';

export interface TermContribution {
  term: string;
  seekerWeight: number;
  jobWeight: number;
  contribution: number;
  contributionPct: number;
}

export interface ScoredMatch {
  rawScore: number;
  adjustedScore: number;
  breakdown: TermContribution[];
  topContributors: TermContribution[];
  gapTerms: Array<{ term: string; jobWeight: number }>;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  proficiencyMultiplier: number;
}

export type ProficiencyLevel = 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner' | null;

const PROFICIENCY_WEIGHTS: Record<NonNullable<ProficiencyLevel>, number> = {
  Expert:       1.20,
  Advanced:     1.00,
  Intermediate: 0.80,
  Beginner:     0.60,
};
const DEFAULT_PROFICIENCY_WEIGHT = 0.80;

export class TFIDFScorer {
  private vectorizer: TFIDFVectorizer;

  constructor(vectorizer: TFIDFVectorizer) {
    this.vectorizer = vectorizer;
  }

  get vocabularySize(): number {
    return this.vectorizer.vocabularySize;
  }

  score(
    seekerText: string,
    jobText: string,
    proficiency: ProficiencyLevel = null,
    topN = 5,
  ): ScoredMatch {
    const seekerVec = this.vectorizer.transform(seekerText);
    const jobVec    = this.vectorizer.transform(jobText);

    return this.scoreVectors(seekerVec, jobVec, proficiency, topN);
  }

  scoreVectors(
    seekerVec: TFIDFVector,
    jobVec: TFIDFVector,
    proficiency: ProficiencyLevel = null,
    topN = 5,
  ): ScoredMatch {
    const breakdown: TermContribution[] = [];
    let rawDot = 0;

    for (const [term, seekerW] of seekerVec.terms.entries()) {
      const jobW = jobVec.terms.get(term);
      if (jobW === undefined) continue;
      const contribution = seekerW * jobW;
      rawDot += contribution;
      breakdown.push({ term, seekerWeight: seekerW, jobWeight: jobW, contribution, contributionPct: 0 });
    }

    const rawScore = Math.min(1, Math.max(0, rawDot));

    if (rawScore > 0) {
      for (const item of breakdown) {
        item.contributionPct = (item.contribution / rawScore) * 100;
      }
    }

    breakdown.sort((a, b) => b.contribution - a.contribution);

    const gapTerms: Array<{ term: string; jobWeight: number }> = [];
    for (const [term, jobW] of jobVec.terms.entries()) {
      if (!seekerVec.terms.has(term)) {
        gapTerms.push({ term, jobWeight: jobW });
      }
    }
    gapTerms.sort((a, b) => b.jobWeight - a.jobWeight);

    const proficiencyMultiplier = proficiency !== null
      ? PROFICIENCY_WEIGHTS[proficiency]
      : DEFAULT_PROFICIENCY_WEIGHT;

    const adjustedScore = Math.min(1, rawScore * proficiencyMultiplier);

    const confidence = this.computeConfidence(seekerVec, jobVec);
    const confidenceLabel: ScoredMatch['confidenceLabel'] =
      confidence >= 0.70 ? 'high' :
      confidence >= 0.40 ? 'medium' : 'low';

    return {
      rawScore,
      adjustedScore,
      breakdown,
      topContributors: breakdown.slice(0, topN),
      gapTerms: gapTerms.slice(0, topN),
      confidence,
      confidenceLabel,
      proficiencyMultiplier,
    };
  }

  private computeConfidence(seekerVec: TFIDFVector, jobVec: TFIDFVector): number {
    const EXPECTED_SEEKER_NNZ = 15;
    const EXPECTED_JOB_NNZ    = 30;

    const seekerDensity = Math.min(1, seekerVec.nnz / EXPECTED_SEEKER_NNZ);
    const jobDensity    = Math.min(1, jobVec.nnz / EXPECTED_JOB_NNZ);

    if (seekerDensity + jobDensity === 0) return 0;
    return (2 * seekerDensity * jobDensity) / (seekerDensity + jobDensity);
  }

  rankJobs(
    seekerText: string,
    jobs: Array<{ id: string; text: string }>,
    proficiency: ProficiencyLevel = null,
  ): Array<{ jobId: string; match: ScoredMatch }> {
    const seekerVec = this.vectorizer.transform(seekerText);

    return jobs
      .map(job => ({
        jobId: job.id,
        match: this.scoreVectors(
          seekerVec,
          this.vectorizer.transform(job.text),
          proficiency,
        ),
      }))
      .sort((a, b) => b.match.adjustedScore - a.match.adjustedScore);
  }

  rankSeekers(
    jobText: string,
    seekers: Array<{ id: string; text: string; proficiency?: ProficiencyLevel }>,
  ): Array<{ seekerId: string; match: ScoredMatch }> {
    const jobVec = this.vectorizer.transform(jobText);

    return seekers
      .map(s => ({
        seekerId: s.id,
        match: this.scoreVectors(
          this.vectorizer.transform(s.text),
          jobVec,
          s.proficiency ?? null,
        ),
      }))
      .sort((a, b) => b.match.adjustedScore - a.match.adjustedScore);
  }

  static formatBreakdown(match: ScoredMatch): string {
    const lines: string[] = [
      `TF-IDF Skill Match Score: ${(match.adjustedScore * 100).toFixed(1)}%`,
      `  Raw cosine similarity : ${(match.rawScore * 100).toFixed(1)}%`,
      `  Proficiency multiplier: x${match.proficiencyMultiplier.toFixed(2)}`,
      `  Confidence            : ${match.confidenceLabel} (${(match.confidence * 100).toFixed(0)}%)`,
      '',
      'Top contributing skills:',
    ];

    for (const c of match.topContributors) {
      let tag = '';
      const standards = skillMapper.getStandardsInfo(c.term);
      if (standards.esco_uri) tag += ' [ESCO]';
      if (standards.tesda_nc_level) tag += ` [TESDA ${standards.tesda_nc_level}]`;
      lines.push(`  ${(c.term + tag).padEnd(32)} +${c.contributionPct.toFixed(1)}%`);
    }

    if (match.gapTerms.length > 0) {
      lines.push('', 'Skill gaps (in job, missing from profile):');
      for (const g of match.gapTerms.slice(0, 5)) {
        lines.push(`  ${g.term.padEnd(28)} (job weight: ${g.jobWeight.toFixed(3)})`);
      }
    }

    return lines.join('\n');
  }
}
