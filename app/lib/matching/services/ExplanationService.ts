import { supabaseAdmin } from "@/lib/supabase";
import { callNarrativeModel, deidentifyJobseeker } from "../agent";
import { normalizeSkill, jaroWinklerSimilarity } from "../skill-normalizer";

export class ExplanationService {
  /**
   * Generates a recruiter narrative summary on-demand.
   * This is called only when the UI requests a detailed view.
   */
  static async generateNarrative(jobId: string, jobseekerId: string) {
    // 1. Fetch pre-computed scores and full data
    const { data: scoreData } = await supabaseAdmin
      .from("job_match_scores")
      .select("*")
      .eq("job_id", jobId)
      .eq("jobseeker_id", jobseekerId)
      .single();

    if (!scoreData) throw new Error("Match score not found. Rank the candidate first.");

    // Fetch full metadata for the LLM context
    const { data: job } = await supabaseAdmin.from("jobs").select("*, employers(*)").eq("id", jobId).single();
    const { data: rawSeeker } = await supabaseAdmin.from("jobseekers").select("*, jobseeker_experience(*), jobseeker_education(*), jobseeker_trainings(*), jobseeker_licenses(*), jobseeker_languages(*), other_skills").eq("id", jobseekerId).single();

    if (!job || !rawSeeker) throw new Error("Missing job or candidate metadata.");

    // 2. Call the hardened AI Narrative logic (with Groq rotation + Cloudflare + Ollama fallbacks)
    const seeker = deidentifyJobseeker(rawSeeker as any);
    
    // Ensure scores are in the format expected by agent.ts
    // Use a robust default to prevent "undefined reading raw" errors
    const d = scoreData.dimension_scores || {};
    const result = {
      f1: d.f1 || { raw: 0, confidence: 0 },
      f2: d.f2 || { raw: 0, confidence: 0 },
      f3: d.f3 || { raw: 0, confidence: 0 },
      f6_completeness: d.f6_completeness || { raw: 0, confidence: 0 },
      f7: d.f7 || { raw: 0, confidence: 0 },
      utility_score: scoreData.utility_score || 0,
      total_experience_months: seeker.work_history.reduce((sum, w) => sum + (w.months || 0), 0),
      relevant_experience_months: (() => {
        const jobTitle = (job as any)?.position_title || "";
        const jobNorm = normalizeSkill(jobTitle);
        let relevant = 0;
        for (const w of seeker.work_history) {
          const months = w.months || 0;
          const titleNorm = normalizeSkill(w.role_title || "");
          const sim = jaroWinklerSimilarity(jobNorm, titleNorm);
          const directMatch = (w.role_title || "").toLowerCase().includes(jobTitle.toLowerCase()) ||
            jobTitle.toLowerCase().includes((w.role_title || "").toLowerCase());
          if (directMatch || sim >= 0.40) relevant += months;
        }
        return relevant;
      })(), 
    };

    const outcome = await callNarrativeModel(job as any, seeker, result as any);

    if (!outcome.ok) throw new Error(outcome.error.message);

    const narrative = outcome.value;

    // 3. Persist the narrative back to the match score record
    await supabaseAdmin
      .from("job_match_scores")
      .update({ 
        ai_summary: narrative.summary,
        summary: narrative.summary,
        strengths: narrative.strengths,
        gaps: narrative.concerns
      })
      .eq("job_id", jobId)
      .eq("jobseeker_id", jobseekerId);

    return narrative;
  }
}
