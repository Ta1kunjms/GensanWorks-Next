import { getLogisticsZone, normalizeField, normalizeSchool } from "./skill-normalizer";

export const BLINDED_FIELDS: (keyof RawJobseeker)[] = [
  "gender",
  "religion",
  "civil_status",
  "birth_date",
  "tin",
  "disability_visual",
  "disability_speech",
  "disability_mental",
  "disability_hearing",
  "disability_physical",
  "disability_others",
  "is_pwd",
  "is_ofw",
  "ofw_country",
  "is_former_ofw",
  "former_ofw_country",
  "is_four_ps",
  "household_id_no",
  "first_name",
  "last_name",
  "middle_name",
  "suffix",
  "email",
  "phone",
  "house_number",
  "barangay"
];

export type RawJobseeker = Record<string, unknown> & {
  id?: string;
  nsrp_id?: string | null;
  job_seeking_status?: string | null;
  preferred_salary?: number | null;
  city_municipality?: string | null;
  city?: string | null;
  province?: string | null;
  work_setup_preference?: string | null;
  expected_salary_min?: number | null;
  expected_salary_max?: number | null;
  jobseeker_experience?: Array<{ number_of_months?: number | string | null; [key: string]: unknown }>;
  jobseeker_education?: Array<{ level?: string | null; school_name?: string | null; course?: string | null; [key: string]: unknown }>;
  jobseeker_trainings?: Array<{ skills_acquired?: string | null; certificates_received?: string | null; [key: string]: unknown }>;
  jobseeker_licenses?: Array<{ professional_license?: string | null; [key: string]: unknown }>;
  other_skills?: Array<{ skill?: string | null; name?: string | null; proficiency_level?: string | null; years?: number | null; years_min?: number | null; [key: string]: unknown }>;
  preferred_occupation_1?: string | null;
  preferred_occupation_2?: string | null;
  preferred_occupation_3?: string | null;
  preference_full_time?: boolean | null;
  preference_part_time?: boolean | null;
  preferred_work_location_local_1?: string | null;
  preferred_work_location_local_2?: string | null;
  preferred_work_location_local_3?: string | null;
  preferred_work_location_overseas_1?: string | null;
  preferred_work_location_overseas_2?: string | null;
  preferred_work_location_overseas_3?: string | null;
  jobseeker_languages?: Array<{ language?: string | null; [key: string]: unknown }>;
};

export type DeidentifiedSeeker = {
  id?: string;
  skills: Array<{ name: string; proficiency_level: string; years?: number; years_min?: number }>;
  experience_years: number;
  work_history: Array<{ role_title: string | null; industry: string | null; duration_months: number; key_responsibilities_summary: string }>;
  education_level: string;
  school_category: string;
  education_field: string;
  certifications: string[];
  logistics_zone: string;
  work_setup_preference: string;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  preferred_occupations: string[];
  preferred_locations: string[];
  work_type_preference: string;
  job_seeking_status: string;
  languages: string[];
  raw_field_count: number;
};

export function deidentifyJobseeker(raw: RawJobseeker, _job?: unknown): DeidentifiedSeeker {
  const expArray = raw.jobseeker_experience ?? [];
  const eduArray = raw.jobseeker_education ?? [];
  const trainArray = raw.jobseeker_trainings ?? [];
  const licArray = raw.jobseeker_licenses ?? [];

  const totalExpMonths = expArray.reduce((acc, exp) => acc + (Number(exp.number_of_months) || 0), 0);

  const skills = [
    ...(raw.other_skills ?? [])
      .map((skill) => {
        const name = typeof skill.name === "string" ? skill.name : typeof skill.skill === "string" ? skill.skill : "";
        if (!name) return null;
        return {
          name,
          proficiency_level: skill.proficiency_level ?? "Intermediate",
          years: typeof skill.years === "number" ? skill.years : undefined,
          years_min: typeof skill.years_min === "number" ? skill.years_min : undefined
        };
      })
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill)),
    ...trainArray
      .filter((training) => Boolean(training.skills_acquired))
      .map((training) => ({
        name: String(training.skills_acquired),
        proficiency_level: "Intermediate"
      })),
    // Support comma-separated strings in other_skills_others
    ...(typeof raw.other_skills_others === 'string' 
      ? raw.other_skills_others.split(',').map(s => ({ name: s.trim(), proficiency_level: "Intermediate" }))
      : [])
  ];

  const preferred_occupations = [raw.preferred_occupation_1, raw.preferred_occupation_2, raw.preferred_occupation_3]
    .filter((value): value is string => Boolean(value));
  
  const preferred_locations = [raw.preferred_work_location_local_1, raw.preferred_work_location_local_2, raw.preferred_work_location_local_3, raw.preferred_work_location_overseas_1, raw.preferred_work_location_overseas_2, raw.preferred_work_location_overseas_3]
    .filter((value): value is string => Boolean(value));

  let work_type_preference = "either";
  if (raw.preference_full_time && !raw.preference_part_time) work_type_preference = "full-time";
  if (!raw.preference_full_time && raw.preference_part_time) work_type_preference = "part-time";

  const languages = (raw.jobseeker_languages ?? [])
    .map(lang => lang.language)
    .filter((value): value is string => Boolean(value));

  // Count non-null basic profile fields for f6 completeness
  const raw_field_count = Object.keys(raw).filter(k => {
    const val = raw[k];
    if (Array.isArray(val)) return val.length > 0;
    return val !== null && val !== undefined && val !== "";
  }).length;

  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    skills,
    experience_years: Number((totalExpMonths / 12).toFixed(1)),
    work_history: expArray.map((exp: any) => {
      // Exhaustive check for months/duration
      let months = Number(exp.number_of_months || exp.duration_months || exp.months || 0);
      
      // Exhaustive check for dates
      const startKey = ["start_date", "date_start", "from_date", "work_from", "started_at"].find(k => exp[k]);
      const endKey = ["end_date", "date_end", "to_date", "work_to", "ended_at"].find(k => exp[k]);
      
      if (months === 0 && startKey) {
        const start = new Date(exp[startKey]);
        const end = exp[endKey] ? new Date(exp[endKey]) : new Date();
        months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      }

      return {
        role_title: exp.position || exp.job_title || exp.role || exp.designation || null,
        company: exp.company_name || exp.establishment_name || exp.employer_name || null,
        months: Math.max(0, months),
        description: exp.responsibilities || exp.job_description || exp.tasks || ""
      };
    }),
    education_level: eduArray[0]?.level || eduArray[0]?.education_level || eduArray[0]?.attainment || "No data",
    education_course: eduArray[0]?.course || eduArray[0]?.degree || eduArray[0]?.major || eduArray[0]?.specialization || null,
    certifications: [
      ...licArray.map((license) => license.professional_license).filter((value): value is string => Boolean(value)),
      ...trainArray.map((training) => training.certificates_received).filter((value): value is string => Boolean(value))
    ],
    logistics_zone: getLogisticsZone(typeof raw.city === "string" ? raw.city : null, typeof raw.province === "string" ? raw.province : null),
    work_setup_preference: typeof raw.work_setup_preference === "string" ? raw.work_setup_preference : "any",
    expected_salary_min: typeof raw.expected_salary_min === "number" ? raw.expected_salary_min : null,
    expected_salary_max: typeof raw.expected_salary_max === "number" ? raw.expected_salary_max : null,
    preferred_occupations,
    preferred_locations,
    work_type_preference,
    job_seeking_status: typeof raw.job_seeking_status === "string" ? raw.job_seeking_status : "active",
    languages,
    raw_field_count
  };
}
