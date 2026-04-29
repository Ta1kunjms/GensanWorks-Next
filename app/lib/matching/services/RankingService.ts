import { MatchingService } from "./MatchingService";
import { supabaseAdmin } from "@/lib/supabase";

export interface HybridScoreResult {
  jobseeker_id: string;
  final_score: number;
  components: {
    structured: number; // 60%
    semantic: number;   // 30%
    behavioral: number; // 10%
  };
}

export class RankingService {
  /**
   * Computes the Hybrid AI score for a candidate against a job.
   */
  static async computeHybridScore(
    jobId: string,
    jobseekerId: string,
    vectorSimilarity: number = 0.5
  ): Promise<HybridScoreResult> {
    
    // 1. Structured Rule Score (60%)
    // This calls the existing deterministic engine
    const { utility_score: structuredScore } = await MatchingService.calculateBaseScore(jobId, jobseekerId);

    // 2. Behavioral Score (10%)
    // Fetches historical feedback signals
    const { data: signals } = await supabaseAdmin
      .from("hiring_feedback_signals")
      .select("weight_modifier")
      .eq("job_id", jobId)
      .eq("jobseeker_id", jobseekerId);

    const behavioralScore = signals?.length 
      ? Math.min(100, signals.reduce((acc, s) => acc + (s.weight_modifier * 10), 50)) 
      : 50; // Baseline behavior score

    // 3. Combine using the 60/30/10 Formula
    // Semantic score is normalized vector similarity * 100
    const semanticScore = vectorSimilarity * 100;

    const final_score = 
      (structuredScore * 0.6) + 
      (semanticScore * 0.3) + 
      (behavioralScore * 0.1);

    return {
      jobseeker_id: jobseekerId,
      final_score: Math.round(final_score * 100) / 100,
      components: {
        structured: structuredScore,
        semantic: semanticScore,
        behavioral: behavioralScore
      }
    };
  }

  /**
   * Bulk ranks candidates for a job using the hybrid engine.
   */
  static async rankCandidates(jobId: string, limit: number = 50): Promise<HybridScoreResult[]> {
    // Stage 1: Fast Retrieval via Vector Similarity (Top 100)
    const { data: vectorMatches, error: vError } = await supabaseAdmin.rpc("match_jobseekers_to_job", {
      job_id: jobId,
      match_count: 100
    });

    if (vError || !vectorMatches) {
      console.error("Vector search failed:", vError);
      return [];
    }

    // Stage 2: Heavy Ranking (Top K)
    // We process the top vector matches and compute the hybrid score
    const results = await Promise.all(
      vectorMatches.map((vm: any) => 
        this.computeHybridScore(jobId, vm.id || vm.nsrp_id, vm.similarity)
      )
    );

    return results
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit);
  }
}
