/**
 * scoring-engine.ts
 * Deterministic scoring engine for the GensanWorks matching pipeline.
 *
 * Exports:
 *   - ScoringEngine         lightweight online scorer (fast, feature-based)
 *   - ScoringResult         typed result from computeUtilityScore
 *   - WeightOverrides       optional dimension weight overrides
 *   - VacancyPayload        structured vacancy input for scoring
 *   - buildVacancyPayload   factory for VacancyPayload
 *   - computeUtilityScore   full deterministic f1–f6 scorer
 *   - applySemanticConfidenceAdjustments   adjust f1 confidence using semantic matches
 *   - computeVagueSkillAdjustment   pure function: vague term penalty + specificity score
 */

import { normalizeSkill, jaroWinklerSimilarity, tokenSetSimilarity, getLogisticsZone } from "./skill-normalizer";
import { deidentifyJobseeker, type DeidentifiedSeeker, type RawJobseeker } from "./deidentify";
import { checkRoleEquivalence } from "./ai-correction-service";
import { TFIDFScorer, type ProficiencyLevel, type ScoredMatch } from "./tfidf-scorer";
import { skillMapper } from "./skill-taxonomy-mapper";
import type { BehavioralSignal } from "./behavioral-signals";

// ─── Vague Skill Terms ────────────────────────────────────────────────────────

const VAGUE_SKILL_TERMS = new Set([
  'programming', 'coding', 'computer skills', 'it skills',
  'communication', 'leadership', 'management', 'teamwork',
  'microsoft office', 'computer literate', 'technical skills',
  'customer service', 'marketing', 'accounting', 'engineering',
  'design', 'research', 'writing', 'analysis', 'sales',
]);

export function computeVagueSkillAdjustment(
  skills: Array<{ name: string }>
): { adjustment: number; specificity_score: number; vague_skill_warnings: string[] } {
  let vagueCount = 0;
  const warnings: string[] = [];
  for (const skill of skills) {
    if (VAGUE_SKILL_TERMS.has(skill.name.toLowerCase().trim())) {
      vagueCount++;
      warnings.push(`'${skill.name}' is too vague — specify using concrete terms (e.g., framework, language, or tool name)`);
    }
  }
  const total = skills.length;
  const specificCount = total - vagueCount;
  const specificity_score = total > 0 ? specificCount / total : 1;
  const adjustment = total > 0 ? ((specificCount * 1.05) + (vagueCount * 0.40)) / total : 1;
  return { adjustment, specificity_score, vague_skill_warnings: warnings };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DimensionScore = {
  raw: number;       // 0.0–1.0
  confidence: number; // 0.0–1.0
  weighted: number;  // raw * weight
};

export type ScoringResult = {
  utility_score: number;         // 0–100 (raw weighted)
  final_score: number;           // 0–100 (sigmoid-calibrated)
  percentile_rank: number;       // 0–1 estimate
  confidence_band: "low" | "medium" | "high";
  grade: string;                 // A / B / C / D / F
  f1: DimensionScore;
  f2: DimensionScore;
  f3: DimensionScore;
  f5_location: DimensionScore;
  f6_completeness: DimensionScore;
  f7: DimensionScore;
  f8: DimensionScore;
  relevant_experience_months: number;
  total_experience_months: number;
  constraint_violations: string[];
  explanation: SkillExplanation;
  behavioral_signal?: { bayesian_score: number; signal_strength: string };
};

export type WeightOverrides = {
  f1?: number;
  f2?: number;
  f3?: number;
};

export type SkillRequirement = {
  name: string;
  years_min?: number;
  is_required?: boolean;
  importance?: "critical" | "important" | "nice_to_have";
};

export type SkillExplanation = {
  top_contributing_skills: string[];
  missing_critical_skills: string[];
  score_breakdown: Record<string, number>;
  psoc_alignment?: number;
  certification_bonus?: number;
  recency_factor?: number;
  domain_cluster_bonus?: number;
  vague_skill_warnings?: string[];
  specificity_score?: number;
};

export type VacancyPayload = {
  id: string;
  title?: string;
  requiredSkills: SkillRequirement[];
  preferredSkills: SkillRequirement[];
  experienceMin: number;       // years
  experienceMax: number;       // years
  educationRequired: string;   // e.g. "bachelor", "high_school", "no_formal"
  educationFieldPreferred: string | null;
  city: string | null;
  province: string | null;
  workSetup: string;           // "onsite" | "remote" | "hybrid"
  workType: string;            // "full-time" | "part-time"
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  psoc_code?: string;
  region?: string;
  skill_vector?: number[];
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function buildVacancyPayload(input: VacancyPayload): VacancyPayload {
  return { ...input };
}

// ─── Education Ranking ───────────────────────────────────────────────────────

const EDU_RANK: Record<string, number> = {
  no_formal: 0,
  elementary: 1,
  high_school: 2,
  vocational: 3,
  associate: 4,
  bachelor: 5,
  post_graduate: 6,
  master: 7,
  doctorate: 8,
  // Common raw values from DB
  "no formal education": 0,
  "elementary graduate": 1,
  "high school graduate": 2,
  "vocational graduate": 3,
  "college level": 4,
  "college graduate": 5,
  "post graduate": 6,
  "master's degree": 7,
  "doctorate degree": 8,
};

function rankEducation(level: string): number {
  const key = (level ?? "").toLowerCase().trim();
  if (key in EDU_RANK) return EDU_RANK[key as keyof typeof EDU_RANK] ?? 0;
  // fuzzy: look for substrings
  if (key.includes("doctor")) return 8;
  if (key.includes("master")) return 7;
  if (key.includes("post")) return 6;
  if (key.includes("bachelor") || key.includes("college grad")) return 5;
  if (key.includes("college level") || key.includes("associate")) return 4;
  if (key.includes("voc") || key.includes("tesda") || key.includes("tech")) return 3;
  if (key.includes("high school") || key.includes("senior high")) return 2;
  if (key.includes("elementary")) return 1;
  return 0;
}
// ─── Utility: Vector Math ───────────────────────────────────────────────────────

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += (vecA[i] ?? 0) * (vecB[i] ?? 0);
    normA += (vecA[i] ?? 0) * (vecA[i] ?? 0);
    normB += (vecB[i] ?? 0) * (vecB[i] ?? 0);
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Skill Synonym Map ───────────────────────────────────────────────────────
// Normalizes common vocabulary variants so "MS Excel" === "Microsoft Excel" etc.
// This prevents f1 from penalizing candidates for using abbreviated tool names.
const SKILL_SYNONYMS: Record<string, string> = {
  "ms excel": "microsoft excel",
  "ms word": "microsoft word",
  "ms powerpoint": "microsoft powerpoint",
  "ms office": "microsoft office",
  "excel": "microsoft excel",
  "word processor": "microsoft word",
  "spreadsheet": "microsoft excel",
  "google sheets": "microsoft excel",
  "js": "javascript",
  "ts": "typescript",
  "node": "node.js",
  "react": "react.js",
  "postgres": "postgresql",
  "psql": "postgresql",
  "mongo": "mongodb",
  "bookkeeper": "bookkeeping",
  "accounting software": "accounting",
  "electrical wiring": "wiring",
  "electrical repair": "electrical troubleshooting",
  "patient assessment": "patient care",
  "nursing care": "nursing",
  "cpr": "first aid",
  "customer relations": "customer service",
  "retail sales": "sales",
};

function resolveSkillSynonym(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return SKILL_SYNONYMS[lower] ?? lower;
}

// ─── Soft Skill Detection ─────────────────────────────────────────────────────
// Interpersonal/soft skills have sparse embedding representations.
// When a candidate directly has the required soft skill, apply a minimum floor.
const SOFT_SKILLS = new Set([
  "customer service", "communication", "sales", "teamwork", "leadership",
  "time management", "problem solving", "critical thinking", "adaptability",
  "interpersonal skills", "multitasking", "attention to detail", "work ethic",
]);

// ─── Utility: Logistic Signal Shaper ─────────────────────────────────────────
// Centered at 0.65 (empirically correct for sentence-transformer cosine scores)
// Steepness=10 creates smooth differentiation without hard cutoffs
function shapeSignal(sim: number): number {
  return 1 / (1 + Math.exp(-10 * (sim - 0.65)));
}

// ─── F1: Skill Fit (Semantic) — 3-Layer Architecture ─────────────────────────
// Layer 1: Signal shaping (logistic)
// Layer 2: Weighted sum + continuous additive deficit
// Layer 3: Clamp to 0–1

type SkillScoreResult = {
  score: number;
  explanation: SkillExplanation;
};

export function calculateSemanticSkillScore(
  candidateSkills: string[],
  jobSkills: SkillRequirement[],
  skillEmbeddingsMap?: Record<string, number[]>
): SkillScoreResult | null {
  if (!skillEmbeddingsMap || Object.keys(skillEmbeddingsMap).length === 0) return null;
  if (jobSkills.length === 0) return { score: 0.5, explanation: { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} } };
  if (candidateSkills.length === 0) return { score: 0, explanation: { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} } };

  const IMPORTANCE_WEIGHT: Record<string, number> = { critical: 3, important: 2, nice_to_have: 1 };
  const CRITICAL_GAP_THRESHOLD = 0.75; // Only fires penalty when sim < this
  const LAMBDA = 0.25; // Penalty strength for critical gaps

  let totalWeightedContribution = 0;
  let totalWeight = 0;
  let criticalDeficitSum = 0;
  let totalCriticalWeight = 0;

  const contributions: { name: string; contribution: number; weight: number }[] = [];

  for (const jobSkill of jobSkills) {
    const jobSkillNorm = resolveSkillSynonym(normalizeSkill(jobSkill.name));
    const importance = jobSkill.importance ?? "important";
    const weight = IMPORTANCE_WEIGHT[importance] ?? 2;
    const jobVec = skillEmbeddingsMap[jobSkillNorm] ?? skillEmbeddingsMap[normalizeSkill(jobSkill.name)];
    let bestSim = 0;

    if (!jobVec) {
      for (const candSkill of candidateSkills) {
        const resolvedCand = resolveSkillSynonym(candSkill);
        // Exact synonym match → perfect score
        if (resolvedCand === jobSkillNorm) { bestSim = 1.0; break; }
        const fuzzy = Math.max(
          tokenSetSimilarity(jobSkillNorm, candSkill),
          tokenSetSimilarity(jobSkillNorm, resolvedCand)
        );
        if (fuzzy > bestSim) bestSim = fuzzy;
      }
    } else {
      for (const candSkill of candidateSkills) {
        const resolvedCand = resolveSkillSynonym(candSkill);
        // Exact synonym match → perfect score
        if (resolvedCand === jobSkillNorm) { bestSim = 1.0; break; }
        const candVec = skillEmbeddingsMap[resolvedCand] ?? skillEmbeddingsMap[candSkill];
        const sim = candVec ? cosineSimilarity(jobVec, candVec) : Math.max(
          tokenSetSimilarity(jobSkillNorm, candSkill),
          tokenSetSimilarity(jobSkillNorm, resolvedCand)
        );
        if (sim > bestSim) bestSim = sim;
      }
    }

    // Soft-skill floor: if the job requires a known soft skill and candidate has it
    // directly (before embedding lookup), apply a minimum 0.80 similarity floor
    if (SOFT_SKILLS.has(jobSkillNorm)) {
      const candHasSoftSkill = candidateSkills.some(c =>
        resolveSkillSynonym(c) === jobSkillNorm || tokenSetSimilarity(jobSkillNorm, c) >= 0.85
      );
      if (candHasSoftSkill) bestSim = Math.max(bestSim, 0.80);
    }

    // Layer 1: Shape the signal (logistic — no hard cutoffs)
    const shaped = shapeSignal(bestSim);
    const contribution = shaped * weight;

    totalWeightedContribution += contribution;
    totalWeight += weight;
    contributions.push({ name: jobSkill.name, contribution, weight });

    // Critical deficit tracking (additive, not multiplicative)
    if (importance === "critical") {
      const deficit = Math.max(0, CRITICAL_GAP_THRESHOLD - bestSim);
      criticalDeficitSum += weight * deficit;
      totalCriticalWeight += weight;
    }
  }

  // Layer 2: Normalized weighted base score
  const baseScore = totalWeightedContribution / totalWeight;

  // Additive deficit penalty — normalized so adding more critical skills doesn't inflate penalty
  const normalizedDeficit = totalCriticalWeight > 0
    ? criticalDeficitSum / totalCriticalWeight
    : 0;
  const rawScore = Math.max(0, Math.min(1, baseScore - LAMBDA * normalizedDeficit));

  // Build explanation
  contributions.sort((a, b) => b.contribution - a.contribution);
  const top_contributing_skills = contributions.slice(0, 3).map(c => c.name);
  const missing_critical_skills = jobSkills
    .filter(s => s.importance === "critical")
    .filter(s => {
      const c = contributions.find(c => c.name === s.name);
      return c && (c.contribution / c.weight) < shapeSignal(0.5);
    })
    .map(s => s.name);

  const score_breakdown: Record<string, number> = {};
  for (const c of contributions) {
    score_breakdown[c.name] = Math.round((c.contribution / c.weight) * 100) / 100;
  }

  return {
    score: rawScore,
    explanation: { top_contributing_skills, missing_critical_skills, score_breakdown }
  };
}

// Sigmoid calibration — Centered at 0.40 (v2 recalibration)
// Shift from 0.45 → 0.40 raises mid-range candidates (rawScore 0.55–0.65) into
// the Excellent band, reducing boundary compression for well-matched profiles.
export function calibrateScore(rawScore: number): {
  final_score: number;
  percentile_rank: number;
  confidence_band: "low" | "medium" | "high";
} {
  const calibrated = 1 / (1 + Math.exp(-10 * (rawScore - 0.40)));
  const final_score = Math.round(calibrated * 10000) / 100;
  const percentile_rank = Math.round(calibrated * 1000) / 1000;
  const confidence_band: "low" | "medium" | "high" =
    final_score >= 80 ? "high" : final_score >= 60 ? "medium" : "low";
  return { final_score, percentile_rank, confidence_band };
}

// Ranking stability post-processor — applied ONLY in display/ranking layer
export function stabilizeRanking<T extends { final_score: number }>(results: T[]): T[] {
  const EPSILON = 0.5; // candidates within 0.5 pts treated as equal rank
  const sorted = [...results].sort((a, b) => b.final_score - a.final_score);
  return sorted;
}

/** @deprecated Use calculateSemanticSkillScore instead */
export function calculateSkillToSkillSemanticScore(
  candidateSkills: string[],
  jobSkills: string[],
  skillEmbeddingsMap?: Record<string, number[]>
): number | null {
  const asReqs: SkillRequirement[] = jobSkills.map(name => ({ name, importance: "important" as const }));
  const result = calculateSemanticSkillScore(candidateSkills, asReqs, skillEmbeddingsMap);
  return result?.score ?? null;
}

// ─── Utility: Experience Domain Relevance ─────────────────────────────────────
// Measures how relevant the candidate's work history is to the target job.
// Returns 0.10–1.0. A nurse applying for software dev gets ~0.12.
// Prevents total experience years from inflating score in wrong domains.
function scoreDomainRelevanceSync(
  seeker: DeidentifiedSeeker,
  jobTitle: string
): number {
  if (!seeker.work_history || seeker.work_history.length === 0) return 0;
  const jobNorm = normalizeSkill(jobTitle);

  let bestRelevance = 0;
  for (const job of seeker.work_history) {
    const titleNorm = normalizeSkill(job.role_title ?? "");
    if (!titleNorm) continue;

    let sim: number;
    if (titleNorm === jobNorm) {
      sim = 1.0;
    } else {
      sim = jaroWinklerSimilarity(jobNorm, titleNorm);
    }

    if (sim > bestRelevance) bestRelevance = sim;
  }

  return bestRelevance;
}

async function scoreDomainRelevance(
  seeker: DeidentifiedSeeker,
  jobTitle: string,
  _skipAiCheck: boolean = false
): Promise<number> {
  const sim = scoreDomainRelevanceSync(seeker, jobTitle);

  // AI role equivalence for the middle zone (only in standard path)
  if (!_skipAiCheck && sim >= 0.40 && sim < 0.88) {
    try {
      const jobNorm = normalizeSkill(jobTitle);
      for (const job of seeker.work_history) {
        const titleNorm = normalizeSkill(job.role_title ?? "");
        if (titleNorm && jaroWinklerSimilarity(jobNorm, titleNorm) === sim) {
          const equiv = await checkRoleEquivalence(jobTitle, job.role_title ?? "");
          if (equiv.same_role) return Math.max(sim, 0.90);
          break;
        }
      }
    } catch {
      // AI failed — keep Jaro-Winkler score
    }
  }

  return sim;
}

function scoreSkillFit(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  features?: any
): { score: DimensionScore; explanation: SkillExplanation } {
  const requiredSkills = vacancy.requiredSkills;
  const emptyExplanation: SkillExplanation = { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} };
  const w = DEFAULT_WEIGHTS.f1;

  if (requiredSkills.length === 0) {
    const tfidfScorer = features?.tfidfScorer as TFIDFScorer | undefined;
    if (tfidfScorer && tfidfScorer.vocabularySize > 0) {
      const seekerText = [
        ...seeker.skills.map(s => s.name),
        ...seeker.work_history.map(w => w.role_title).filter(Boolean) as string[],
        ...seeker.preferred_occupations,
        seeker.education_course,
      ].filter(Boolean).join(' ');
      const jobText = [vacancy.title, vacancy.description].filter(Boolean).join(' ');
      const match = tfidfScorer.score(seekerText, jobText, null);
      return {
        score: { raw: match.adjustedScore, confidence: 0.8, weighted: match.adjustedScore * w },
        explanation: {
          top_contributing_skills: match.topContributors.map(c => c.term),
          missing_critical_skills: [],
          score_breakdown: {},
        },
      };
    }
    const score = 0.3;
    return { score: { raw: score, confidence: 0.8, weighted: score * w }, explanation: emptyExplanation };
  }

  const vacancyTitle = (vacancy.title || "").toLowerCase();

  const skillExpansion = skillMapper.expandAllSkills(seeker.skills.map(s => s.name));

  const seekerSkillNames = [
    ...skillExpansion.expandedSkills,
    ...seeker.work_history.map(w => w.role_title ? normalizeSkill(w.role_title) : "").filter(Boolean),
  ];

  const implicitReqs: string[] = [];
  if (vacancyTitle.includes("developer") || vacancyTitle.includes("engineer") || vacancyTitle.includes("programmer")) {
    implicitReqs.push("programming", "software development", "software engineering", "coding");
  }

  const allReqSkills = [...requiredSkills];
  implicitReqs.forEach(s => {
    if (!allReqSkills.some(r => normalizeSkill(r.name) === s)) {
      allReqSkills.push({ name: s, importance: "important" });
    }
  });

  const tfidfScorer = features?.tfidfScorer as TFIDFScorer | undefined;

  if (tfidfScorer && tfidfScorer.vocabularySize > 0) {
    const seekerText = seekerSkillNames.join(' ');
    const jobText = [
      ...allReqSkills.map(s => s.name),
      vacancy.title || '',
      vacancy.description || '',
    ].filter(Boolean).join(' ');

    const levels: ProficiencyLevel[] = ['Expert', 'Advanced', 'Intermediate', 'Beginner'];
    const bestLevel = seeker.skills
      .map(s => s.proficiency_level as ProficiencyLevel)
      .filter((l): l is ProficiencyLevel => l !== null && levels.includes(l))
      .sort((a, b) => levels.indexOf(a) - levels.indexOf(b))[0] ?? null;

    const match = tfidfScorer.score(seekerText, jobText, bestLevel);

    // ─── Vague skill specificity adjustment ────────────────────────────
    const vagueAdj = computeVagueSkillAdjustment(seeker.skills);

    // ─── Upgrade 1: Multi-dimensional proficiency weighting ─────────────
    let baseScore = (match.adjustedScore * vagueAdj.adjustment) * skillExpansion.minMultiplier;

    let certification_bonus = 0;
    let certCount = 0;
    for (const skill of seeker.skills) {
      const info = skillMapper.getStandardsInfo(skill.name);
      if (info.tesda_nc_level) {
        certCount++;
        certification_bonus += 0.10;
      }
    }
    certification_bonus = Math.min(0.30, certification_bonus);
    // Decay cert bonus if profile already scores high (avoids over-boosting)
    certification_bonus *= (1 - baseScore);

    const skillCount = seeker.skills.length;
    let recencyDecay = 1.0;
    if (skillCount > 0) {
      let staleCount = 0;
      for (const skill of seeker.skills) {
        const yr = skill.years ?? skill.years_min ?? 0;
        if (yr > 3) staleCount++;
      }
      const staleRatio = staleCount / skillCount;
      recencyDecay = 1.0 - (staleRatio * 0.15);
    }

    let domain_cluster_bonus = 0;
    const groupCounts = new Map<string, number>();
    for (const term of match.breakdown.map(c => c.term)) {
      const info = skillMapper.getStandardsInfo(term);
      const group = info.canonical ? skillMapper.expandSkill(info.canonical).group : null;
      if (group) {
        groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
      }
    }
    for (const count of groupCounts.values()) {
      if (count >= 3) { domain_cluster_bonus = 0.05; break; }
    }

    const raw = Math.max(0, Math.min(1,
      (baseScore * recencyDecay) + certification_bonus + domain_cluster_bonus
    ));

    const hasTitleMatch = seeker.work_history.some(w =>
      w.role_title?.toLowerCase().includes(vacancyTitle) || vacancyTitle.includes(w.role_title?.toLowerCase() || "")
    );
    const finalRaw = Math.max(raw, hasTitleMatch ? 0.80 : 0);

    const explanation: SkillExplanation = {
      top_contributing_skills: match.topContributors.map(c => c.term),
      missing_critical_skills: match.gapTerms.map(g => g.term),
      score_breakdown: Object.fromEntries(
        match.breakdown.map(c => [c.term, Math.round(c.contributionPct) / 100])
      ),
      certification_bonus,
      recency_factor: recencyDecay,
      domain_cluster_bonus,
      vague_skill_warnings: vagueAdj.vague_skill_warnings,
      specificity_score: vagueAdj.specificity_score,
    };

    return {
      score: { raw: finalRaw, confidence: match.confidence, weighted: finalRaw * w },
      explanation,
    };
  }

  const hasTitleMatch = seeker.work_history.some(w =>
    w.role_title?.toLowerCase().includes(vacancyTitle) || vacancyTitle.includes(w.role_title?.toLowerCase() || "")
  );
  const fallbackRaw = hasTitleMatch ? 0.95 : 0.5;
  const vagueAdj = computeVagueSkillAdjustment(seeker.skills);
  const fallbackAdjusted = Math.min(1, fallbackRaw * vagueAdj.adjustment);

  return {
    score: { raw: fallbackAdjusted, confidence: 0.5, weighted: fallbackAdjusted * w },
    explanation: {
      ...emptyExplanation,
      vague_skill_warnings: vagueAdj.vague_skill_warnings,
      specificity_score: vagueAdj.specificity_score,
    },
  };
}

// ─── F2: Experience Depth + Domain Relevance ──────────────────────────────────
// FIX 2: Years alone are not enough. A Fishery Worker with 6 years experience
// should NOT score the same as a Software Developer with 6 years for a dev role.
// Domain relevance multiplier rescales years score by work history alignment.

function computeDomainRelevantMonths(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): { domain_relevant_months: number; total_experience_months: number } {
  const vacancyTitle = (vacancy.title || "").toLowerCase();
  let relevantMonths = 0;
  let totalMonths = 0;

  for (const exp of seeker.work_history) {
    const months = exp.months || 0;
    totalMonths += months;

    const titleNorm = (exp.role_title || "").toLowerCase();
    const directMatch = titleNorm.includes(vacancyTitle) || vacancyTitle.includes(titleNorm);
    const sim = directMatch ? 1.0 : jaroWinklerSimilarity(normalizeSkill(vacancyTitle), normalizeSkill(titleNorm));

    if (directMatch || sim >= 0.40) {
      relevantMonths += months;
    }
  }

  return { domain_relevant_months: relevantMonths, total_experience_months: totalMonths };
}

function scoreExperienceSync(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): { score: DimensionScore; relevant_experience_months: number; total_experience_months: number; psocResult?: PSOCAlignmentResult } {
  const minYears = vacancy.experienceMin;
  const { domain_relevant_months, total_experience_months } = computeDomainRelevantMonths(seeker, vacancy);

  const psocResult = scorePSOCAlignment(seeker, vacancy);

  let bestScore = 0;
  const vacancyTitle = (vacancy.title || "").toLowerCase();
  for (const exp of seeker.work_history) {
    let relevance = scoreDomainRelevanceSync({ ...seeker, work_history: [exp] }, vacancy.title ?? "");

    if (exp.role_title?.toLowerCase().includes(vacancyTitle) ||
        vacancyTitle.includes(exp.role_title?.toLowerCase() || "")) {
      relevance = Math.max(relevance, 0.9);
    }

    let durationWeight: number;
    if (minYears === 0) {
      durationWeight = (exp.months || 0) > 0 ? 1.0 : 0.5;
    } else {
      durationWeight = Math.min(1, (exp.months || 0) / (minYears * 12));
    }

    const scoreVal = relevance * durationWeight;
    if (scoreVal > bestScore) bestScore = scoreVal;
  }

  if (psocResult.matchLevel !== 'none' && psocResult.matchScore > bestScore) {
    bestScore = psocResult.matchScore;
  }

  const w = DEFAULT_WEIGHTS.f2;
  return {
    score: { raw: Math.max(0, Math.min(1, bestScore)), confidence: 0.8, weighted: bestScore * w },
    relevant_experience_months: domain_relevant_months,
    total_experience_months,
    psocResult: psocResult.matchLevel !== 'none' ? psocResult : undefined,
  };
}

async function scoreExperience(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): Promise<{ score: DimensionScore; relevant_experience_months: number; total_experience_months: number; psocResult?: PSOCAlignmentResult }> {
  const minYears = vacancy.experienceMin;
  const { domain_relevant_months, total_experience_months } = computeDomainRelevantMonths(seeker, vacancy);

  const psocResult = scorePSOCAlignment(seeker, vacancy);

  let bestScore = 0;
  const vacancyTitle = (vacancy.title || "").toLowerCase();
  for (const exp of seeker.work_history) {
    let relevance = await scoreDomainRelevance({ ...seeker, work_history: [exp] }, vacancy.title ?? "", false);

    if (exp.role_title?.toLowerCase().includes(vacancyTitle) ||
        vacancyTitle.includes(exp.role_title?.toLowerCase() || "")) {
      relevance = Math.max(relevance, 0.9);
    }

    let durationWeight: number;
    if (minYears === 0) {
      durationWeight = (exp.months || 0) > 0 ? 1.0 : 0.5;
    } else {
      durationWeight = Math.min(1, (exp.months || 0) / (minYears * 12));
    }

    const scoreVal = relevance * durationWeight;
    if (scoreVal > bestScore) bestScore = scoreVal;
  }

  if (psocResult.matchLevel !== 'none' && psocResult.matchScore > bestScore) {
    bestScore = psocResult.matchScore;
  }

  const w = DEFAULT_WEIGHTS.f2;
  return {
    score: { raw: Math.max(0, Math.min(1, bestScore)), confidence: 0.8, weighted: bestScore * w },
    relevant_experience_months: domain_relevant_months,
    total_experience_months,
    psocResult: psocResult.matchLevel !== 'none' ? psocResult : undefined,
  };
}

// ─── PSOC Occupational Code Alignment (Upgrade 2) ────────────────────────────

type PSOCMatchLevel = 'exact' | 'group' | 'major' | 'none';

interface PSOCAlignmentResult {
  matchScore: number;
  matchLevel: PSOCMatchLevel;
}

function scorePSOCAlignment(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): PSOCAlignmentResult {
  if (!seeker.target_psoc || !vacancy.psoc_code) {
    return { matchScore: 0, matchLevel: 'none' };
  }

  const s = seeker.target_psoc.replace(/\D/g, '').padStart(4, '0').slice(0, 4);
  const j = vacancy.psoc_code.replace(/\D/g, '').padStart(4, '0').slice(0, 4);

  if (s.length !== 4 || j.length !== 4) {
    return { matchScore: 0, matchLevel: 'none' };
  }

  if (s === j) return { matchScore: 1.0, matchLevel: 'exact' };
  if (s.slice(0, 3) === j.slice(0, 3)) return { matchScore: 0.75, matchLevel: 'group' };
  if (s.slice(0, 2) === j.slice(0, 2)) return { matchScore: 0.50, matchLevel: 'major' };
  return { matchScore: 0, matchLevel: 'none' };
}

// ─── F3: Education (QPE rule) ─────────────────────────────────────────────────
function scoreEducation(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): DimensionScore {
  const required = rankEducation(vacancy.educationRequired);
  const actual = rankEducation(seeker.education_level);

  const raw = actual >= required ? 1.0 : actual / Math.max(required, 1);
  return { raw, confidence: 1.0, weighted: raw * DEFAULT_WEIGHTS.f3 };
}

// ─── F7: Education Relevance (Semantic) ───────────────────────────────────────
function scoreEducationRelevance(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  features?: any
): DimensionScore {
  const course = (seeker.education_course ?? "").toLowerCase().trim();
  const jobTitle = (vacancy.title ?? "").toLowerCase().trim();
  const jobDesc = (vacancy.description ?? "").toLowerCase();

  if (!course) return { raw: 0, confidence: 0.3, weighted: 0 * DEFAULT_WEIGHTS.f7 };

  let raw: number;
  if (features?.ontology_scores?.education_relevance !== undefined) {
    raw = features.ontology_scores.education_relevance;
  } else {
    const itKeywords = ["computer science", "information technology", "software", "computer engineering", "it", "cs", "programming", "developer", "data science"];
    const healthKeywords = ["nursing", "medicine", "health", "biology", "pharmacy", "medical", "midwifery", "radiologic"];
    const businessKeywords = ["business", "administration", "commerce", "management", "accounting", "finance", "marketing", "economics"];
    const educationKeywords = ["education", "teaching", "pedagogy", "bs ed", "bsed"];
    const engineeringKeywords = ["engineering", "civil", "mechanical", "electrical", "industrial", "architecture"];

    const isITJob = itKeywords.some(k => jobTitle.includes(k) || jobDesc.includes(k));
    const isITCourse = itKeywords.some(k => course.includes(k));
    const isHealthCourse = healthKeywords.some(k => course.includes(k));
    const isBusinessCourse = businessKeywords.some(k => course.includes(k));
    const isEducationCourse = educationKeywords.some(k => course.includes(k));
    const isEngineeringCourse = engineeringKeywords.some(k => course.includes(k));
    const isHealthJob = healthKeywords.some(k => jobTitle.includes(k) || jobDesc.includes(k));
    const isBusinessJob = businessKeywords.some(k => jobTitle.includes(k) || jobDesc.includes(k));

    if (isITJob && isITCourse) raw = 0.90;
    else if (isITJob && isEngineeringCourse) raw = 0.55;
    else if (isITJob && isBusinessCourse) raw = 0.20;
    else if (isITJob && isHealthCourse) raw = 0.08;
    else if (isITJob && isEducationCourse) raw = 0.10;
    else if (isHealthJob && isHealthCourse) raw = 0.90;
    else if (isBusinessJob && isBusinessCourse) raw = 0.90;
    else if (isBusinessJob && isEducationCourse) raw = 0.30;
    else {
      const fuzzyTitleMatch = jaroWinklerSimilarity(jobTitle, course);
      raw = Math.min(0.45, Math.max(0.15, fuzzyTitleMatch));
    }
  }

  return { raw, confidence: 0.8, weighted: raw * DEFAULT_WEIGHTS.f7 };
}

// ─── F8: Description Relevance (Semantic) ───────────────────────────
function scoreDescriptionRelevance(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  embeddings_map?: Record<string, number[]>
): DimensionScore {
  const profileParts = [
    ...seeker.skills.map(s => s.name),
    ...seeker.work_history.map(w => w.role_title),
    ...seeker.preferred_occupations,
    seeker.education_course
  ].filter(Boolean);
  if (profileParts.length === 0) return { raw: 0, confidence: 0.3, weighted: 0 * DEFAULT_WEIGHTS.f8 };

  const profileText = profileParts.join(" ").toLowerCase().trim();
  const descText = (vacancy.description || "").toLowerCase().trim();
  if (!descText) return { raw: 0.3, confidence: 0.3, weighted: 0.3 * DEFAULT_WEIGHTS.f8 };

  const profileVec = embeddings_map?.[profileText];
  const descVec = embeddings_map?.[descText];
  if (!profileVec || !descVec) return { raw: 0.3, confidence: 0.3, weighted: 0.3 * DEFAULT_WEIGHTS.f8 };

  const sim = cosineSimilarity(profileVec, descVec);
  const raw = Math.max(0, Math.min(1, sim));
  return { raw, confidence: 0.7, weighted: raw * DEFAULT_WEIGHTS.f8 };
}

// ─── F4: Logistics ────────────────────────────────────────────────────────────
function scoreLogistics(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): DimensionScore {
  const workSetup = (vacancy.workSetup ?? "onsite").toLowerCase();
  const workType = (vacancy.workType ?? "full-time").toLowerCase();
  const seekerWorkType = seeker.work_type_preference?.toLowerCase() ?? "either";
  let workTypeScore = (seekerWorkType === "either" || seekerWorkType === workType) ? 1.0 : 0.2;
  const statusScore = seeker.job_seeking_status === "actively_looking" ? 1.0 : seeker.job_seeking_status === "open" ? 0.5 : 0.0;
  const setupPreference = (seeker.work_setup_preference ?? "any").toLowerCase();
  const setupScore = setupPreference === "any" || setupPreference === workSetup ? 1.0 : 0.4;
  const raw = workTypeScore * 0.6 + setupScore * 0.3 + statusScore * 0.1;
  return { raw, confidence: 1.0, weighted: 0 };
}

// ─── F5: Logistics Zone Proximity (Upgrade 3) ─────────────────────────────────
function scoreLocationFit(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): DimensionScore {
  const zone = (seeker.logistics_zone || "").toLowerCase();

  let raw: number;

  if (zone.includes("same city") || zone.includes("same barangay")) {
    raw = 0.90;
  } else if (
    seeker.province && vacancy.province &&
    seeker.province.toLowerCase() === vacancy.province.toLowerCase()
  ) {
    raw = 0.75;
  } else if (zone.includes("same region")) {
    raw = 0.60;
  } else {
    raw = 0.30;
  }

  return { raw, confidence: 1.0, weighted: 0 };
}

// ─── F6: Profile Completeness ─────────────────────────────────────────────────
/**
 * Threshold defining an "AI-compatible complete profile" for pilot evaluation reporting (SO1).
 * Distinct from the sparse profile penalty threshold (0.4 / 40%).
 */
export const AI_COMPATIBLE_COMPLETENESS_THRESHOLD = 0.6;
export const AI_COMPATIBLE_COMPLETENESS_THRESHOLD_PCT = 60;

export function scoreCompleteness(seeker: DeidentifiedSeeker): DimensionScore {
  const checks = [seeker.skills.length > 0, seeker.experience_years > 0, seeker.education_level !== "Not specified" && seeker.education_level !== "No data", seeker.certifications.length > 0, seeker.preferred_occupations.length > 0, seeker.expected_salary_min != null, seeker.languages.length > 0, (seeker.logistics_zone || "").toLowerCase() !== "unknown", seeker.work_type_preference !== "either", seeker.job_seeking_status !== "unknown"];
  const raw = checks.filter(Boolean).length / checks.length;
  return { raw, confidence: 1.0, weighted: 0 };
}

/**
 * Calculates the matching engine completeness score (0–100 integer) for a raw jobseeker profile object.
 * Uses the exact 10 boolean check logic from scoreCompleteness().
 */
export function computeMatchingCompleteness(profile: Record<string, any>): number {
  const seeker = deidentifyJobseeker(profile as RawJobseeker);
  const result = scoreCompleteness(seeker);
  return Math.round(result.raw * 100);
}

// ─── Grade Helper (v2 calibrated thresholds) ─────────────────────────────────
// Thresholds realigned to match the recalibrated sigmoid distribution (center 0.40).
// Excellent ≥ 85 | Strong ≥ 80 | Good ≥ 65 | Fair ≥ 45
function gradeFromScore(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  return "Weak";
}

// ─── Main Scorer ──────────────────────────────────────────────────────────────
const SEMANTIC_BRIDGE_THRESHOLD = 0.72;
const DEFAULT_WEIGHTS = {
  f1: 0.40, // Skills
  f2: 0.25, // Experience
  f3: 0.05, // Education
  f7: 0.10, // Edu Relevance
  f8: 0.20, // Description Relevance
};

export async function computeUtilityScore(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  overrides?: WeightOverrides,
  features?: any,
  _skipAiCheck?: boolean
): Promise<ScoringResult> {
  const w = {
    f1: overrides?.f1 ?? DEFAULT_WEIGHTS.f1,
    f2: overrides?.f2 ?? DEFAULT_WEIGHTS.f2,
    f3: overrides?.f3 ?? DEFAULT_WEIGHTS.f3,
    f7: DEFAULT_WEIGHTS.f7,
  };

  const constraint_violations: string[] = [];

  // ─── Change 4: Minimum profile viability gate ──────────────────────────
  const populatedCount = [
    seeker.skills.length >= 1,
    seeker.work_history.length >= 1,
    typeof seeker.education_course === "string" && seeker.education_course.trim().length > 0,
    seeker.preferred_occupations.length >= 1
  ].filter(Boolean).length;

  if (populatedCount < 2) {
    return {
      utility_score: 5,
      final_score: 5,
      percentile_rank: 0,
      confidence_band: "low",
      grade: "Weak",
      f1: { raw: 0, confidence: 0, weighted: 0 },
      f2: { raw: 0, confidence: 0, weighted: 0 },
      f3: { raw: 0, confidence: 0, weighted: 0 },
      f5_location: { raw: 0, confidence: 0, weighted: 0 },
      f6_completeness: { raw: 0, confidence: 0, weighted: 0 },
      f7: { raw: 0, confidence: 0, weighted: 0 },
      f8: { raw: 0, confidence: 0, weighted: 0 },
      relevant_experience_months: 0,
      total_experience_months: 0,
      constraint_violations: ["Profile is too incomplete to score accurately — please complete your profile."],
      explanation: { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} }
    };
  }

  const { score: f1, explanation } = scoreSkillFit(seeker, vacancy, features);
  const f2Result = _skipAiCheck
    ? scoreExperienceSync(seeker, vacancy)
    : await scoreExperience(seeker, vacancy);
  const { score: f2Raw, relevant_experience_months, total_experience_months, psocResult } = f2Result;
  const f3 = scoreEducation(seeker, vacancy);
  const f6_completeness = scoreCompleteness(seeker);
  const f7 = scoreEducationRelevance(seeker, vacancy, features);
  const f8 = scoreDescriptionRelevance(seeker, vacancy, features?.skill_embeddings_map);
  const f5_location = scoreLocationFit(seeker, vacancy);

  const rawUtility = 
    (f1.weighted || 0) + 
    (f2Raw.weighted || 0) + 
    (f3.weighted || 0) + 
    (f7.weighted || 0) +
    (f8.weighted || 0);
  let utility_score = Math.round(rawUtility * 10000) / 100;

  const { final_score: calibratedFinalScore, percentile_rank, confidence_band: calibratedBand } =
    calibrateScore(rawUtility);

  let final_score = calibratedFinalScore;
  let confidence_band = calibratedBand;

  const titleSim = checkTitleRelevance(seeker, vacancy);
  if (titleSim < 0.45 && seeker.experience_years < 2 && seeker.skills.length < 2) {
    utility_score = Math.min(utility_score, 40);
    final_score = Math.min(final_score, 40);
    confidence_band = "low";
    constraint_violations.push("Profile does not match job title or description.");
  }

  const grade = gradeFromScore(final_score);

  if (seeker.job_seeking_status === "not_looking") {
    constraint_violations.push("Candidate is not actively seeking employment.");
  }
  if (f3.raw < 1.0) {
    constraint_violations.push("Candidate does not meet the minimum education requirement.");
  }
  if (f6_completeness.raw < 0.4) {
    constraint_violations.push("Candidate profile is sparse — scores may be unreliable.");
  }
  if (f5_location.raw < 0.75) {
    constraint_violations.push("Candidate location may require long commute.");
  }

  if (seeker.skills.length < 3 && (explanation.specificity_score ?? 1) < 0.5) {
    constraint_violations.push("Limited skill declaration — score may underrepresent actual capability. Manual review recommended.");
  }

  if (psocResult && !explanation.psoc_alignment) {
    explanation.psoc_alignment = psocResult.matchScore;
  }

  let behavioral_signal: { bayesian_score: number; signal_strength: string } | undefined;
  const featSignal = features?.behavioral_signal as BehavioralSignal | undefined;
  if (featSignal && featSignal.signal_strength !== 'none') {
    behavioral_signal = {
      bayesian_score: featSignal.bayesian_score,
      signal_strength: featSignal.signal_strength,
    };
    if (featSignal.signal_strength === 'strong') {
      constraint_violations.push("Strong behavioral signal: seeker has applied or saved this job type");
    }
  }

  return {
    utility_score,
    final_score,
    percentile_rank,
    confidence_band,
    grade,
    f1,
    f2: f2Raw,
    f3,
    f6_completeness,
    f7,
    f8,
    f5_location,
    relevant_experience_months,
    total_experience_months,
    constraint_violations,
    explanation,
    behavioral_signal,
  };
}

// ─── Change 3: checkTitleRelevance ──────────────────────────────────
export function checkTitleRelevance(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): number {
  const title = (vacancy.title || "").toLowerCase().trim();
  if (!title) return 1.0;

  const candidates = [
    ...seeker.preferred_occupations,
    ...seeker.work_history.map(w => w.role_title).filter(Boolean) as string[],
    seeker.education_course
  ].filter(Boolean) as string[];

  let best = 0;
  for (const c of candidates) {
    const sim = jaroWinklerSimilarity(title, c.toLowerCase());
    if (sim > best) best = sim;
  }
  return best;
}

// ─── Semantic Confidence Adjustment ──────────────────────────────────────────

export type SemanticMatch = {
  jobseeker_skill: string;
  vacancy_skill: string;
  is_semantic_match: boolean;
  confidence: number;
};

/**
 * Adjusts f1 confidence upward based on semantic skill matches.
 * Called after LLM semantic interpretation, if available.
 */
export function applySemanticConfidenceAdjustments(
  result: ScoringResult,
  semanticMatches: SemanticMatch[]
): ScoringResult {
  if (!semanticMatches.length) return result;

  const semanticBoost = semanticMatches
    .filter(m => m.is_semantic_match)
    .reduce((acc, m) => acc + m.confidence, 0) / semanticMatches.length;

  const adjustedF1Confidence = Math.min(1.0, result.f1.confidence + semanticBoost * 0.2);

  return {
    ...result,
    f1: { ...result.f1, confidence: adjustedF1Confidence },
  };
}

// ─── Online Lightweight Scorer (preserved) ───────────────────────────────────

export class ScoringEngine {
  /**
   * Fast runtime scoring using precomputed features.
   * Target Latency: <10ms per candidate.
   */
  public calculateOnlineScore(features: {
    skill_match_score: number;
    experience_match_score: number;
    ontology_score: number;
  }): number {
    const weights = {
      skills: 0.5,
      experience: 0.3,
      ontology: 0.2,
    };

    // All features must be pre-normalized 0-1
    return (
      (features.skill_match_score * weights.skills) +
      (features.experience_match_score * weights.experience) +
      (features.ontology_score * weights.ontology)
    );
  }
}

export const scoringEngine = new ScoringEngine();
