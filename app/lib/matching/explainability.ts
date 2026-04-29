/**
 * explainability.ts
 * Structured Explainability Engine for Recruiter Insights
 */

export interface MatchExplanation {
  match_score: number;
  why_matched: string[];
  skill_matches: string[];
  experience_matches: string[];
  gaps: string[];
  recommendation: string;
}

export class ExplainabilityEngine {
  /**
   * Generates a structured explanation of the match.
   * No free text allowed, only categorized insights.
   */
  public generateExplanation(score: number, breakdown: any, job: any, seeker: any): MatchExplanation {
    const why_matched: string[] = [];
    const skill_matches: string[] = [];
    const experience_matches: string[] = [];
    const gaps: string[] = [];

    // Logic based on score thresholds and breakdown
    if (breakdown.skills > 0.8) {
      why_matched.push('Strong technical skill alignment');
      skill_matches.push(...(job.skills || []).slice(0, 3));
    } else if (breakdown.skills < 0.4) {
      gaps.push('Technical skill mismatch');
    }

    if (breakdown.experience > 0.7) {
      why_matched.push('Deep relevant industry experience');
      experience_matches.push(seeker.experience?.[0]?.position_title || 'Past relevant role');
    }

    if (score > 80) {
      why_matched.push('High overall suitability for the role');
    }

    const recommendation = this.getRecommendation(score);

    return {
      match_score: score,
      why_matched,
      skill_matches,
      experience_matches,
      gaps,
      recommendation
    };
  }

  private getRecommendation(score: number): string {
    if (score >= 85) return 'Strong Fit - Proceed to Interview';
    if (score >= 70) return 'Possible Fit - Further Screening Required';
    if (score >= 50) return 'Weak Fit - Keep in Talent Pool';
    return 'Not a Match';
  }
}

export const explainabilityEngine = new ExplainabilityEngine();
