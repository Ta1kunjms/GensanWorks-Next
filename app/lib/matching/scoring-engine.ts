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
 */

import { normalizeSkill, jaroWinklerSimilarity, getLogisticsZone } from "./skill-normalizer";
import type { DeidentifiedSeeker } from "./deidentify";

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
  f6_completeness: DimensionScore;
  f7: DimensionScore;
  relevant_experience_months: number;
  constraint_violations: string[];
  explanation: SkillExplanation;
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
  if (candidateSkills.length === 0) return { score: 0.2, explanation: { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} } };

  const IMPORTANCE_WEIGHT: Record<string, number> = { critical: 3, important: 2, nice_to_have: 1 };
  const CRITICAL_GAP_THRESHOLD = 0.75; // Only fires penalty when sim < this
  const LAMBDA = 0.25; // Penalty strength for critical gaps

  let totalWeightedContribution = 0;
  let totalWeight = 0;
  let criticalDeficitSum = 0;
  let totalCriticalWeight = 0;

  const contributions: { name: string; contribution: number; weight: number }[] = [];

  for (const jobSkill of jobSkills) {
    const jobSkillNorm = normalizeSkill(jobSkill.name);
    const importance = jobSkill.importance ?? "important";
    const weight = IMPORTANCE_WEIGHT[importance] ?? 2;
    const jobVec = skillEmbeddingsMap[jobSkillNorm];
    let bestSim = 0;

    if (!jobVec) {
      for (const candSkill of candidateSkills) {
        const fuzzy = jaroWinklerSimilarity(jobSkillNorm, candSkill);
        if (fuzzy > bestSim) bestSim = fuzzy;
      }
    } else {
      for (const candSkill of candidateSkills) {
        const candVec = skillEmbeddingsMap[candSkill];
        const sim = candVec ? cosineSimilarity(jobVec, candVec) : jaroWinklerSimilarity(jobSkillNorm, candSkill);
        if (sim > bestSim) bestSim = sim;
      }
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

// Sigmoid calibration — Static, centered at 0.55 raw score, steepness=8
// Maps raw 0–1 scores into calibrated 0–100 range without dataset-shift sensitivity
export function calibrateScore(rawScore: number): {
  final_score: number;
  percentile_rank: number;
  confidence_band: "low" | "medium" | "high";
} {
  // Recalibrated: Center shifted from 0.50 to 0.45 to reward top-tier professional profiles
  const calibrated = 1 / (1 + Math.exp(-10 * (rawScore - 0.45)));
  const final_score = Math.round(calibrated * 10000) / 100;
  const percentile_rank = Math.round(calibrated * 1000) / 1000;
  const confidence_band: "low" | "medium" | "high" =
    final_score >= 72 ? "high" : final_score >= 48 ? "medium" : "low";
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
function scoreDomainRelevance(
  seeker: DeidentifiedSeeker,
  jobTitle: string
): number {
  if (!seeker.work_history || seeker.work_history.length === 0) return 0.15;
  const jobNorm = normalizeSkill(jobTitle);

  let bestRelevance = 0;
  for (const job of seeker.work_history) {
    const titleNorm = normalizeSkill(job.role_title ?? "");
    if (!titleNorm) continue;
    const sim = titleNorm === jobNorm ? 1.0 : jaroWinklerSimilarity(jobNorm, titleNorm);
    if (sim > bestRelevance) bestRelevance = sim;
  }

  // Minimum floor of 0.10 — some general transferable value always exists
  return Math.max(0.10, bestRelevance);
}

function scoreSkillFit(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  features?: any
): { score: DimensionScore; explanation: SkillExplanation } {
  const requiredSkills = vacancy.requiredSkills;
  const emptyExplanation: SkillExplanation = { top_contributing_skills: [], missing_critical_skills: [], score_breakdown: {} };

  if (requiredSkills.length === 0) {
    // SEMANTIC BRIDGE for empty skills: If title matches history (semantically), high skill match by proxy
    const vacancyEmbedding = features?.vacancy_embedding;
    const historyEmbeddings = features?.work_history_embeddings || [];

    let maxSim = 0;
    if (vacancyEmbedding && historyEmbeddings.length > 0) {
      historyEmbeddings.forEach((emb: number[]) => {
        const sim = cosineSimilarity(vacancyEmbedding, emb);
        if (sim > maxSim) maxSim = sim;
      });
    }

    const hasSemanticMatch = maxSim >= SEMANTIC_BRIDGE_THRESHOLD;
    const score = hasSemanticMatch ? 0.95 : 0.5;
    const w = DEFAULT_WEIGHTS.f1;
    return { 
      score: { raw: score, confidence: 0.8, weighted: score * w }, 
      explanation: emptyExplanation 
    };
  }

  // RECOVERY: Use actual skills + Implicit skills from Work History (Titles).
  const seekerSkillNames = [
    ...seeker.skills.map(s => normalizeSkill(s.name)),
    ...seeker.work_history.map(w => w.role_title ? normalizeSkill(w.role_title) : "").filter(Boolean)
  ];

  // SEMANTIC BRIDGE: If vacancy title is "Software Developer", ensure we look for "Programming"
  const vacancyTitle = (vacancy.title || "").toLowerCase();
  const implicitReqs = [];
  if (vacancyTitle.includes("developer") || vacancyTitle.includes("engineer") || vacancyTitle.includes("programmer")) {
    implicitReqs.push("programming", "software development", "software engineering", "coding");
  }

  const allReqSkills = [...requiredSkills];
  implicitReqs.forEach(s => {
    if (!allReqSkills.some(r => normalizeSkill(r.name) === s)) {
      allReqSkills.push({ name: s, importance: "important" });
    }
  });

  // TIER 1: Skill-level semantic embeddings
  const semanticResult = calculateSemanticSkillScore(
    seekerSkillNames,
    allReqSkills,
    features?.skill_embeddings_map
  );

  // Recovery for title matches
  const vacancyTitleLower = (vacancy.title || "").toLowerCase();
  const hasTitleMatch = seeker.work_history.some(w => 
    w.role_title?.toLowerCase().includes(vacancyTitleLower) || vacancyTitleLower.includes(w.role_title?.toLowerCase() || "")
  );

  if (semanticResult !== null) {
    const w = DEFAULT_WEIGHTS.f1;
    const raw = Math.max(semanticResult.score, hasTitleMatch ? 0.95 : 0);
    return { 
      score: { raw, confidence: 0.95, weighted: raw * w }, 
      explanation: semanticResult.explanation 
    };
  }

  // Fallback if semantic scoring is skipped
  const finalRaw = hasTitleMatch ? 0.95 : 0.5;
  const finalConfidence = 0.5;
  const w = DEFAULT_WEIGHTS.f1;
  
  return { 
    score: { raw: finalRaw, confidence: finalConfidence, weighted: finalRaw * w }, 
    explanation: emptyExplanation 
  };
}

// ─── F2: Experience Depth + Domain Relevance ──────────────────────────────────
// FIX 2: Years alone are not enough. A Fishery Worker with 6 years experience
// should NOT score the same as a Software Developer with 6 years for a dev role.
// Domain relevance multiplier rescales years score by work history alignment.

function scoreExperience(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): { score: DimensionScore; relevant_experience_months: number } {
  const minYears = vacancy.experienceMin;
  const maxYears = vacancy.experienceMax;
  const totalMonths = seeker.experience_years * 12;

  let bestScore = 0;
    const vacancyTitle = (vacancy.title || "").toLowerCase();
    seeker.work_history.forEach(exp => {
      let relevance = scoreDomainRelevance({ ...seeker, work_history: [exp] }, vacancy.title ?? "");
      
      // Direct Title Match Boost
      if (exp.role_title?.toLowerCase().includes(vacancyTitle) || 
          vacancyTitle.includes(exp.role_title?.toLowerCase() || "")) {
      relevance = Math.max(relevance, 0.9);
    }

    const durationWeight = Math.min(1, (exp.months || 0) / (minYears * 12 || 12));
    const scoreVal = relevance * durationWeight;
    if (scoreVal > bestScore) bestScore = scoreVal;
  });

  const w = DEFAULT_WEIGHTS.f2;
  return {
    score: { raw: Math.max(0, Math.min(1, bestScore)), confidence: 0.8, weighted: bestScore * w },
    relevant_experience_months: totalMonths,
  };
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

  if (!course) return { raw: 0.3, confidence: 0.3, weighted: 0.3 * DEFAULT_WEIGHTS.f7 };

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

// ─── F5: Salary ───────────────────────────────────────────────────────────────
function scoreSalary(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload
): DimensionScore {
  return { raw: 0, confidence: 1.0, weighted: 0 };
}

// ─── F6: Profile Completeness ─────────────────────────────────────────────────
function scoreCompleteness(seeker: DeidentifiedSeeker): DimensionScore {
  const checks = [seeker.skills.length > 0, seeker.experience_years > 0, seeker.education_level !== "No data", seeker.certifications.length > 0, seeker.preferred_occupations.length > 0, seeker.expected_salary_min != null, seeker.languages.length > 0, seeker.logistics_zone !== "unknown", seeker.work_type_preference !== "either", seeker.job_seeking_status !== "unknown"];
  const raw = checks.filter(Boolean).length / checks.length;
  return { raw, confidence: 1.0, weighted: 0 };
}

// ─── Grade Helper ─────────────────────────────────────────────────────────────
function gradeFromScore(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Fair";
  return "Weak";
}

// ─── Main Scorer ──────────────────────────────────────────────────────────────
const SEMANTIC_BRIDGE_THRESHOLD = 0.72;
const DEFAULT_WEIGHTS = {
  f1: 0.50, // Skills
  f2: 0.35, // Experience
  f3: 0.05, // Education
  f7: 0.10, // Edu Relevance
};

export function computeUtilityScore(
  seeker: DeidentifiedSeeker,
  vacancy: VacancyPayload,
  overrides?: WeightOverrides,
  features?: any
): ScoringResult {
  const w = {
    f1: overrides?.f1 ?? DEFAULT_WEIGHTS.f1,
    f2: overrides?.f2 ?? DEFAULT_WEIGHTS.f2,
    f3: overrides?.f3 ?? DEFAULT_WEIGHTS.f3,
    f7: DEFAULT_WEIGHTS.f7,
  };

  const constraint_violations: string[] = [];
  const { score: f1, explanation } = scoreSkillFit(seeker, vacancy, features);
  const { score: f2Raw, relevant_experience_months } = scoreExperience(seeker, vacancy);
  const f3 = scoreEducation(seeker, vacancy);
  const f6_completeness = scoreCompleteness(seeker);
  const f7 = scoreEducationRelevance(seeker, vacancy, features);

  const rawUtility = 
    (f1.weighted || 0) + 
    (f2Raw.weighted || 0) + 
    (f3.weighted || 0) + 
    (f7.weighted || 0);
  const utility_score = Math.round(rawUtility * 10000) / 100;

  // Sigmoid calibration: center 0.45 to reward strong professional profiles
  const { final_score, percentile_rank, confidence_band } = calibrateScore(rawUtility);

  if (seeker.job_seeking_status === "not_looking") {
    constraint_violations.push("Candidate is not actively seeking employment.");
  }
  if (f3.raw < 1.0) {
    constraint_violations.push("Candidate does not meet the minimum education requirement.");
  }
  if (f6_completeness.raw < 0.4) {
    constraint_violations.push("Candidate profile is sparse — scores may be unreliable.");
  }

  return {
    utility_score,
    final_score,
    percentile_rank,
    confidence_band,
    grade: gradeFromScore(final_score),
    f1,
    f2: f2Raw,
    f3,
    f6_completeness,
    f7,
    relevant_experience_months,
    constraint_violations,
    explanation,
  };
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
