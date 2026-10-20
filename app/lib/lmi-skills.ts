// Skills demand/supply aggregation for the LMI report (SO5: top required skills
// and skills-gap view). Pure and dependency-free so it can be unit tested.
//
// Demand counts job postings that list a skill (jobs.main_skill_desired);
// supply counts jobseeker profiles that list it (jobseekers.other_skills).
// Each skill is counted at most once per posting or profile, and matched
// case-insensitively. Descriptive counts only: no forecasting.

export interface SkillCount {
  skill: string;
  count: number;
}

export interface SkillGap {
  skill: string;
  demand: number;
  supply: number;
  gap: number;
}

export interface SkillsSummary {
  /** Most-demanded skills, each with how many jobseeker profiles offer it. */
  topRequired: SkillGap[];
  topSupplied: SkillCount[];
  gaps: SkillGap[];
}

/** Splits a skills value (comma-separated text, string array, or {name|skill} objects). */
export function parseSkillTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          const name = record.name ?? record.skill;
          return typeof name === "string" ? [name] : [];
        }
        return [];
      })
      .map((token) => token.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  }
  return [];
}

function countDistinctPerRow(values: unknown[]): Map<string, SkillCount> {
  const counts = new Map<string, SkillCount>();
  for (const value of values) {
    const seen = new Set<string>();
    for (const token of parseSkillTokens(value)) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { skill: token, count: 1 });
    }
  }
  return counts;
}

const byCountThenName = (a: SkillCount, b: SkillCount) =>
  b.count - a.count || a.skill.localeCompare(b.skill);

export function summarizeSkills(
  jobSkillValues: unknown[],
  jobseekerSkillValues: unknown[],
  limit = 10
): SkillsSummary {
  const demand = countDistinctPerRow(jobSkillValues);
  const supply = countDistinctPerRow(jobseekerSkillValues);

  const demandVsSupply: SkillGap[] = Array.from(demand.entries()).map(([key, required]) => {
    const supplied = supply.get(key)?.count ?? 0;
    return { skill: required.skill, demand: required.count, supply: supplied, gap: required.count - supplied };
  });

  const gaps = demandVsSupply
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand || a.skill.localeCompare(b.skill))
    .slice(0, limit);

  return {
    topRequired: [...demandVsSupply]
      .sort((a, b) => b.demand - a.demand || a.skill.localeCompare(b.skill))
      .slice(0, limit),
    topSupplied: Array.from(supply.values()).sort(byCountThenName).slice(0, limit),
    gaps,
  };
}
