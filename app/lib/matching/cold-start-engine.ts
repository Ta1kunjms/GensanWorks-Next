/**
 * cold-start-engine.ts
 * Intelligence for New Jobs and Candidates (Priors)
 */

export class ColdStartEngine {
  /**
   * Applies industry-standard priors when historical feedback is missing.
   */
  public applyColdStartPriors(job: any, seeker: any, baseScore: number): number {
    let score = baseScore;

    // If job is new (no clicks yet), use industry baseline weights
    const isNewJob = !job.metadata?.view_count || job.metadata.view_count < 10;
    if (isNewJob) {
      score = this.adjustByIndustryPrior(job.industry, score);
    }

    // If candidate is new, apply a 'novelty' boost to encourage initial discovery
    const isNewSeeker = seeker.metadata?.is_new;
    if (isNewSeeker) {
      score += 0.05;
    }

    return Math.min(1.0, score);
  }

  private adjustByIndustryPrior(industry: string, score: number): number {
    // In production, this would look up weights in a static `industry_priors` map
    return score;
  }
}

export const coldStartEngine = new ColdStartEngine();
