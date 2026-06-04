import crypto from "node:crypto";
import Groq from "groq-sdk";
import { supabaseAdmin } from "../supabase";
import {
  applySemanticConfidenceAdjustments,
  buildVacancyPayload,
  computeUtilityScore,
  type ScoringResult,
  type WeightOverrides,
} from "./scoring-engine";
import { deidentifyJobseeker, type RawJobseeker, type DeidentifiedSeeker } from "./deidentify";
import { getLogisticsZone } from "./skill-normalizer";
import { ensureSynonymsLoaded } from "./skill-synonym-service";
import { buildEmbeddingsMapForSkills, getOrGenerateEmbedding } from "./embedding-cache-service";
import { correctSkillSpelling } from "./ai-correction-service";
import { TFIDFVectorizer } from "./tfidf-vectorizer";
import { TFIDFScorer } from "./tfidf-scorer";
import { skillMapper } from "./skill-taxonomy-mapper";

const envKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const GROQ_API_KEYS = envKeys.split(",").map(k => k.trim()).filter(Boolean);

let _tfidfScorer: TFIDFScorer | null = null;

async function ensureTFIDFScorer(): Promise<TFIDFScorer | null> {
  if (_tfidfScorer) return _tfidfScorer;

  try {
    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('description, main_skill_desired')
      .not('description', 'is', null);
    const { data: seekers } = await supabaseAdmin
      .from('jobseekers')
      .select('other_skills')
      .not('other_skills', 'is', null);

    const corpus: string[] = [];
    for (const job of jobs || []) {
      if (job.description) corpus.push(job.description);
      if (job.main_skill_desired) corpus.push(job.main_skill_desired);
    }
    for (const seeker of seekers || []) {
      if (seeker.other_skills) corpus.push(seeker.other_skills);
    }

    if (corpus.length < 5) {
      console.warn('[TF-IDF] Insufficient corpus — skipping vectorizer initialization');
      return null;
    }

    const vectorizer = new TFIDFVectorizer({ minDf: 2, maxDf: 0.95 });
    vectorizer.fit(corpus);
    _tfidfScorer = new TFIDFScorer(vectorizer);
    console.log(`[TF-IDF] Vectorizer initialized — ${vectorizer.vocabularySize} terms from ${corpus.length} documents`);
    return _tfidfScorer;
  } catch (err) {
    console.warn('[TF-IDF] Initialization failed — continuing with fallback scoring:', err);
    return null;
  }
}

export const MATCHING_SYSTEM_PROMPT = `
# ================================================================
# NSRP NARRATIVE ENGINE — v3.0
# AI Job Matching Narrative Engine
# Project: NSRP / Jobseeker–Vacancy Matching (Philippines)
#
# SCOPE: This prompt governs ONLY the narrative/summary layer.
# Numeric scores (f1–f3, f7) are ALWAYS computed by scoring-engine.ts
# and passed in as inputs. This model NEVER produces or modifies
# scores. It translates them into professional HR analyst language.
# ================================================================

ROLE
You are an expert HR analyst and job matching specialist for a Philippine
public employment system (NSRP - National Skills Registry Program).
Your audience is an employment facilitator who will use your output to
decide on interview referrals. Write like a thoughtful senior recruiter.

# ================================================================
# INPUT CONTRACT
# You will always receive a structured JSON payload.
# ================================================================

INPUT FORMAT
{
  "job": {
    "title": string,
    "description_summary": string,
    "work_type": string,
    "location": string,
    "key_skills": string[],
    "min_education": string
  },
  "scores": {
    "f1_skill_fit":    { "score": 0–100, "confidence": 0.0–1.0 },
    "f2_experience":   { "score": 0–100, "confidence": 0.0–1.0 },
    "f3_education":    { "score": 0–100, "confidence": 1.0 },
    "f7_education_relevance": { "score": 0–100, "confidence": 0.0–1.0 },
    "f6_completeness": { "score": 0–100, "confidence": 1.0 },
    "overall": 0–100
  },
  "candidate": {
    "preferred_occupations": string[],
    "top_skills": string[],
    "domain_relevant_months": number,
    "total_experience_months": number,
    "education_level": string,
    "education_course": string,
    "work_history_titles": string[]
  }
}

# ================================================================
# OUTPUT CONTRACT — STRICT JSON ONLY
# ================================================================

OUTPUT FORMAT
{
  "headline": string,
  "narrative": string,
  "summary": string,
  "strengths": string[],
  "concerns": string[],
  "data_quality_note": string | null,
  "recommendation": string
}

# ================================================================
# NARRATIVE FIELD — PRIMARY DELIVERABLE
# ================================================================

The "narrative" field is the most important output. It must be:
- A single cohesive paragraph, 60–120 words
- Written in third person ("The candidate...", "Their background...")
- Professional, neutral, encouraging — reads as a human HR analyst wrote it
- NOT robotic or list-like
- Calibrated to the score band below

SCORE BAND TONE GUIDE:
| overall >= 90 | Strongly affirm fit, fast-track language |
| overall 75–89 | Affirm fit, highlight top strengths |
| overall 60–74 | Balanced, note strengths + growth areas |
| overall 40–59 | Cautiously positive, flag key gaps |
| overall < 40  | Honest, redirect to upskilling |

NARRATIVE WRITING RULES:

RULE 1: POSITIVE FRAMING FOR SCORES >= 50.
  NEVER say the candidate "lacks" or "has gaps in" skills unless overall < 50.
  BAD:  "lacks relevant experience in software development"
  GOOD: "demonstrates transferable experience that maps closely to the role's requirements"

RULE 2: LEAD WITH STRONGEST SIGNALS.
  Mention matched skills first, then experience domain, then education fit.

RULE 3: HANDLE CROSS-OCCUPATION MATCHES GRACEFULLY.
  If preferred occupation != vacancy title, frame it as a positive transition:
  GOOD: "While the candidate's background is rooted in [Field A], their declared skills
  in [Skill X] directly satisfy the core technical requirements of this [Field B] role."

RULE 4: REFERENCE SPECIFIC DATA POINTS.
  - Name at least 1 matched skill from top_skills vs key_skills
  - Mention education_level and whether it meets min_education
  - Reference domain_relevant_months converted to years as the primary experience signal
  - If total_experience_months differs from domain_relevant_months, note the total too:
    BAD: "has 6 years of relevant experience"
    GOOD: "has 2 years of direct Software Developer experience, with 6 years of total work history"

RULE 5: CLOSE WITH BANDED INTERVIEW RECOMMENDATION.
  overall >= 70:  End with "Recommended for priority employer interview."
  overall 40–69:  End with "Recommended for screening interview to validate transferable skills."
  overall < 40:   End with "Recommended for skills development referral before placement."

RULE 6: LENGTH — strictly 60–120 words in the narrative field.

RULE 7: EDUCATION COMPARISON — never say "not specified".
  ALWAYS restate the candidate's actual education_level value from the input data.
  Compare it semantically to the job's min_education:
  - If education_level matches or exceeds min_education → say "meets/exceeds the requirement"
  - If education_level is below min_education → say "is below the required level of [min_education]"
  - If education_level is genuinely absent from the record → say "is not on file"
  NEVER use the phrase "not specified" for education level.

# ================================================================
# OTHER FIELDS
# ================================================================

"headline": One sentence. Lead with the candidate's strongest skill or experience match.

"summary": 2–3 sentences. Internal analyst note focusing on skill alignment and role relevance.
  For overall >= 50: focus on what maps well.
  For overall < 50: be honest about the gap, still constructive.

"strengths": Array of specific matched skills or relevant experience highlights.

"concerns": Array of skill or experience gaps. Only include if overall < 50 OR f3 is failing.
  For overall >= 50: this array should be empty or contain only minor growth areas.

"data_quality_note": null unless f6_completeness < 40 (incomplete profile).

"recommendation":
  "Strong fit"     — overall >= 75 AND f3 passing
  "Possible fit"   — overall 50–74
  "Weak fit"       — overall < 50 OR f3 failing
  "Flag for review"— f6_completeness < 40 OR major inconsistencies
`;

export interface MatchingInput {
  jobseeker_id: string;
  job_id: string;
  weights?: {
    f1_skill_match?: number;
    f2_experience_arc?: number;
    f3_education_qpe?: number;
  };
}

export type MatchingErrorCode =
  | "DB_ERROR"
  | "LLM_ERROR"
  | "INVALID_RESPONSE"
  | "MISSING_DEPENDENCY"
  | "PERSISTENCE_ERROR"
  | "DISABLED";

export type MatchingError = {
  code: MatchingErrorCode;
  message: string;
  details?: unknown;
};

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type SemanticInterpretation = {
  jobseeker_skill: string;
  vacancy_skill: string;
  is_semantic_match: boolean;
  confidence: number;
};

export type MatchingRunSuccess = {
  result: ScoringResult & {
    headline: string;
    narrative: string;
    summary: string;
    strengths: string[];
    concerns: string[];
    logistics_note: string;
    data_quality_note: string | null;
    recommendation: string;
    gaps: string[];
    semantic_skill_interpretations: SemanticInterpretation[];
    bias_flags: string[];
  };
  metadata: {
    logistics_zone: string;
    education_level: string;
  };
  prompt_hash: string;
  parameter_fingerprint: string;
  score_version: string;
  corrections: {
    skills: Array<{ original: string; corrected: string; confidence: number }>;
    roles: Array<{ original: string; matched_to: string; same_role: boolean; similarity: number }>;
  };
};

type JobseekerRow = RawJobseeker & {
  jobseeker_experience?: Array<{ number_of_months?: number | string | null; position?: string | null; responsibilities?: string | null }>;
  jobseeker_education?: Array<{ level?: string | null; school_name?: string | null; course?: string | null }>;
  jobseeker_trainings?: Array<{ skills_acquired?: string | null; certificates_received?: string | null }>;
  jobseeker_licenses?: Array<{ professional_license?: string | null }>;
  other_skills?: Array<{ skill?: string | null; name?: string | null; proficiency_level?: string | null; years?: number | null; years_min?: number | null }>;
};

type JobRow = {
  id: string;
  position_title?: string | null;
  minimum_education_required?: string | null;
  main_skill_desired?: string | null;
  years_of_experience_required?: number | string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  work_setup?: string | null;
  work_type?: string | null;
  description?: string | null;
  employers?: { city?: string | null; province?: string | null; industry?: string | null; establishment_name?: string | null } | null;
};

function toWeightOverrides(weights?: MatchingInput["weights"]): WeightOverrides | undefined {
  if (!weights) return undefined;
  return {
    f1: weights.f1_skill_match,
    f2: weights.f2_experience_arc,
    f3: weights.f3_education_qpe,
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeStringArray(value: unknown, fieldName: string = "unknown"): string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    console.warn("[LLM Mismatch] Field " + fieldName + " received a string instead of an array. Wrapping in array. Raw: " + value);
    return [value.trim()];
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function safeSemanticArray(value: unknown): SemanticInterpretation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const jobseeker_skill = typeof entry.jobseeker_skill === "string" ? entry.jobseeker_skill : "";
      const vacancy_skill = typeof entry.vacancy_skill === "string" ? entry.vacancy_skill : "";
      const is_semantic_match = Boolean(entry.is_semantic_match);
      const confidence = typeof entry.confidence === "number" ? entry.confidence : 0;
      if (!jobseeker_skill || !vacancy_skill) return null;
      return { jobseeker_skill, vacancy_skill, is_semantic_match, confidence };
    })
    .filter((item): item is SemanticInterpretation => Boolean(item));
}

async function loadJobseeker(jobseekerId: string): Promise<Result<JobseekerRow, MatchingError>> {
  const { data, error } = await supabaseAdmin
    .from("jobseekers")
    .select("*, education_level, jobseeker_experience(*), jobseeker_education(*), jobseeker_trainings(*), jobseeker_licenses(*), jobseeker_languages(*), other_skills")
    .eq("id", jobseekerId)
    .single();

  if (error || !data) {
    return { ok: false, error: { code: "DB_ERROR", message: "Failed to load jobseeker", details: error ?? null } };
  }

  return { ok: true, value: data as JobseekerRow };
}

async function loadJob(jobId: string): Promise<Result<JobRow, MatchingError>> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, minimum_education_required, main_skill_desired, years_of_experience_required, salary_min, salary_max, work_setup, work_type, description, employers(city, province, industry, establishment_name)")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    return { ok: false, error: { code: "DB_ERROR", message: "Failed to load vacancy", details: error ?? null } };
  }

  return { ok: true, value: data as JobRow };
}

function buildUserMessage(job: JobRow, seeker: DeidentifiedSeeker, result: ScoringResult & { relevant_experience_months: number }, tfidfNarrative?: string) {
  const payload = {
    job: {
      title: job.position_title ?? "",
      description_summary: (job.description ?? "").substring(0, 300),
      work_type: job.work_type ?? "full-time",
      location: `${job.employers?.city ?? ""}, ${job.employers?.province ?? ""}`.trim(),
      key_skills: (job.main_skill_desired ?? "").split(",").map(s => s.trim()),
      min_education: job.minimum_education_required ?? ""
    },
    scores: {
      f1_skill_fit:    { score: Math.round(result.f1.raw * 100), confidence: result.f1.confidence },
      f2_experience:   { score: Math.round(result.f2.raw * 100), confidence: result.f2.confidence },
      f3_education:    { score: Math.round(result.f3.raw * 100), confidence: result.f3.confidence },
      f6_completeness: { score: Math.round(result.f6_completeness.raw * 100), confidence: result.f6_completeness.confidence },
      f7_education_relevance: { score: Math.round((result.f7?.raw ?? 0) * 100), confidence: result.f7?.confidence ?? 0 },
      overall: result.utility_score
    },
    candidate: {
      preferred_occupations: seeker.preferred_occupations,
      preferred_locations: seeker.preferred_locations,
      residential_address: seeker.logistics_zone,
      work_type_preference: seeker.work_type_preference,
      job_seeking_status: seeker.job_seeking_status,
      languages: seeker.languages,
      top_skills: seeker.skills.map(s => s.name),
      domain_relevant_months: result.relevant_experience_months,
      total_experience_months: result.total_experience_months,
      education_level: seeker.education_level,
      education_course: seeker.education_course,
      work_history_titles: seeker.work_history.map(w => w.role_title).filter(Boolean)
    },
    ...(tfidfNarrative ? { skill_analysis: tfidfNarrative } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

async function callNarrativeModelGroq(userMessage: string): Promise<Result<{ 
  headline: string;
  narrative: string;
  summary: string; 
  strengths: string[]; 
  concerns: string[]; 
  logistics_note: string;
  data_quality_note: string | null;
  recommendation: string;
  model: string 
}, MatchingError>> {
  if (GROQ_API_KEYS.length === 0) {
    return { ok: false, error: { code: "MISSING_DEPENDENCY", message: "GROQ_API_KEYS are not configured" } };
  }

  const maxRetries = GROQ_API_KEYS.length;
  let attempt = 0;

  while (attempt < maxRetries) {
    // Rotate key based on attempt
    const currentKey = GROQ_API_KEYS[attempt % GROQ_API_KEYS.length];
    const groq = new Groq({ apiKey: currentKey });

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: MATCHING_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as any;

      return {
        ok: true,
        value: {
          headline: typeof parsed.headline === "string" ? parsed.headline : "Match evaluation completed.",
          narrative: typeof parsed.narrative === "string" ? parsed.narrative : "",
          summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
          strengths: safeStringArray(parsed.strengths, "strengths"),
          concerns: safeStringArray(parsed.concerns, "concerns"),
          logistics_note: typeof parsed.logistics_note === "string" ? parsed.logistics_note : "",
          data_quality_note: typeof parsed.data_quality_note === "string" ? parsed.data_quality_note : null,
          recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "Flag for review",
          model: "llama-3.3-70b-versatile"
        },
      };
    } catch (error: any) {
      attempt++;
      console.warn(`[Groq Attempt ${attempt} Failed with key ...${currentKey?.slice(-4)}]`, error.message);
      
      // If it's a 429 rate limit or 401 unauthorized, we immediately retry with the next key
      // If it's another error, we could delay or throw, but here we just continue to the next key.
      if (attempt < maxRetries) {
        // Small delay to prevent bursting too hard
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        return { ok: false, error: { code: "LLM_ERROR", message: "All Groq API keys exhausted or failed", details: error } };
      }
    }
  }

  return { ok: false, error: { code: "LLM_ERROR", message: "Unexpected loop termination in Groq", details: null } };
}

async function callNarrativeModelCloudflare(userMessage: string): Promise<Result<{ 
  headline: string;
  narrative: string;
  summary: string; 
  strengths: string[]; 
  concerns: string[]; 
  logistics_note: string;
  data_quality_note: string | null;
  recommendation: string;
  model: string 
}, MatchingError>> {
  const url = process.env.AI_FALLBACK_URL;
  if (!url) return { ok: false, error: { code: "MISSING_DEPENDENCY", message: "AI_FALLBACK_URL not configured" } };

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:7b",
        messages: [
          { role: "system", content: MATCHING_SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        format: "json",
        stream: false,
        options: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.message?.content ?? "{}";
    const parsed = JSON.parse(content) as any;

    return {
      ok: true,
      value: {
        headline: typeof parsed.headline === "string" ? parsed.headline : "Match evaluation completed.",
        narrative: typeof parsed.narrative === "string" ? parsed.narrative : "",
        summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
        strengths: safeStringArray(parsed.strengths, "strengths"),
        concerns: safeStringArray(parsed.concerns, "concerns"),
        logistics_note: typeof parsed.logistics_note === "string" ? parsed.logistics_note : "",
        data_quality_note: typeof parsed.data_quality_note === "string" ? parsed.data_quality_note : null,
        recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "Flag for review",
        model: "cloudflare/qwen2.5:7b"
      },
    };
  } catch (error: any) {
    console.warn(`[Cloudflare Fallback Failed]:`, error.message);
    return { ok: false, error: { code: "LLM_ERROR", message: "Cloudflare fallback failed", details: error } };
  }
}

async function callNarrativeModelOllama(userMessage: string): Promise<Result<{ 
  headline: string;
  narrative: string;
  summary: string; 
  strengths: string[]; 
  concerns: string[]; 
  logistics_note: string;
  data_quality_note: string | null;
  recommendation: string;
  model: string 
}, MatchingError>> {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:7b",
        messages: [
          { role: "system", content: MATCHING_SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        format: "json",
        stream: false,
        options: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.message?.content ?? "{}";
    const parsed = JSON.parse(content) as any;

    return {
      ok: true,
      value: {
        headline: typeof parsed.headline === "string" ? parsed.headline : "Match evaluation completed.",
        narrative: typeof parsed.narrative === "string" ? parsed.narrative : "",
        summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
        strengths: safeStringArray(parsed.strengths, "strengths"),
        concerns: safeStringArray(parsed.concerns, "concerns"),
        logistics_note: typeof parsed.logistics_note === "string" ? parsed.logistics_note : "",
        data_quality_note: typeof parsed.data_quality_note === "string" ? parsed.data_quality_note : null,
        recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "Flag for review",
        model: "ollama/qwen2.5:7b"
      },
    };
  } catch (error: any) {
    console.warn(`[Ollama Fallback Failed]:`, error.message);
    return { ok: false, error: { code: "LLM_ERROR", message: "Ollama fallback failed", details: error } };
  }
}

export async function callNarrativeModel(job: JobRow, seeker: DeidentifiedSeeker, result: ScoringResult & { relevant_experience_months: number }, tfidfNarrative?: string): Promise<Result<{ 
  headline: string;
  narrative: string;
  summary: string; 
  strengths: string[]; 
  concerns: string[]; 
  logistics_note: string;
  data_quality_note: string | null;
  recommendation: string;
  model: string 
}, MatchingError>> {
  if (process.env.DISABLE_NARRATIVE === "true") {
    return { ok: false, error: { code: "DISABLED", message: "Narrative generation disabled via env" } };
  }

  const userMessage = buildUserMessage(job, seeker, result, tfidfNarrative);
  
  // Primary: Groq with API Key Rotation
  const groqResult = await callNarrativeModelGroq(userMessage);
  if (groqResult.ok) return groqResult;

  // Fallback to Cloudflare Tunnel (External Qwen2.5:7b)
  console.warn("[Matching] Groq failed, falling back to Cloudflare Tunnel Qwen2.5:7b...");
  const cfResult = await callNarrativeModelCloudflare(userMessage);
  if (cfResult.ok) return cfResult;

  // Final Fallback: Local Ollama
  console.warn("[Matching] Cloudflare Tunnel failed, falling back to local Ollama qwen2.5:7b...");
  const ollamaResult = await callNarrativeModelOllama(userMessage);
  if (ollamaResult.ok) return ollamaResult;

  // If both fail, return the last error
  return ollamaResult;
}
function buildPromptFingerprint(weights?: WeightOverrides): string {
  return JSON.stringify({ weights: weights ?? null, score_version: process.env.MATCHING_SCORE_VERSION ?? "1.0.0" });
}

/**
 * Main entry point for matching a job to a seeker.
 * COMBINES STAGE 1, 2, 3, 4, and 5.
 */
export async function matchJobToSeeker(job_id: string, jobseeker_id: string, overrides?: WeightOverrides): Promise<Result<MatchingRunSuccess, MatchingError>> {
  const scoreVersion = process.env.MATCHING_SCORE_VERSION ?? "2.0.0";
  console.log(`[Matching Pipeline] Starting match for Job:${job_id} and Seeker:${jobseeker_id}`);

  // STAGE 1: DATA EXTRACTION
  const seekerResult = await loadJobseeker(jobseeker_id);
  if (!seekerResult.ok) return seekerResult;

  const jobResult = await loadJob(job_id);
  if (!jobResult.ok) return jobResult;

  const rawSeeker = seekerResult.value;
  const job = jobResult.value;

  // STAGE 2: DE-IDENTIFICATION
  const seeker = deidentifyJobseeker(rawSeeker);

  // STAGE 2.5: AI SKILL CORRECTION
  seeker._corrections = [];
  try {
    const correctionPromise = (async () => {
      const skillsToCheck = [
        ...seeker.skills.map(s => s.name).filter(n => n.length > 2),
        ...seeker.preferred_occupations.filter(n => n.length > 2)
      ];
      const uniqueSkills = [...new Set(skillsToCheck)];
      const results = await Promise.allSettled(
        uniqueSkills.map(skill => correctSkillSpelling(skill))
      );
      const corrections: Array<{ original: string; corrected: string; confidence: number }> = [];
      results.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value.changed && r.value.confidence >= 0.70) {
          corrections.push({ original: r.value.original, corrected: r.value.corrected, confidence: r.value.confidence });
          const originalSkill = uniqueSkills[idx];
          // Update seeker.skills
          seeker.skills = seeker.skills.map(s => s.name === originalSkill ? { ...s, name: r.value.corrected } : s);
          // Update seeker.preferred_occupations
          seeker.preferred_occupations = seeker.preferred_occupations.map(p => p === originalSkill ? r.value.corrected : p);
        }
      });
      seeker._corrections = corrections;
    })();
    await Promise.race([
      correctionPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
    ]);
  } catch (err) {
    console.warn("[Matching Pipeline] Stage 2.5 AI correction timed out or failed — continuing with original data:", err);
  }

  // STAGE 3: DETERMINISTIC SCORING
  const vacancy = buildVacancyPayload({
    id: job.id,
    title: job.position_title ?? undefined,
    requiredSkills: job.main_skill_desired ? [{ name: job.main_skill_desired, years_min: Number(job.years_of_experience_required) || 0, is_required: true }] : [],
    preferredSkills: [],
    experienceMin: Number(job.years_of_experience_required) || 0,
    experienceMax: (Number(job.years_of_experience_required) || 0) + 3,
    educationRequired: job.minimum_education_required ?? "no_formal",
    educationFieldPreferred: job.employers?.industry ?? null,
    city: job.employers?.city ?? null,
    province: job.employers?.province ?? null,
    workSetup: job.work_setup ?? "onsite",
    workType: job.work_type ?? "full-time",
    description: job.description ?? "",
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
  });

  // Pre-load synonyms & dynamically build embeddings map for all skills
  await ensureSynonymsLoaded();
  const allSkills = [
    ...(vacancy.requiredSkills?.map(s => s.name) || []),
    ...(vacancy.preferredSkills?.map(s => s.name) || []),
    ...(seeker.skills?.map(s => s.name) || [])
  ];
  const skillEmbeddingsMap = await buildEmbeddingsMapForSkills(allSkills);

  // Generate embeddings for profile text and description (f8 dimension)
  try {
    const profileParts = [
      ...seeker.skills.map(s => s.name),
      ...seeker.work_history.map(w => w.role_title),
      ...seeker.preferred_occupations,
      seeker.education_course
    ].filter(Boolean);
    const profileText = profileParts.join(" ").toLowerCase().trim();
    const descText = (job.description || "").toLowerCase().trim();
    if (profileText) {
      const profileEmb = await getOrGenerateEmbedding(profileText);
      if (profileEmb) skillEmbeddingsMap[profileText] = profileEmb;
    }
    if (descText) {
      const descEmb = await getOrGenerateEmbedding(descText);
      if (descEmb) skillEmbeddingsMap[descText] = descEmb;
    }
  } catch (err) {
    console.warn("[Matching Pipeline] f8 embedding generation failed — continuing without description relevance:", err);
  }

  const tfidfScorer = await ensureTFIDFScorer();
  const scoringResult = await computeUtilityScore(seeker, vacancy, overrides, {
    skill_embeddings_map: skillEmbeddingsMap,
    tfidfScorer: tfidfScorer ?? undefined,
  });
  console.log(`[Matching Pipeline] Stage 3 Complete. Utility Score: ${scoringResult.utility_score}, Grade: ${scoringResult.grade}`);

  // Compute TF-IDF narrative enrichment for the LLM
  let tfidfNarrative: string | undefined;
  if (tfidfScorer && tfidfScorer.vocabularySize > 0) {
    try {
      const expansion = skillMapper.expandAllSkills(seeker.skills.map(s => s.name));
      const seekerText = [
        ...expansion.expandedSkills,
        ...seeker.work_history.map(w => w.role_title).filter(Boolean) as string[],
      ].join(' ');
      const jobText = [
        ...(vacancy.requiredSkills || []).map(s => s.name),
        vacancy.title || '',
        vacancy.description || '',
      ].filter(Boolean).join(' ');
      const tfidfMatch = tfidfScorer.score(seekerText, jobText);
      tfidfNarrative = TFIDFScorer.formatBreakdown(tfidfMatch);
    } catch (err) {
      console.warn('[Matching Pipeline] TF-IDF narrative enrichment failed — continuing:', err);
    }
  }

  // STAGE 4: LLM NARRATIVE GENERATION
  const narrativeResult = await callNarrativeModel(job, seeker, scoringResult, tfidfNarrative);
  
  let finalNarrative = {
    headline: "",
    narrative: "",
    summary: "",
    strengths: [] as string[],
    concerns: [] as string[],
    logistics_note: "",
    data_quality_note: null as string | null,
    recommendation: "Flag for review",
    model: "none"
  };

  if (narrativeResult.ok) {
    finalNarrative = narrativeResult.value;
    console.log(`[Matching Pipeline] Stage 4 Complete. Model used: ${finalNarrative.model}`);
  } else {
    console.warn(`[Matching Pipeline] Stage 4 Failed: ${narrativeResult.error.message}. Proceeding with deterministic defaults.`);
    finalNarrative.summary = `Candidate has a ${scoringResult.grade} fit for this position based on deterministic analysis.`;
  }

  // STAGE 5: PERSISTENCE
  const promptFingerprint = buildPromptFingerprint(overrides);
  const promptHash = sha256(JSON.stringify({ job_id, jobseeker_id, scoringResult }));

  const scorePayload = {
    job_id,
    jobseeker_id,
    utility_score: scoringResult.utility_score,
    suitability_score: scoringResult.utility_score,
    grade: scoringResult.grade,
    dimension_scores: {
      f1: scoringResult.f1,
      f2: scoringResult.f2,
      f3: scoringResult.f3,
      f6: scoringResult.f6_completeness,
      f7: scoringResult.f7,
      f1_raw: scoringResult.f1.raw,
      f2_raw: scoringResult.f2.raw,
      f3_raw: scoringResult.f3.raw,
      f6_raw: scoringResult.f6_completeness.raw,
      headline: finalNarrative.headline,
      narrative: finalNarrative.narrative,
      data_quality_note: finalNarrative.data_quality_note,
      recommendation: finalNarrative.recommendation
    },
    summary: finalNarrative.summary,
    ai_summary: finalNarrative.summary,
    strengths: finalNarrative.strengths,
    gaps: finalNarrative.concerns,
    bias_flags: scoringResult.constraint_violations,
    constraint_violations: scoringResult.constraint_violations,
    computed_at: new Date().toISOString(),
    corrections: {
      skills: seeker._corrections || [],
      roles: [] as { original: string; matched_to: string; same_role: boolean; similarity: number }[],
    },
  };

  const { error: upsertError } = await supabaseAdmin
    .from("job_match_scores")
    .upsert(scorePayload, { onConflict: "job_id,jobseeker_id" });

  if (upsertError) {
    console.error("[Matching Pipeline] Stage 5 Persistence Error:", upsertError);
    return { ok: false, error: { code: "PERSISTENCE_ERROR", message: "Failed to persist match score", details: upsertError } };
  }

  // Optional: Structured logging to ai_matching_logs
  try {
    await supabaseAdmin.from("ai_matching_logs").insert({
      job_id,
      jobseeker_id,
      model_used: finalNarrative.model,
      final_score: scoringResult.utility_score
    });
  } catch (e) {
    console.warn("Failed to log matching run", e);
  }

  console.log(`[Matching Pipeline] Pipeline Finished Successfully for Job:${job_id}`);

  return {
    ok: true,
    value: {
      result: {
        ...scoringResult,
        headline: finalNarrative.headline,
        narrative: finalNarrative.narrative,
        summary: finalNarrative.summary,
        strengths: finalNarrative.strengths,
        concerns: finalNarrative.concerns,
        logistics_note: finalNarrative.logistics_note,
        data_quality_note: finalNarrative.data_quality_note,
        recommendation: finalNarrative.recommendation,
        gaps: finalNarrative.concerns, // For backwards compatibility
        semantic_skill_interpretations: [], // Compatibility
        bias_flags: scoringResult.constraint_violations
      },
      metadata: {
        logistics_zone: seeker.logistics_zone,
        education_level: seeker.education_level,
      },
      prompt_hash: promptHash,
      parameter_fingerprint: promptFingerprint,
      score_version: scoreVersion,
      corrections: {
        skills: seeker._corrections || [],
        roles: [] as { original: string; matched_to: string; same_role: boolean; similarity: number }[],
      },
    },
  };
}

/**
 * Legacy wrapper for compatibility with existing API routes.
 */
export async function runMatching(input: MatchingInput): Promise<Result<MatchingRunSuccess, MatchingError>> {
  return matchJobToSeeker(input.job_id, input.jobseeker_id, toWeightOverrides(input.weights));
}

export { deidentifyJobseeker };
export type { ScoringResult } from "./scoring-engine";
