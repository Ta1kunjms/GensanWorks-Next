/**
 * calibration-engine.ts
 * Score Normalization and Calibration
 */

export interface CalibratedCandidate {
  id: string;
  original_score: number;
  calibrated_score: number;
  rank: number;
  confidence: number;
}

export class CalibrationEngine {
  /**
   * Normalizes scores per job posting using Z-score and Percentile mapping.
   */
  public normalizeJobScores(candidates: any[]): CalibratedCandidate[] {
    if (candidates.length === 0) return [];

    const scores = candidates.map(c => c.utility_score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(scores.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / scores.length) || 1;

    return candidates
      .sort((a, b) => b.utility_score - a.utility_score)
      .map((c, index) => {
        const zScore = (c.utility_score - mean) / stdDev;
        // Sigmoid mapping for a 0-1 calibrated score
        const calibrated = 1 / (1 + Math.exp(-zScore));

        return {
          id: c.id,
          original_score: c.utility_score,
          calibrated_score: Math.round(calibrated * 100) / 100,
          rank: index + 1,
          confidence: this.calculateConfidence(c, zScore)
        };
      });
  }

  private calculateConfidence(candidate: any, zScore: number): number {
    // Confidence is higher if the candidate is an outlier (high Z-score) 
    // or if the profile is highly complete
    const completeness = candidate.seeker?.raw_field_count ? Math.min(1.0, candidate.seeker.raw_field_count / 20) : 0.5;
    return Math.min(1.0, (0.7 * completeness) + (0.3 * Math.abs(zScore) / 3));
  }
}

export const calibrationEngine = new CalibrationEngine();
