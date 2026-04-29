/**
 * Centralized API Request/Response Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from "zod";

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid UUID format");
export const emailSchema = z.string().email("Invalid email format").toLowerCase();
export const phoneSchema = z.string().regex(/^[\d\-\+\(\) ]*$/, "Invalid phone format");
export const urlSchema = z.string().url("Invalid URL format");
export const dateStringSchema = z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), "Invalid date format");

// Pagination
export const paginationQuerySchema = z.object({
  limit: z
    .string()
    .pipe(z.coerce.number().min(1).max(100))
    .default("10"),
  offset: z
    .string()
    .pipe(z.coerce.number().min(0))
    .default("0"),
});

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "employer", "jobseeker"]).optional().default("jobseeker"),
});

export const signupJobseekerRequestSchema = z.object({
  firstName: z.string().min(1, "First name required").max(100),
  lastName: z.string().min(1, "Last name required").max(100),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  phone: phoneSchema.optional(),
  dateOfBirth: dateStringSchema.optional(),
  registrationType: z.enum(["new_graduate", "returning_worker", "career_changer"]).optional(),
});

export const signupEmployerRequestSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  establishmentName: z.string().min(1, "Establishment name required").max(200),
  contactPerson: z.string().max(100).optional(),
  contactPhone: phoneSchema.optional(),
  industry: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Reset token required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const requestVerifyEmailSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "employer", "jobseeker"]).optional(),
});

export const confirmVerifyEmailSchema = z.object({
  token: z.string().min(12, "Invalid token").max(512),
});

export const requestAccountDeletionSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  reason: z.string().max(2000, "Reason must be under 2000 characters").optional(),
});

export const cancelAccountDeletionSchema = z.object({}).strict();

// ============================================================================
// JOB LISTINGS SCHEMAS
// ============================================================================

export const jobsQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  search: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  employmentType: z
    .enum(["onsite", "remote", "hybrid"])
    .optional(),
  salaryMin: z
    .string()
    .pipe(z.coerce.number().min(0))
    .optional(),
  salaryMax: z
    .string()
    .pipe(z.coerce.number().min(0))
    .optional(),
  city: z.string().max(100).optional(),
  sortBy: z.enum(["recent", "salary_high", "salary_low"]).default("recent"),
});

export const createJobPostingSchema = z.object({
  positionTitle: z.string().min(1, "Position title required").max(200),
  description: z.string().min(10, "Description required"),
  minimumEducationRequired: z.string().min(1, "Education required"),
  mainSkillOrSpecialization: z.string().optional(),
  mainSkillDesired: z.string().optional(),
  yearsOfExperienceRequired: z.coerce.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  salaryPeriod: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
  startingSalary: z.coerce.number().optional(),
  workType: z.enum(["Full-time", "Part-time"]).optional(),
  vacantPositions: z.coerce.number().optional(),
  vacancies: z.coerce.number().optional(),
  paidEmployees: z.coerce.number().optional(),
  industryCodes: z.array(z.string()).optional(),
  // SRS Form 2A Column 7: P=Permanent, T=Temporary, C=Contractual
  employmentContractType: z.enum(["P", "T", "C"]).optional(),
  // SRS Form 2A: industry code per job (overrides employer default)
  industryCode: z.enum(["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17"]).nullable().optional(),
  jobStatus: z.string().optional(),
  preparedByName: z.string().optional(),
  preparedByDesignation: z.string().optional(),
  preparedByContact: z.string().optional(),

  contractType: z.string().max(100).optional(),
  employmentType: z.enum(["onsite", "remote", "hybrid"]).optional(),
  location: z.string().max(200).optional(),
  municipality: z.string().optional(),
  province: z.string().optional(),
  city: z.string().max(100).optional(),
  deadline: dateStringSchema.optional(),
});

export const updateJobPostingSchema = createJobPostingSchema.partial();

export const jobApplicationSchema = z.object({
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters").max(5000),
  resume: z.string().url("Invalid resume URL").optional(),
  portfolio: z.string().url("Invalid portfolio URL").optional(),
});

export const jobApplicationStatusUpdateSchema = z.object({
  status: z.enum(["screening", "interview", "hired", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export const employerApplicationStatusUpdateSchema = z
  .object({
    status: z.enum([
      "pending",
      "reviewed",
      "shortlisted",
      "interview",
      "hired",
      "rejected",
      "withdrawn",
    ]),
    feedback: z.string().max(5000).optional(),
  })
  .strict();

export const employerApplicationsListQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  status: z
    .enum([
      "pending",
      "reviewed",
      "shortlisted",
      "interview",
      "hired",
      "rejected",
      "withdrawn",
    ])
    .optional(),
  jobId: uuidSchema.optional(),
  search: z.string().max(200).optional(),
});

export const employerApplicationMessageSchema = z
  .object({
    message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  })
  .strict();

export const updateJobStatusSchema = z.object({
  status: z.enum(["pending", "active", "closed", "archived"]),
});

export const employerJobStatusUpdateSchema = z
  .object({
    status: z.enum(["draft", "pending", "active", "closed", "archived", "rejected"]),
    rejectionReason: z.string().max(1000).optional(),
  })
  .strict();

export const publishJobSchema = z.object({
  isPublished: z.boolean(),
});

export const archiveJobSchema = z.object({
  archived: z.boolean(),
});

export const employerJobsListQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  status: z.enum(["pending", "active", "closed", "archived"]).optional(),
  search: z.string().max(200).optional(),
});

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const jobseekerProfileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  middleName: z.string().max(100).nullable().optional(),
  suffix: z.string().max(20).nullable().optional(),
  phone: phoneSchema.optional(),
  birthDate: dateStringSchema.optional(),
  gender: z.string().max(20).nullable().optional(),
  religion: z.string().max(100).nullable().optional(),
  civilStatus: z.string().max(50).nullable().optional(),
  tin: z.string().max(50).nullable().optional(),
  height: z.string().max(20).nullable().optional(),

  // Disability (NSRP Form I — per-type checkboxes)
  isPwd: z.boolean().optional(),
  disabilityVisual: z.boolean().optional(),
  disabilitySpeech: z.boolean().optional(),
  disabilityMental: z.boolean().optional(),
  disabilityHearing: z.boolean().optional(),
  disabilityPhysical: z.boolean().optional(),
  disabilityOthers: z.string().max(200).nullable().optional(),

  houseNumber: z.string().max(100).nullable().optional(),
  barangay: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  zipCode: z.string().max(20).nullable().optional(),

  // Employment Status (NSRP Form I)
  employmentStatus: z.string().max(100).nullable().optional(),
  employmentType: z.string().max(100).nullable().optional(),
  selfEmployedType: z.string().max(100).nullable().optional(),
  selfEmployedTypeOthers: z.string().max(100).nullable().optional(),
  unemployedReason: z.string().max(100).nullable().optional(),
  unemployedMonths: z.coerce.number().nullable().optional(),
  unemployedDueToCalamity: z.boolean().optional(),
  terminatedCountry: z.string().max(100).nullable().optional(),
  terminatedReason: z.string().max(100).nullable().optional(),

  // OFW (NSRP Form I)
  isOfw: z.boolean().optional(),
  ofwCountry: z.string().max(100).nullable().optional(),
  isFormerOfw: z.boolean().optional(),
  formerOfwCountry: z.string().max(100).nullable().optional(),
  formerOfwReturnMonthYear: z.string().max(100).nullable().optional(),

  // 4Ps (NSRP Form I)
  isFourPs: z.boolean().optional(),
  householdIdNo: z.string().max(100).nullable().optional(),

  // Job Preference (NSRP Form II)
  preferencePartTime: z.boolean().optional(),
  preferenceFullTime: z.boolean().optional(),
  preferredOccupation1: z.string().max(100).nullable().optional(),
  preferredOccupation2: z.string().max(100).nullable().optional(),
  preferredOccupation3: z.string().max(100).nullable().optional(),

  // Preferred Work Location — 3 local + 3 overseas (NSRP Form II)
  preferredWorkLocationLocal1: z.string().max(200).nullable().optional(),
  preferredWorkLocationLocal2: z.string().max(200).nullable().optional(),
  preferredWorkLocationLocal3: z.string().max(200).nullable().optional(),
  preferredWorkLocationOverseas1: z.string().max(200).nullable().optional(),
  preferredWorkLocationOverseas2: z.string().max(200).nullable().optional(),
  preferredWorkLocationOverseas3: z.string().max(200).nullable().optional(),

  // Other Skills (NSRP Section VIII)
  otherSkills: z.array(z.string()).nullable().optional(),
  otherSkillsOthers: z.string().max(200).nullable().optional(),
  profileImage: z.string().url().optional(),
});

export const employerProfileUpdateSchema = z.object({
  establishmentName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().min(1).max(100).optional(),
  contactPhone: phoneSchema.optional(),
  industry: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  profileImage: z.string().url().optional(),
});

// SRS Form 2 industry codes (01–17)
export const SRS_INDUSTRY_CODES = [
  { code: "01", label: "Agriculture" },
  { code: "02", label: "Fishing" },
  { code: "03", label: "Mining and Quarrying" },
  { code: "04", label: "Manufacturing" },
  { code: "05", label: "Electrical, Gas and Water Supply" },
  { code: "06", label: "Construction" },
  { code: "07", label: "Wholesale and Retail Trade" },
  { code: "08", label: "Hotels and Restaurant" },
  { code: "09", label: "Transport, Storage and Communication" },
  { code: "10", label: "Financial Intermediation" },
  { code: "11", label: "Real Estate, Renting and Business Activities" },
  { code: "12", label: "Public Administration and Defense" },
  { code: "13", label: "Education" },
  { code: "14", label: "Health and Social Work" },
  { code: "15", label: "Other Community, Social and Personal Service Activities" },
  { code: "16", label: "Activities of Private Households as Employers" },
  { code: "17", label: "Extra-Territorial Organizations and Bodies" },
] as const;

export const SRS_INDUSTRY_CODE_VALUES = SRS_INDUSTRY_CODES.map(c => c.code) as unknown as [string, ...string[]];

export const employerAccountProfileUpdateSchema = z
  .object({
    // SRS Form 2 — Establishment Details
    establishmentName: z.string().min(2).max(255).optional(),
    acronymAbbreviation: z.string().max(50).nullable().optional(),
    industryCode: z.array(z.string()).optional(),
    companyTaxId: z.string().max(50).nullable().optional(),
    typeOfEstablishment: z.string().max(100).nullable().optional(),
    totalPaidEmployees: z.number().int().min(0).optional(),
    totalVacantPositions: z.number().int().min(0).optional(),
    srsSubscriberIntent: z.boolean().optional(),

    // SRS Form 2 — Geographic Identification
    province: z.string().min(2).max(100).optional(),
    city: z.string().min(2).max(100).optional(),
    barangay: z.string().max(100).nullable().optional(),
    address: z.string().min(5).max(1000).optional(),
    zipCode: z.string().max(10).nullable().optional(),
    geographicCode: z.string().max(50).nullable().optional(),
    barangayChairperson: z.string().max(200).nullable().optional(),
    barangaySecretary: z.string().max(200).nullable().optional(),

    // SRS Form 2 — Contact
    contactPerson: z.string().max(255).optional(),
    contactPhone: z.string().max(20).optional(),
    designation: z.string().max(100).nullable().optional(),

    // SRS Form 2A — "Prepared By" footer
    srsPreparedBy: z.string().max(255).nullable().optional(),
    srsPreparedDesignation: z.string().max(100).nullable().optional(),
    srsPreparedDate: z.string().nullable().optional(),
    srsPreparedContact: z.string().max(50).nullable().optional(),

    // Documents
    srsFormFile: z.string().max(500).nullable().optional(),
    businessPermitFile: z.string().max(500).nullable().optional(),
    bir2303File: z.string().max(500).nullable().optional(),
    doleCertificationFile: z.string().max(500).nullable().optional(),
    companyProfileFile: z.string().max(500).nullable().optional(),

    // General
    description: z.string().max(5000).nullable().optional(),
    website: z.string().max(255).nullable().optional(),
    profileImage: z.string().max(500).nullable().optional(),
    tin: z.string().max(50).nullable().optional(),
    industry: z.string().max(100).nullable().optional(),
  });

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminDashboardQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  period: z.enum(["daily", "weekly", "monthly"]).optional().default("monthly"),
});

export const employerAccessRequestSchema = z.object({
  email: emailSchema,
  status: z.enum(["pending", "approved", "rejected"]),
});

export const administrationUserManagementSchema = z.object({
  userId: uuidSchema,
  action: z.enum(["activate", "deactivate", "suspend", "delete"]),
  reason: z.string().max(500).optional(),
});

export const adminUsersQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  search: z.string().max(200).optional(),
  role: z.enum(["all", "admin", "employer", "jobseeker"]).optional().default("all"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const adminJobsQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  search: z.string().max(200).optional(),
  status: z.enum(["draft", "pending", "active", "closed", "archived", "rejected"]).optional(),
  sortBy: z.enum(["created_at", "createdAt", "positionTitle", "establishmentName", "status", "location"]).optional().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ============================================================================
// CONTACT & NOTIFICATIONS SCHEMAS
// ============================================================================

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  email: emailSchema,
  subject: z.string().min(1, "Subject required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  category: z.enum(["general", "support", "feedback", "bug_report"]).optional(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
  applicationUpdates: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// ============================================================================
// APPLICATION TRACKING SCHEMAS
// ============================================================================

export const applicationFiltersSchema = z.object({
  ...paginationQuerySchema.shape,
  status: z.enum(["screening", "interview", "hired", "rejected", "applied"]).optional(),
  sortBy: z.enum(["recent", "oldest", "status"]).default("recent"),
});

export const referralSchema = z.object({
  referrerEmail: emailSchema,
  referrerName: z.string().min(1).max(100),
  referreeName: z.string().min(1).max(100),
  referreeEmail: emailSchema,
  connectionType: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
  requestId: z.string().optional(),
});

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  requestId: z.string().optional(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
  requestId: z.string().optional(),
});

// Type exports for TypeScript usage
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupJobseekerRequest = z.infer<typeof signupJobseekerRequestSchema>;
export type SignupEmployerRequest = z.infer<typeof signupEmployerRequestSchema>;
export type CreateJobPosting = z.infer<typeof createJobPostingSchema>;
export type UpdateJobPosting = z.infer<typeof updateJobPostingSchema>;
export type JobApplication = z.infer<typeof jobApplicationSchema>;
export type JobseekerProfileUpdate = z.infer<typeof jobseekerProfileUpdateSchema>;
export type EmployerProfileUpdate = z.infer<typeof employerProfileUpdateSchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type Referral = z.infer<typeof referralSchema>;
