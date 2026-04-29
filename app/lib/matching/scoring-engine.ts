/**
 * scoring-engine.ts
 * LIGHTWEIGHT ONLINE VERSION
 * No LLM, No Reranker, No Drift logic.
 */

export class ScoringEngine {
  /**
   * Fast runtime scoring using precomputed features.
   * Target Latency: <10ms per candidate.
   */
  public calculateOnlineScore(features: any): number {
    const weights = {
      skills: 0.5,
      experience: 0.3,
      ontology: 0.2
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
