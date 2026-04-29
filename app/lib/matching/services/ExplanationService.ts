import { supabaseAdmin } from "@/lib/supabase";
import { callNarrativeModel, deidentifyJobseeker } from "../agent";

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
    const { data: rawSeeker } = await supabaseAdmin.from("jobseekers").select("*, other_skills").eq("id", jobseekerId).single();

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
      f4: d.f4 || { raw: 0, confidence: 0 },
      f5: d.f5 || { raw: 0, confidence: 0 },
      f6_completeness: d.f6_completeness || { raw: 0, confidence: 0 },
      utility_score: scoreData.utility_score || 0,
      relevant_experience_months: 0 
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
