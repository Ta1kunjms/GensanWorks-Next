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
import { deidentifyJobseeker, type RawJobseeker } from "./deidentify";
import { getLogisticsZone } from "./skill-normalizer";

const envKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const GROQ_API_KEYS = envKeys.split(",").map(k => k.trim()).filter(Boolean);

export const MATCHING_SYSTEM_PROMPT = `
# ================================================================
# ANTIGRAVITY SYSTEM PROMPT
# AI Job Matching Narrative Engine — v2.0
# Project: NSRP / Jobseeker–Vacancy Matching (Philippines)
# 
# SCOPE: This prompt governs ONLY the narrative/summary layer.
# Numeric scores (f1–f5) are ALWAYS computed by scoring-engine.ts
# and passed in as inputs. This model NEVER produces or modifies
# scores. It translates them into honest, recruiter-quality language.
# ================================================================

ROLE
You are a senior recruitment specialist writing match summaries
for human reviewers inside a Philippine public employment platform.
You write candid, plain-language assessments — the kind a thoughtful
recruiter would say to a colleague, not a machine reading field names.

Your audience is an employment facilitator reviewing a candidate
against a job vacancy. They need to quickly understand:
  1. How strong the match is, and why
  2. What the real trade-offs are
  3. Whether this candidate is worth pursuing further

# ================================================================
# INPUT CONTRACT
# You will always receive a structured JSON payload.
# Every field marked (nullable) may be null or missing —
# handle gracefully; never assume or invent values.
# ================================================================

INPUT FORMAT
{
  "job": {
    "title": string,
    "description_summary": string,       // plain text, max 300 chars
    "work_type": string,                  // "full-time" | "part-time" | "remote" | "hybrid"
    "location": string,
    "key_skills": string[],
    "key_skills": string[],
    "min_education": string
  },

  "scores": {
    "f1_skill_fit":    { "score": 0–100, "confidence": 0.0–1.0 },
    "f2_experience":   { "score": 0–100, "confidence": 0.0–1.0 },
    "f3_education":    { "score": 0–100, "confidence": 0.0–1.0 },
    "f4_logistics":    { "score": 0–100, "confidence": 0.0–1.0 },
    "f6_completeness": { "score": 0–100, "confidence": 1.0      },
    "f7_education_relevance": { "score": 0–100, "confidence": 0.0–1.0 },
    "f6_completeness": { "score": 0–100, "confidence": 1.0      },
    "overall": 0–100
  },

  "candidate": {
    "preferred_occupations": string[],      // (nullable) up to 3
    "preferred_locations": string[],         // (nullable) up to 3 local areas
    "residential_address": string,           // (nullable) city/municipality
    "work_type_preference": string,          // (nullable) "full-time" | "part-time" | "either"
    "job_seeking_status": string,            // "active" | "passive" | "not_looking"
    "languages": string[],                   // (nullable)
    "top_skills": string[],                  // (nullable)
    "relevant_experience_months": number,    // (nullable) weighted by relevancy multiplier
    "education_level": string,               // (nullable)
    "education_course": string               // (nullable)
  }
}

# ================================================================
# OUTPUT CONTRACT — STRICT JSON ONLY
# Return exactly this object. Nothing before or after it.
# No markdown. No backticks. No explanation. No preamble.
# Any response that is not valid JSON will be rejected.
# ================================================================

OUTPUT FORMAT
{
  "headline": string,       // 1 sentence. Lead with the candidate's strongest signal.
  "summary": string,        // 2–3 sentences. Honest overall read of the match.
  "strengths": string[],    // 2–4 items. Specific. No generic praise.
  "concerns": string[],     // 1–3 items. Name real trade-offs plainly.
  "logistics_note": string, // 1 sentence. Location and work type fit.
  "data_quality_note": string | null, // null if profile complete. Flag missing data if f6 < 70.
  "recommendation": string  // EXACTLY one of: "Strong fit" | "Possible fit" | "Weak fit" | "Flag for review"
}

# ================================================================
# DIMENSION INTERPRETATION GUIDE
# Use these rules to translate scores into language.
# NEVER print score numbers in your output.
# ================================================================

HOW TO READ SCORES

f1 — Skill & role fit
  - Covers: skill overlap, preferred occupation match, past
    position title alignment, language match
  - High (80–100): candidate's background is a natural fit
  - Mid (50–79): overlap exists but some gaps or indirect match
  - Low (0–49): misaligned skills or career path divergence
  - confidence < 0.5: few skills listed; infer from work history only;
    flag as "limited skill data" in data_quality_note

f2 — Experience depth
  - Covers: total relevant months (weighted by position similarity)
  - Convert months to natural language: 12 = "about a year",
    18 = "a year and a half", 47 = "nearly 4 years"
  - A high f2 with low f1 = experienced but in the wrong area
  - confidence < 0.5: little or no work history available

f3 — Education
  - Covers: minimum education level via QPE rule
  - High = meets or exceeds requirement
  - Low = does not meet minimum; always surface this in concerns[]
  - confidence is always 1.0 (deterministic rule)

f4 — Logistics
  - Covers: preferred work location match (weighted 50%),
    work type match (30%), residential address proximity (15%),
    job seeking status (5%)
  - If work_type is "remote" or "hybrid": location sub-score is
    irrelevant — focus logistics_note on work type preference only
  - If job_seeking_status is "not_looking": ALWAYS include in
    concerns[], regardless of other scores
  - If job_seeking_status is "passive": note it as a soft concern

  - If job_seeking_status is "passive": note it as a soft concern

f7 — Education Relevance
  - Covers: alignment of the candidate's degree/course with the job requirements
  - High (80–100): perfectly aligned degree (e.g. BS IT for Software Engineer)
  - Mid (50–79): somewhat related or broadly applicable degree
  - Low (0–49): unrelated degree (e.g. BS Marine Biology for Web Developer)

f6 — Profile completeness
  - Covers: how many NSRP fields are populated
  - score >= 70: profile is sufficient; data_quality_note = null
  - score 40–69: partial profile; flag which areas are thin
  - score < 40: sparse profile; recommend completing before matching

# ================================================================
# TONE RULES — THE MOST IMPORTANT SECTION
# Read this carefully. These rules define the quality of output.
# ================================================================

TONE & LANGUAGE RULES

RULE 1 — Write like a recruiter, not a system.
  You are speaking to a colleague, not generating a report.
  Vary sentence structure. Use contractions where natural.
  Never start two consecutive sentences with "The candidate".

RULE 2 — Lead with what matters most.
  Find the highest-confidence, highest-scoring dimension and
  open the headline with that signal — not a generic intro.
  If f1 is the strongest signal, open with the skills story.
  If f2 is the standout, open with the experience angle.

RULE 3 — Use natural language for all numbers.
  GOOD: "nearly 4 years"         BAD: "47 months"
  GOOD: "salary runs about 15%   BAD: "expected salary of ₱22,000
         above the posted band"         exceeds max by 15.3%"
  GOOD: "based in Koronadal but  BAD: "preferred_work_location
         open to General Santos"        _local_2 = General Santos"

RULE 4 — Name trade-offs plainly. Do not soften everything.
  If a concern is real, say it clearly. Reviewers trust honest
  summaries over diplomatic ones. "Salary expectations may be
  a sticking point" is better than vague hedging.

RULE 5 — Acknowledge data gaps honestly.
  When confidence on a dimension is below 0.5, say so:
  GOOD: "We have limited work history to go on, but their
         stated skills suggest a reasonable fit."
  GOOD: "No preferred locations were listed, so logistics
         is assessed from their residential address only."

RULE 6 — NEVER invent information, but ALWAYS be specific about what IS there.
  Do not fabricate skills, locations, or degrees.
  If a field is null, either skip it or flag the gap without using boilerplate.
  DO NOT write generic filler like "there is limited information available about their skills."
  Instead write: "Their profile only lists basic data entry, leaving a gap for the required React skills."
  ALWAYS name specific skills (e.g., "They have 3 years of React..."), specific degrees (e.g., "Their BS in Nursing..."), and actual experience months.
  Treat null as "not known", never as "zero" or "no".

RULE 7 — Never print field names from the input JSON.
  The words "preferred_occupation_1", "f1_skill_fit",
  "job_seeking_status", "salary_expect_min" must never
  appear in your output. Translate everything to plain English.

RULE 8 — Match vocabulary to the job sector.
  A warehouse logistics role reads differently from a
  government administrative post or an IT role.
  Use the job title and description to calibrate vocabulary.

RULE 9 — Keep it tight.
  Total output must not exceed 400 tokens.
  Strengths and concerns are bullets, not essays.
  One idea per item in strengths[] and concerns[].

# ================================================================
# RECOMMENDATION DECISION GUIDE
# Use this mapping. Apply the MOST CRITICAL limiting factor.
# ================================================================

RECOMMENDATION LOGIC

"Strong fit"
  overall >= 75 AND f3 (education) is passing AND
  job_seeking_status != "not_looking"

"Possible fit"
  overall 50–74 OR (overall >= 75 but one dimension has
  confidence < 0.4, meaning the score is uncertain)

"Weak fit"
  overall < 50 OR f3 is failing (education requirement not met)

"Flag for review"
  job_seeking_status = "not_looking" regardless of scores, OR
  f6 (profile completeness) < 40 making scores unreliable, OR
  any dimension has score = null (missing critical data)

# ================================================================
# FINAL CRITICAL CONSTRAINTS — NON-NEGOTIABLE
# ================================================================

ABSOLUTE RULES

  1. Output ONLY the JSON object. Nothing before, nothing after.
  2. NEVER include numeric score values (0–100) in output.
  3. NEVER include input field names (snake_case) in output.
  4. NEVER fabricate data not present in the input.
  5. NEVER set recommendation = "Strong fit" if job_seeking_status
     is "not_looking" or f3 (education) is failing.
  6. ALWAYS flag job_seeking_status = "not_looking" in concerns[].
  7. ALWAYS set data_quality_note when f6_completeness < 70.
  8. If a dimension confidence is below 0.4, acknowledge uncertainty
     in the relevant section — never write as if the score is certain.
  257. Maximum 400 tokens total output. Be concise.
  11. If the candidate's work_history_titles include the exact job title being applied for, 
      prioritize this as definitive proof of competency. Do NOT describe the experience 
      as 'indirect' or 'inapplicable' in such cases.
`;

export interface MatchingInput {
  jobseeker_id: string;
  job_id: string;
  weights?: {
    f1_skill_match?: number;
    f2_experience_arc?: number;
    f3_education_qpe?: number;
    f4_logistics?: number;
    f5_salary?: number;
  };
}

export type MatchingErrorCode =
  | "DB_ERROR"
  | "LLM_ERROR"
  | "INVALID_RESPONSE"
  | "MISSING_DEPENDENCY"
  | "PERSISTENCE_ERROR";

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
    f4: weights.f4_logistics,
    f5: weights.f5_salary,
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeStringArray(value: unknown): string[] {
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
    .select("*, jobseeker_experience(*), jobseeker_education(*), jobseeker_trainings(*), jobseeker_licenses(*), jobseeker_languages(*), other_skills")
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

function buildUserMessage(job: JobRow, seeker: DeidentifiedSeeker, result: ScoringResult & { relevant_experience_months: number }) {
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
      f4_logistics:    { score: Math.round(result.f4.raw * 100), confidence: result.f4.confidence },
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
      relevant_experience_months: result.relevant_experience_months,
      education_level: seeker.education_level,
      education_course: seeker.education_course,
      work_history_titles: seeker.work_history.map(w => w.role_title).filter(Boolean)
    }
  };
  return JSON.stringify(payload, null, 2);
}

async function callNarrativeModelGroq(userMessage: string): Promise<Result<{ 
  headline: string;
  summary: string; 
  strengths: string[]; 
  concerns: string[]; 
  logistics_note: string;
  salary_note: string;
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
          summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
          strengths: safeStringArray(parsed.strengths),
          concerns: safeStringArray(parsed.concerns),
          logistics_note: typeof parsed.logistics_note === "string" ? parsed.logistics_note : "",
          data_quality_note: typeof parsed.data_quality_note === "string" ? parsed.data_quality_note : null,
          recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "Flag for review",
          model: "llama-3.3-70b-versatile"
        },
      };
    } catch (error: any) {
      attempt++;
      console.warn(`[Groq Attempt ${attempt} Failed with key ...${currentKey.slice(-4)}]`, error.message);
      
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
        summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
        strengths: safeStringArray(parsed.strengths),
        concerns: safeStringArray(parsed.concerns),
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
        summary: typeof parsed.summary === "string" ? parsed.summary : "Candidate evaluation completed.",
        strengths: safeStringArray(parsed.strengths),
        concerns: safeStringArray(parsed.concerns),
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

export async function callNarrativeModel(job: JobRow, seeker: DeidentifiedSeeker, result: ScoringResult & { relevant_experience_months: number }): Promise<Result<{ 
  headline: string;
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

  const userMessage = buildUserMessage(job, seeker, result);
  
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

  const scoringResult = computeUtilityScore(seeker, vacancy, overrides);
  console.log(`[Matching Pipeline] Stage 3 Complete. Utility Score: ${scoringResult.utility_score}, Grade: ${scoringResult.grade}`);

  // STAGE 4: LLM NARRATIVE GENERATION
  const narrativeResult = await callNarrativeModel(job, seeker, scoringResult);
  
  let finalNarrative = {
    headline: "",
    summary: "",
    strengths: [] as string[],
    concerns: [] as string[],
    logistics_note: "",
    salary_note: "",
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
      f4: scoringResult.f4,
      f5: scoringResult.f5,
      f6: scoringResult.f6_completeness,
      // Metadata/AI results
      f1_raw: scoringResult.f1.raw,
      f2_raw: scoringResult.f2.raw,
      f3_raw: scoringResult.f3.raw,
      f4_raw: scoringResult.f4.raw,
      f5_raw: scoringResult.f5.raw,
      f6_raw: scoringResult.f6_completeness.raw,
      headline: finalNarrative.headline,
      logistics_note: finalNarrative.logistics_note,
      salary_note: finalNarrative.salary_note,
      data_quality_note: finalNarrative.data_quality_note,
      recommendation: finalNarrative.recommendation
    },
    summary: finalNarrative.summary,
    ai_summary: finalNarrative.summary,
    strengths: finalNarrative.strengths,
    gaps: finalNarrative.concerns, // Save concerns into gaps for backwards compatibility
    bias_flags: scoringResult.constraint_violations,
    constraint_violations: scoringResult.constraint_violations,
    computed_at: new Date().toISOString(),
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
