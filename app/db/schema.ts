import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  numeric,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================================
// ADMIN TABLE (System Administrators)
// ============================================================
export const adminsTable = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("admin"),
    isActive: boolean("is_active").notNull().default(true),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxAdminsEmail: index("idx_admins_email").on(t.email),
  })
);

// ============================================================
// USERS TABLE (Jobseekers - NSRP Profile)
// ============================================================
export const usersTable = pgTable(
  "users",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    birthDate: timestamp("birth_date"),
    gender: varchar("gender", { length: 20 }),
    profileImage: varchar("profile_image", { length: 500 }),

    // Address
    address: text("address"),
    city: varchar("city", { length: 100 }),
    province: varchar("province", { length: 100 }),
    zipCode: varchar("zip_code", { length: 10 }),

    // Employment Status (NSRP Classification)
    employmentStatus: varchar("employment_status", {
      length: 50,
      enum: [
        "Unemployed",
        "Employed",
        "Self-employed",
        "Student",
        "Retired",
        "OFW",
        "Freelancer",
        "4PS",
        "PWD",
      ],
    }),
    currentOccupation: varchar("current_occupation", { length: 255 }),
    currentEmployer: varchar("current_employer", { length: 255 }),
    employmentType: varchar("employment_type", { length: 50 }),

    // Education
    educationLevel: varchar("education_level", {
      length: 50,
      enum: [
        "Elementary",
        "High School",
        "Vocational",
        "Associate",
        "Bachelor",
        "Master",
        "Doctorate",
      ],
    }),
    schoolName: varchar("school_name", { length: 255 }),
    schoolYear: varchar("school_year", { length: 20 }),

    // Skills
    skills: jsonb("skills"), // Array of skill strings
    certifications: text("certifications"),

    // PESO Programs & Classifications
    isFourPS: boolean("is_four_ps").default(false),
    isOFW: boolean("is_ofw").default(false),
    isPWD: boolean("is_pwd").default(false),
    owdType: varchar("pwd_type", { length: 100 }),

    // Job Preferences
    preferredIndustries: jsonb("preferred_industries"),
    preferredLocations: jsonb("preferred_locations"),
    salaryExpectation: numeric("salary_expectation", { precision: 12, scale: 2 }),
    jobSearchStatus: varchar("job_search_status", { length: 50 }),

    // NSRP Fields
    nsrpId: varchar("nsrp_id", { length: 50 }).unique(),
    nsrpRegistrationDate: timestamp("nsrp_registration_date"),
    registrationDate: timestamp("registration_date").defaultNow(),

    // Additional Fields
    contactPerson: varchar("contact_person", { length: 255 }),
    contactRelationship: varchar("contact_relationship", { length: 100 }),
    contactPhone: varchar("contact_phone", { length: 20 }),

    // Profile Completeness
    profileComplete: boolean("profile_complete").default(false),
    profileCompleteness: integer("profile_completeness").default(0),

    // Account Status
    isActive: boolean("is_active").notNull().default(true),
    lastLogin: timestamp("last_login"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxUsersEmail: index("idx_users_email").on(t.email),
    idxUsersEmploymentStatus: index("idx_users_employment_status").on(t.employmentStatus),
    idxUsersIsOfw: index("idx_users_is_ofw").on(t.isOFW),
    idxUsersIsFourPs: index("idx_users_is_four_ps").on(t.isFourPS),
    idxUsersCreatedAt: index("idx_users_created_at").on(t.createdAt),
  })
);

// ============================================================
// EMPLOYERS TABLE (SRS Form 2 - Establishments)
// ============================================================
export const employersTable = pgTable(
  "employers",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    contactPerson: varchar("contact_person", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),

    // Establishment Info (SRS Form 2)
    establishmentName: varchar("establishment_name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 100 }),
    companyType: varchar("company_type", { length: 100 }),
    companySize: varchar("company_size", {
      length: 50,
      enum: ["Micro", "Small", "Medium", "Large"],
    }),
    businessNature: varchar("business_nature", { length: 255 }),

    // Address
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    zipCode: varchar("zip_code", { length: 10 }),

    // Logo
    logoUrl: varchar("logo_url", { length: 500 }),

    // Compliance Documents
    srsFormFile: varchar("srs_form_file", { length: 500 }),
    businessPermitFile: varchar("business_permit_file", { length: 500 }),
    bir2303File: varchar("bir_2303_file", { length: 500 }),
    doleCertificationFile: varchar("dole_certification_file", { length: 500 }),
    companyProfileFile: varchar("company_profile_file", { length: 500 }),

    // Account Status
    accountStatus: varchar("account_status", {
      length: 50,
      enum: ["pending", "approved", "rejected", "suspended"],
    }).default("pending"),
    verifiedAt: timestamp("verified_at"),
    hasAccount: boolean("has_account").default(false),
    isArchived: boolean("is_archived").default(false),

    // Additional Info
    website: varchar("website", { length: 255 }),
    description: text("description"),
    yearsInOperation: integer("years_in_operation"),

    // System Fields
    isActive: boolean("is_active").notNull().default(true),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxEmployersEmail: index("idx_employers_email").on(t.email),
    idxEmployersAccountStatus: index("idx_employers_account_status").on(t.accountStatus),
    idxEmployersCity: index("idx_employers_city").on(t.city),
    idxEmployersCreatedAt: index("idx_employers_created_at").on(t.createdAt),
  })
);

// ============================================================
// JOBS TABLE (Job Postings - SRS Form 2A)
// ============================================================
export const jobsTable = pgTable(
  "jobs",
  {
    // Identity
    id: uuid("id").primaryKey().defaultRandom(),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => employersTable.id, { onDelete: "cascade" }),

    // Position Info
    positionTitle: varchar("position_title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    responsibilities: text("responsibilities"),
    qualifications: text("qualifications"),

    // Compensation
    salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
    salaryPeriod: varchar("salary_period", { length: 50 }),

    // Work Details
    employmentType: varchar("employment_type", {
      length: 50,
      enum: [
        "Full-time",
        "Part-time",
        "Contract",
        "Temporary",
        "Freelance",
        "Internship",
      ],
    }).notNull(),
    vacancies: integer("vacancies").default(1),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),

    // Location
    location: varchar("location", { length: 255 }).notNull(),
    city: varchar("city", { length: 100 }),
    province: varchar("province", { length: 100 }),
    isRemote: boolean("is_remote").default(false),

    // Requirements
    requiredSkills: jsonb("required_skills"),
    preferredSkills: jsonb("preferred_skills"),
    educationLevel: varchar("education_level", { length: 100 }),
    yearsExperience: integer("years_experience"),
    minimumAge: integer("minimum_age"),
    maximumAge: integer("maximum_age"),

    // Status & Visibility
    status: varchar("status", {
      length: 50,
      enum: ["draft", "pending", "active", "closed", "archived"],
    }).default("draft"),
    archived: boolean("archived").default(false),
    isPublished: boolean("is_published").default(false),

    // Additional
    benefits: jsonb("benefits"),
    workSchedule: varchar("work_schedule", { length: 255 }),
    reportingTo: varchar("reporting_to", { length: 255 }),

    // Timestamps
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxJobsEmployerId: index("idx_jobs_employer_id").on(t.employerId),
    idxJobsStatus: index("idx_jobs_status").on(t.status),
    idxJobsLocation: index("idx_jobs_location").on(t.location),
    idxJobsCreatedAt: index("idx_jobs_created_at").on(t.createdAt),
    idxJobsIsPublished: index("idx_jobs_is_published").on(t.isPublished),
  })
);

// ============================================================
// APPLICATIONS TABLE
// ============================================================
export const applicationsTable = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => employersTable.id, { onDelete: "cascade" }),

    // Applicant Details (Snapshot)
    applicantName: varchar("applicant_name", { length: 255 }),
    applicantEmail: varchar("applicant_email", { length: 255 }),

    // Application Content
    coverLetter: text("cover_letter"),
    resumeUrl: varchar("resume_url", { length: 500 }),

    // Status & Workflow
    status: varchar("status", {
      length: 50,
      enum: [
        "pending",
        "reviewed",
        "shortlisted",
        "interview",
        "hired",
        "rejected",
        "withdrawn",
      ],
    }).default("pending"),

    // Feedback
    notes: text("notes"),
    feedback: text("feedback"),
    interviewDate: timestamp("interview_date"),
    interviewNotes: text("interview_notes"),

    // Match Score (AI)
    matchScore: numeric("match_score", { precision: 5, scale: 2 }),
    matchInsights: jsonb("match_insights"),

    // Timestamps
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxApplicationsJobId: index("idx_applications_job_id").on(t.jobId),
    idxApplicationsApplicantId: index("idx_applications_applicant_id").on(t.applicantId),
    idxApplicationsEmployerId: index("idx_applications_employer_id").on(t.employerId),
    idxApplicationsStatus: index("idx_applications_status").on(t.status),
    idxApplicationsCreatedAt: index("idx_applications_created_at").on(t.createdAt),
  })
);

// ============================================================
// REFERRALS TABLE (PESO Tracking)
// ============================================================
export const referralsTable = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => employersTable.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(
      () => applicationsTable.id,
      { onDelete: "set null" }
    ),

    // Details (Snapshot)
    applicant: varchar("applicant", { length: 255 }),
    employer: varchar("employer", { length: 255 }),
    vacancy: varchar("vacancy", { length: 255 }),

    // Status
    status: varchar("status", {
      length: 50,
      enum: ["Pending", "For Interview", "Hired", "Rejected", "Withdrawn"],
    }).default("Pending"),

    // PESO Tracking
    referralSlipNumber: varchar("referral_slip_number", { length: 100 }),
    pesoOfficerName: varchar("peso_officer_name", { length: 255 }),
    pesoOfficerDesignation: varchar("peso_officer_designation", {
      length: 255,
    }),
    dateReferred: timestamp("date_referred").notNull().defaultNow(),

    // Additional Info
    remarks: text("remarks"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxReferralsApplicantId: index("idx_referrals_applicant_id").on(t.applicantId),
    idxReferralsEmployerId: index("idx_referrals_employer_id").on(t.employerId),
    idxReferralsJobId: index("idx_referrals_job_id").on(t.jobId),
    idxReferralsStatus: index("idx_referrals_status").on(t.status),
    idxReferralsCreatedAt: index("idx_referrals_created_at").on(t.createdAt),
  })
);

// ============================================================
// MESSAGES TABLE (In-app Messaging)
// ============================================================
export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Actor ids across roles (admin/employer/jobseeker); intentionally FK-free.
    senderId: varchar("sender_id", { length: 64 }).notNull(),
    recipientId: varchar("recipient_id", { length: 64 }).notNull(),

    content: text("content").notNull(),

    // Status
    read: boolean("read").default(false),
    readAt: timestamp("read_at"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxMessagesSenderId: index("idx_messages_sender_id").on(t.senderId),
    idxMessagesRecipientId: index("idx_messages_recipient_id").on(t.recipientId),
    idxMessagesCreatedAt: index("idx_messages_created_at").on(t.createdAt),
  })
);

// ============================================================
// NOTIFICATIONS TABLE
// ============================================================
export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Actor-scoped recipient id (admin/employer/jobseeker id), intentionally not FK-bound
    // so notifications can target all role tables.
    userId: varchar("user_id", { length: 64 }).notNull(),

    role: varchar("role", {
      length: 50,
      enum: ["admin", "employer", "jobseeker"],
    }),
    type: varchar("type", {
      length: 50,
      enum: [
        "system",
        "job",
        "application",
        "message",
        "referral",
        "account",
      ],
    }).default("system"),

    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),

    // Metadata for linking to specific resources
    relatedId: uuid("related_id"),
    relatedType: varchar("related_type", {
      length: 50,
      enum: ["job", "application", "referral", "message"],
    }),

    // Status
    read: boolean("read").default(false),
    readAt: timestamp("read_at"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxNotificationsUserId: index("idx_notifications_user_id").on(t.userId),
    idxNotificationsRead: index("idx_notifications_read").on(t.read),
    idxNotificationsCreatedAt: index("idx_notifications_created_at").on(t.createdAt),
  })
);

// ============================================================
// AUTH LIFECYCLE TOKENS TABLE
// ============================================================
export const authLifecycleTokensTable = pgTable(
  "auth_lifecycle_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", {
      length: 32,
      enum: ["password_reset", "email_verify"],
    }).notNull(),
    role: varchar("role", {
      length: 50,
      enum: ["admin", "employer", "jobseeker"],
    }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxAuthLifecycleTokensKindRoleUser: index("idx_auth_lifecycle_tokens_kind_role_user").on(
      t.kind,
      t.role,
      t.userId
    ),
    idxAuthLifecycleTokensExpiresAt: index("idx_auth_lifecycle_tokens_expires_at").on(
      t.expiresAt
    ),
  })
);

// ============================================================
// ACCOUNT EMAIL VERIFICATIONS TABLE
// ============================================================
export const accountEmailVerificationsTable = pgTable(
  "account_email_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: varchar("role", {
      length: 50,
      enum: ["admin", "employer", "jobseeker"],
    }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    verifiedAt: timestamp("verified_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueRoleUserVerification: unique("unique_role_user_verification").on(t.role, t.userId),
    idxAccountEmailVerificationsEmail: index("idx_account_email_verifications_email").on(t.email),
  })
);

// ============================================================
// ACCOUNT DELETION REQUESTS TABLE
// ============================================================
export const accountDeletionRequestsTable = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: varchar("role", {
      length: 50,
      enum: ["admin", "employer", "jobseeker"],
    }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    status: varchar("status", {
      length: 32,
      enum: ["pending", "cancelled", "processed"],
    }).notNull().default("pending"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    deleteAfter: timestamp("delete_after").notNull(),
    cancelledAt: timestamp("cancelled_at"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxAccountDeletionRequestsRoleUserStatus: index(
      "idx_account_deletion_requests_role_user_status"
    ).on(t.role, t.userId, t.status),
    idxAccountDeletionRequestsDeleteAfter: index("idx_account_deletion_requests_delete_after").on(
      t.deleteAfter
    ),
  })
);

// ============================================================
// ADMIN ACCESS REQUESTS TABLE
// ============================================================
export const adminAccessRequestsTable = pgTable(
  "admin_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }).notNull(),
    organization: varchar("organization", { length: 255 }).notNull(),

    status: varchar("status", {
      length: 50,
      enum: ["pending", "approved", "rejected"],
    }).default("pending"),

    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (t) => ({
    idxAdminAccessRequestsEmail: index("idx_admin_access_requests_email").on(t.email),
    idxAdminAccessRequestsStatus: index("idx_admin_access_requests_status").on(t.status),
  })
);

// ============================================================
// EMPLOYER REQUIREMENTS TABLE (Compliance Checklist)
// ============================================================
export const employerRequirementsTable = pgTable(
  "employer_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employerId: uuid("employer_id")
      .notNull()
      .unique()
      .references(() => employersTable.id, { onDelete: "cascade" }),

    srsFormSubmitted: boolean("srs_form_submitted").default(false),
    businessPermitSubmitted: boolean("business_permit_submitted").default(false),
    bir2303Submitted: boolean("bir_2303_submitted").default(false),
    doleCertificationSubmitted: boolean("dole_certification_submitted").default(false),
    companyProfileSubmitted: boolean("company_profile_submitted").default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// ============================================================
// JOB REQUIREMENTS TABLE
// ============================================================
export const jobRequirementsTable = pgTable(
  "job_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .unique()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    employerId: uuid("employer_id")
      .notNull()
      .references(() => employersTable.id, { onDelete: "cascade" }),

    referralSlipSubmitted: boolean("referral_slip_submitted").default(false),
    employmentContractSubmitted: boolean("employment_contract_submitted").default(false),
    medicalCertificateSubmitted: boolean("medical_certificate_submitted").default(false),
    barangayClearanceSubmitted: boolean("barangay_clearance_submitted").default(false),
    policeClearanceSubmitted: boolean("police_clearance_submitted").default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxJobRequirementsJobId: index("idx_job_requirements_job_id").on(t.jobId),
  })
);

// ============================================================
// SKILL SUGGESTIONS TABLE (Skill Catalog)
// ============================================================
export const skillSuggestionsTable = pgTable(
  "skill_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    normalizedName: varchar("normalized_name", { length: 255 }).notNull().unique(),
    category: varchar("category", { length: 100 }),
    frequency: integer("frequency").default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    idxSkillSuggestionsNormalizedName: index("idx_skill_suggestions_normalized_name").on(
      t.normalizedName
    ),
  })
);

// ============================================================
// BOOKMARKS/FAVORITES TABLE
// ============================================================
export const bookmarksTable = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserJobBookmark: unique("unique_user_job_bookmark").on(t.userId, t.jobId),
    idxBookmarksUserId: index("idx_bookmarks_user_id").on(t.userId),
  })
);

// ============================================================
// SETTINGS TABLE
// ============================================================
export const settingsTable = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    value: jsonb("value").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// ============================================================
// EXPORT SCHEMAS FOR ZODVALIDATION
// ============================================================

// Schemas
export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const insertEmployerSchema = createInsertSchema(employersTable);
export const selectEmployerSchema = createSelectSchema(employersTable);
export type Employer = typeof employersTable.$inferSelect;
export type InsertEmployer = typeof employersTable.$inferInsert;

export const insertJobSchema = createInsertSchema(jobsTable);
export const selectJobSchema = createSelectSchema(jobsTable);
export type Job = typeof jobsTable.$inferSelect;
export type InsertJob = typeof jobsTable.$inferInsert;

export const insertApplicationSchema = createInsertSchema(applicationsTable);
export const selectApplicationSchema = createSelectSchema(applicationsTable);
export type Application = typeof applicationsTable.$inferSelect;
export type InsertApplication = typeof applicationsTable.$inferInsert;

export const insertReferralSchema = createInsertSchema(referralsTable);
export const selectReferralSchema = createSelectSchema(referralsTable);
export type Referral = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
