import { buildVacancyPayload, type VacancyPayload } from "./scoring-engine";

/** Live `jobs` columns used for matching (plus the joined employer's location). */
export interface JobRowForMatching {
  id: string;
  position_title?: string | null;
  description?: string | null;
  main_skill_desired?: string | null;
  years_of_experience_required?: number | string | null;
  minimum_education_required?: string | null;
  location?: string | null;
  work_setup?: string | null;
  work_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  employers?: { city?: string | null; province?: string | null; industry?: string | null } | null;
}

/**
 * Builds the scoring VacancyPayload from the live jobs schema. Required skills
 * come from main_skill_desired (comma/semicolon separated); experience is in
 * whole years. Only job-relevant factors are used (no demographics).
 */
export function vacancyFromJob(job: JobRowForMatching): VacancyPayload {
  const years = Number(job.years_of_experience_required) || 0;
  const skills = String(job.main_skill_desired ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return buildVacancyPayload({
    id: job.id,
    title: job.position_title ?? undefined,
    requiredSkills: skills.map((name) => ({ name, years_min: years, is_required: true })),
    preferredSkills: [],
    experienceMin: years,
    experienceMax: years + 3,
    educationRequired: job.minimum_education_required ?? "no_formal",
    educationFieldPreferred: job.employers?.industry ?? null,
    city: job.employers?.city ?? job.location ?? null,
    province: job.employers?.province ?? null,
    workSetup: job.work_setup ?? "onsite",
    workType: job.work_type ?? "full-time",
    description: job.description ?? "",
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
  });
}
