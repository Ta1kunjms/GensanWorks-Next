import taxonomyData from '../../../data/skills-taxonomy.json';

export interface TaxonomySkill {
  canonical: string;
  aliases: string[];
  esco_uri: string | null;
  tesda_nc_level: string | null;
  category: string;
}

export interface TaxonomyGroup {
  group: string;
  label: string;
  vague_triggers: string[];
  skills: TaxonomySkill[];
}

export interface ExpansionResult {
  original: string;
  expanded: string[];
  wasVague: boolean;
  scoreMultiplier: number;
  group: string | null;
  esco_uri: string | null;
  tesda_nc_level: string | null;
}

export const VAGUE_SKILL_PENALTY = 0.70;

interface RawTaxonomy {
  taxonomy: TaxonomyGroup[];
}

export class SkillTaxonomyMapper {
  private groups: TaxonomyGroup[];

  private canonicalIndex: Map<string, { skill: TaxonomySkill; group: TaxonomyGroup }> = new Map();
  private aliasIndex: Map<string, string> = new Map();
  private vagueIndex: Map<string, TaxonomyGroup> = new Map();
  private allCanonicals: Set<string> = new Set();

  constructor(customTaxonomy?: TaxonomyGroup[]) {
    const raw = taxonomyData as unknown as RawTaxonomy;
    this.groups = customTaxonomy ?? raw.taxonomy;
    this.buildIndexes();
  }

  private normalize(term: string): string {
    return term
      .toLowerCase()
      .replace(/[^a-z0-9\s\-\.#\+\/]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildIndexes(): void {
    for (const group of this.groups) {
      for (const trigger of group.vague_triggers) {
        this.vagueIndex.set(this.normalize(trigger), group);
      }

      for (const skill of group.skills) {
        this.allCanonicals.add(skill.canonical);
        this.canonicalIndex.set(skill.canonical, { skill, group });
        this.aliasIndex.set(this.normalize(skill.canonical), skill.canonical);

        for (const alias of skill.aliases) {
          this.aliasIndex.set(this.normalize(alias), skill.canonical);
        }
      }
    }
  }

  resolve(skillTerm: string): string | null {
    const normalized = this.normalize(skillTerm);
    return this.aliasIndex.get(normalized) ?? null;
  }

  isVagueSkill(skillTerm: string): boolean {
    const normalized = this.normalize(skillTerm);
    return (
      this.vagueIndex.has(normalized) &&
      !this.aliasIndex.has(normalized)
    );
  }

  expandSkill(skillTerm: string): ExpansionResult {
    const normalized = this.normalize(skillTerm);

    const canonical = this.aliasIndex.get(normalized);
    if (canonical) {
      const entry = this.canonicalIndex.get(canonical);
      return {
        original: skillTerm,
        expanded: [canonical],
        wasVague: false,
        scoreMultiplier: 1.0,
        group: entry?.group.group ?? null,
        esco_uri: entry?.skill.esco_uri ?? null,
        tesda_nc_level: entry?.skill.tesda_nc_level ?? null,
      };
    }

    const vagueGroup = this.vagueIndex.get(normalized);
    if (vagueGroup) {
      return {
        original: skillTerm,
        expanded: vagueGroup.skills.map(s => s.canonical),
        wasVague: true,
        scoreMultiplier: VAGUE_SKILL_PENALTY,
        group: vagueGroup.group,
        esco_uri: null,
        tesda_nc_level: null,
      };
    }

    return {
      original: skillTerm,
      expanded: [skillTerm],
      wasVague: false,
      scoreMultiplier: 1.0,
      group: null,
      esco_uri: null,
      tesda_nc_level: null,
    };
  }

  expandAllSkills(skills: string[]): {
    expandedSkills: string[];
    hasVagueSkills: boolean;
    minMultiplier: number;
    details: ExpansionResult[];
  } {
    const details = skills.map(s => this.expandSkill(s));
    const allExpanded = new Set<string>();

    for (const result of details) {
      for (const skill of result.expanded) {
        allExpanded.add(skill);
      }
    }

    const hasVagueSkills = details.some(d => d.wasVague);
    const minMultiplier = details.reduce(
      (min, d) => Math.min(min, d.scoreMultiplier),
      1.0,
    );

    return {
      expandedSkills: Array.from(allExpanded),
      hasVagueSkills,
      minMultiplier,
      details,
    };
  }

  suggestSpecificSkills(vagueInput: string, maxSuggestions = 8): string[] {
    const result = this.expandSkill(vagueInput);
    if (!result.wasVague) return [];
    return result.expanded.slice(0, maxSuggestions);
  }

  getStandardsInfo(skillTerm: string): {
    esco_uri: string | null;
    tesda_nc_level: string | null;
    canonical: string | null;
  } {
    const canonical = this.resolve(skillTerm);
    if (!canonical) return { esco_uri: null, tesda_nc_level: null, canonical: null };

    const entry = this.canonicalIndex.get(canonical);
    return {
      esco_uri: entry?.skill.esco_uri ?? null,
      tesda_nc_level: entry?.skill.tesda_nc_level ?? null,
      canonical,
    };
  }

  getRelatedSkills(skillTerm: string): string[] {
    const canonical = this.resolve(skillTerm);
    if (!canonical) return [];

    const entry = this.canonicalIndex.get(canonical);
    if (!entry) return [];

    return entry.group.skills
      .map(s => s.canonical)
      .filter(c => c !== canonical);
  }

  getTesdaRecommendations(skills: string[]): Array<{
    skill: string;
    nc_level: string;
    canonical: string;
  }> {
    const results: Array<{ skill: string; nc_level: string; canonical: string }> = [];

    for (const skill of skills) {
      const canonical = this.resolve(skill) ?? skill;
      const entry = this.canonicalIndex.get(canonical);

      if (entry?.skill.tesda_nc_level) {
        results.push({
          skill,
          nc_level: entry.skill.tesda_nc_level,
          canonical,
        });
      }
    }

    return results;
  }

  get totalGroups(): number { return this.groups.length; }
  get totalSkills(): number { return this.allCanonicals.size; }
  get totalAliases(): number { return this.aliasIndex.size; }
}

export const skillMapper = new SkillTaxonomyMapper();
