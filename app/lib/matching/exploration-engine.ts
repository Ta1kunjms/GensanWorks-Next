/**
 * exploration-engine.ts
 * Exploration vs Exploitation System (Multi-Armed Bandit Logic)
 */

export class ExplorationEngine {
  /**
   * Injects an exploration factor into the final ranking to discover "hidden gems"
   * and ensure diversity in the recommendation set.
   * 
   * final_score = (0.9 * predicted_score) + (0.1 * exploration_score)
   */
  public injectExplorationFactor(candidate: any, predictedScore: number): number {
    const explorationWeight = 0.1;
    const exploitWeight = 1 - explorationWeight;

    const explorationScore = this.calculateExplorationPotential(candidate);
    
    return (exploitWeight * predictedScore) + (explorationWeight * explorationScore);
  }

  /**
   * Scores a candidate based on "uniqueness" or "underexposure".
   */
  private calculateExplorationPotential(candidate: any): number {
    let score = 0.5; // Baseline

    // 1. Underexposed candidates (those with few views/clicks)
    const viewCount = candidate.metadata?.view_count || 0;
    if (viewCount < 5) score += 0.2;

    // 2. Skill Diversity (candidates with rare but relevant skill combinations)
    const skills = candidate.seeker?.skills || [];
    if (skills.length > 2 && skills.length < 8) score += 0.1;

    // 3. New Profiles
    const isNew = candidate.seeker?.created_at && 
      (new Date().getTime() - new Date(candidate.seeker.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
    if (isNew) score += 0.2;

    return Math.min(1.0, score);
  }
}

export const explorationEngine = new ExplorationEngine();
