import { skillMapper } from "./skill-taxonomy-mapper";

export type DimensionScores = Record<string, {
  raw: number;
  confidence: number;
  weighted: number;
}>;

export type ScoringWeights = {
  f1: number;
  f2: number;
  f3: number;
  f7: number;
  f8: number;
};

export type SkillExplanation = {
  top_contributing_skills?: string[];
  missing_critical_skills?: string[];
  score_breakdown?: Record<string, number>;
  vague_skill_warnings?: string[];
  specificity_score?: number;
  certification_bonus?: number;
  recency_factor?: number;
  domain_cluster_bonus?: number;
  psoc_alignment?: number;
};

const DIMENSION_LABELS: Record<string, string> = {
  f1: 'Skills',
  f2: 'Experience',
  f3: 'Education',
  f7: 'Education Relevance',
  f8: 'Description Relevance',
};

const WEIGHT_LABELS: Record<string, string> = {
  f1: '45%',
  f2: '28%',
  f3: '7%',
  f7: '10%',
  f8: '20%',
};

const GRADE_THRESHOLDS: Array<{ min: number; label: string }> = [
  { min: 85, label: 'Excellent' },
  { min: 80, label: 'Strong' },
  { min: 65, label: 'Good' },
  { min: 45, label: 'Fair' },
  { min: 0, label: 'Weak' },
];

function gradeFromScore(score: number): string {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.label;
  }
  return 'Weak';
}

export function formatScoreDerivation(
  dimensionScores: DimensionScores,
  weights: ScoringWeights,
  explanation: SkillExplanation | null,
): string {
  const lines: string[] = [];
  const dimOrder = ['f1', 'f2', 'f3', 'f7', 'f8'];

  let rawUtility = 0;

  for (const dim of dimOrder) {
    const ds = dimensionScores[dim];
    const weight = weights[dim as keyof ScoringWeights] ?? 0;
    if (!ds) continue;

    const raw = ds.raw ?? 0;
    const weighted = ds.weighted ?? raw * weight;
    rawUtility += weighted;

    const label = DIMENSION_LABELS[dim] ?? dim.toUpperCase();
    const weightPct = Math.round(weight * 100);

    lines.push('');
    lines.push(`${label} (${weightPct}% weight):`);

    if (dim === 'f1' && explanation) {
      const matched = explanation.top_contributing_skills ?? [];
      const missing = explanation.missing_critical_skills ?? [];
      if (matched.length > 0) {
        for (const skill of matched) {
          const isVague = explanation.vague_skill_warnings?.some(w => w.includes(`'${skill}'`));
          if (isVague) {
            lines.push(`  ⚠ ${skill} (vague, weight 0.40 penalty applied)`);
          } else {
            lines.push(`  ✓ ${skill} (specific, weight 1.05)`);
          }
          const standards = skillMapper.getStandardsInfo(skill);
          if (standards.esco_uri) {
            lines.push(`    → maps to ESCO skill: ${standards.esco_uri}`);
          }
          if (standards.tesda_nc_level) {
            lines.push(`    → certified at TESDA ${standards.tesda_nc_level}`);
          }
        }
      }
      for (const skill of missing) {
        lines.push(`  ✗ ${skill} (gap — not declared)`);
      }
      if (explanation.vague_skill_warnings && explanation.vague_skill_warnings.length > 0) {
        for (const w of explanation.vague_skill_warnings) {
          lines.push(`  ⚠ ${w}`);
        }
      }
      if (explanation.specificity_score !== undefined) {
        lines.push(`  Specificity score: ${(explanation.specificity_score * 100).toFixed(0)}%`);
      }
      if (explanation.certification_bonus && explanation.certification_bonus > 0) {
        lines.push(`  + Certification bonus: +${(explanation.certification_bonus * 100).toFixed(1)} pts`);
      }
      if (explanation.recency_factor && explanation.recency_factor < 1.0) {
        lines.push(`  - Recency decay applied: ×${explanation.recency_factor.toFixed(2)}`);
      }
      if (explanation.domain_cluster_bonus && explanation.domain_cluster_bonus > 0) {
        lines.push(`  + Domain cluster bonus: +${(explanation.domain_cluster_bonus * 100).toFixed(1)} pts`);
      }
    }

    lines.push(`  Raw ${dim.toUpperCase()} score: ${(raw * 100).toFixed(0)}/100 → weighted: ${(raw * 100).toFixed(0)} × ${weightPct}% = ${(weighted * 100).toFixed(1)}`);
  }

  lines.push('');
  lines.push(`Raw utility: ${dimOrder.map(d => {
    const ds = dimensionScores[d];
    if (!ds) return null;
    const weighted = ds.weighted ?? (ds.raw * (weights[d as keyof ScoringWeights] ?? 0));
    return `${(weighted * 100).toFixed(1)}`;
  }).filter(Boolean).join(' + ')} = ${(rawUtility * 100).toFixed(1)}`);

  const calibrated = 1 / (1 + Math.exp(-10 * (rawUtility - 0.40)));
  const finalScore = Math.round(calibrated * 100);
  const grade = gradeFromScore(finalScore);

  lines.push(`Sigmoid calibration: sigmoid(${(rawUtility * 100).toFixed(1)}/100, center=40%, steepness=10) = ${(calibrated * 100).toFixed(0)}/100`);
  lines.push(`Final score: ${finalScore}/100 — Grade: ${grade}`);

  return lines.join('\n');
}
