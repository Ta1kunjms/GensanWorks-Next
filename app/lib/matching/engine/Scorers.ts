export interface ScoreOutput {
  normalized: number; // Strictly 0-1.0
  evidence: string;
}

export class Scorers {
  /**
   * Rule-Based Scorer (Pure)
   * 60% of Final Score
   */
  static computeRuleScore(job: any, seeker: any): ScoreOutput {
    // 1. SKILL OVERLAP
    const reqSkills = (job.main_skill_desired || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    
    // Collect skills from both checkboxes and the free-text "specify" box
    const checkboxSkills = (seeker.other_skills || [])
      .map((s: any) => (typeof s === 'string' ? s : s?.name || "")?.toLowerCase())
      .filter(Boolean);
    
    const specifySkills = (seeker.other_skills_others || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    const seekerSkills = [...new Set([...checkboxSkills, ...specifySkills])];
    
    // Fuzzy match: check if req skill is contained in any seeker skill or vice versa
    const overlap = reqSkills.filter(req => 
      seekerSkills.some(s => s.includes(req) || req.includes(s))
    ).length;
    
    const skillRatio = reqSkills.length > 0 ? overlap / reqSkills.length : 0;

    // 2. EXPERIENCE GAP
    const requiredYears = Number(job.years_of_experience_required) || 0;
    const requiredMonths = requiredYears * 12;
    
    const totalMonths = (seeker.jobseeker_experience || []).reduce((acc: number, exp: any) => {
      const months = Number(exp.number_of_months) || 0;
      return acc + months;
    }, 0);

    const expRatio = requiredMonths > 0 ? Math.min(1, totalMonths / requiredMonths) : 1.0;

    // Combined Rule Score (50% Skills, 50% Exp)
    const finalRuleScore = (skillRatio * 0.5) + (expRatio * 0.5);

    return {
      normalized: Math.min(1, finalRuleScore),
      evidence: `Matched ${overlap}/${reqSkills.length} skills. Has ${totalMonths} months of experience vs ${requiredMonths} required.`
    };
  }

  /**
   * Semantic Scorer (Pure)
   * 30% of Final Score
   */
  static computeSemanticScore(similarity: number): ScoreOutput {
    const clamped = Math.max(0, Math.min(1, similarity));
    return {
      normalized: clamped,
      evidence: `Semantic alignment: ${Math.round(clamped * 100)}%`
    };
  }

  /**
   * Behavioral Scorer (Pure)
   * 10% of Final Score
   */
  static computeBehavioralScore(signals: any[]): ScoreOutput {
    const score = signals.length > 0 ? 0.8 : 0.5;
    return {
      normalized: score,
      evidence: signals.length > 0 ? `Positive signal history detected.` : `Neutral baseline.`
    };
  }
}
