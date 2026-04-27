export type JobDetailRecord = {
  id: string;
  employerId: string | null;
  employerName: string | null;
  employerEmail: string | null;
  employerContactPerson: string | null;
  employerContactPhone: string | null;
  employerCity: string | null;
  employerProvince: string | null;
  positionTitle: string;
  location: string | null;
  city: string | null;
  province: string | null;
  employmentType: string | null;
  startingSalary: string | null;
  vacancies: number | null;
  minimumEducationRequired: string | null;
  mainSkillOrSpecialization: string | null;
  yearsOfExperienceRequired: string | null;
  agePreferenceMin: number | null;
  agePreferenceMax: number | null;
  jobStatus: string | null;
  category: string | null;
  psocCode: string | null;
  featured: boolean;
  slotsRemaining: number | null;
  jobEmbedding: unknown;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type JobDetailResponse = JobDetailRecord & {
  hasApplied?: boolean;
  applicationStatus?: string | null;
  isSaved?: boolean;
  applicationsCount?: number;
};