import { supabaseAdmin } from "@/lib/supabase";

/**
 * Structured Embedding Format:
 * ROLE / SKILLS / EXPERIENCE / INDUSTRY / PROJECTS
 */
export class EmbeddingService {
  /**
   * Generates a structured string from a jobseeker profile for high-precision embedding.
   */
  static buildJobseekerSearchString(seeker: any): string {
    const roles = [
      seeker.preferred_occupation_1,
      seeker.preferred_occupation_2,
      seeker.preferred_occupation_3,
    ].filter(Boolean).join(", ");

    const skills = seeker.other_skills?.map((s: any) => s.name).join(", ") || "";
    const experience = seeker.jobseeker_experience?.map((e: any) => `${e.position} at ${e.company_name}`).join("; ") || "";
    
    return `ROLE: ${roles} | SKILLS: ${skills} | EXPERIENCE: ${experience} | EDUCATION: ${seeker.education_level || ""}`.trim();
  }

  /**
   * Generates a structured string from a job vacancy.
   */
  static buildJobSearchString(job: any): string {
    return `ROLE: ${job.position_title} | SKILLS: ${job.main_skill_desired} | INDUSTRY: ${job.employers?.industry || ""} | EDUCATION: ${job.minimum_education_required}`.trim();
  }

  /**
   * Calls the embedding model (e.g., Gemini or OpenAI).
   * Note: This assumes a 768-dim model as per migration phase5b.
   */
  static async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // Example using local Ollama or a configured provider
      // In production, this would call process.env.EMBEDDING_PROVIDER_URL
      const response = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error("Embedding generation error:", error);
      return null;
    }
  }

  /**
   * Updates the embedding for a jobseeker in the database.
   */
  static async updateJobseekerEmbedding(jobseekerId: string): Promise<boolean> {
    const { data: seeker } = await supabaseAdmin
      .from("jobseekers")
      .select("*, jobseeker_experience(*)")
      .eq("id", jobseekerId)
      .single();

    if (!seeker) return false;

    const searchString = this.buildJobseekerSearchString(seeker);
    const embedding = await this.generateEmbedding(searchString);

    if (!embedding) return false;

    const { error } = await supabaseAdmin
      .from("jobseekers")
      .update({ profile_embedding: embedding } as any)
      .eq("id", jobseekerId);

    return !error;
  }
}
