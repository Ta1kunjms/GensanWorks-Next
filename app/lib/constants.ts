/**
 * Application-wide Constants
 * 
 * Statuses, workflows, enums, and configuration used across the application
 */

// ============================================================
// APPLICATION STATUS WORKFLOW
// ============================================================

export const APPLICATION_STATUSES = [
  "pending",
  "reviewed",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "withdrawn",
] as const;

// Define valid transitions between statuses
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["reviewed", "shortlisted", "hired", "rejected", "withdrawn"],
  reviewed: ["shortlisted", "interview", "rejected"],
  shortlisted: ["interview", "hired", "rejected", "withdrawn"],
  interview: ["hired", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

// ============================================================
// REFERRAL STATUS MAPPING
// ============================================================

export const APPLICATION_TO_REFERRAL_STATUS: Record<string, string> = {
  pending: "Pending",
  reviewed: "Pending",
  shortlisted: "Pending",
  interview: "For Interview",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// ============================================================
// EMPLOYMENT STATUS
// ============================================================

export const EMPLOYMENT_STATUSES = [
  "Unemployed",
  "Employed",
  "Self-employed",
  "Student",
  "Retired",
  "OFW",
  "Freelancer",
  "4PS",
  "PWD",
] as const;

// ============================================================
// EDUCATION LEVELS
// ============================================================

export const EDUCATION_LEVELS = [
  "Elementary",
  "High School",
  "Vocational",
  "Associate",
  "Bachelor",
  "Master",
  "Doctorate",
] as const;

// ============================================================
// EMPLOYMENT TYPES
// ============================================================

export const EMPLOYMENT_TYPES = [
  "onsite",
  "remote",
  "hybrid",
] as const;

// ============================================================
// COMPANY SIZES
// ============================================================

export const COMPANY_SIZES = ["Micro", "Small", "Medium", "Large"] as const;

// ============================================================
// INDUSTRIES
// ============================================================

export const INDUSTRIES = [
  "Information Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Education",
  "Construction",
  "Transportation",
  "Telecommunications",
  "Energy",
  "Real Estate",
  "Agriculture",
  "Media",
  "Other",
] as const;

// ============================================================
// JOB STATUS
// ============================================================

export const JOB_STATUSES = [
  "draft",
  "pending",
  "active",
  "closed",
  "archived",
] as const;

// ============================================================
// EMPLOYER ACCOUNT STATUS
// ============================================================

export const EMPLOYER_ACCOUNT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export const NOTIFICATION_TYPES = [
  "system",
  "job",
  "application",
  "message",
  "referral",
  "account",
] as const;

// ============================================================
// USER ROLES
// ============================================================

export const USER_ROLES = ["admin", "employer", "jobseeker"] as const;

// ============================================================
// PASSWORD REQUIREMENTS
// ============================================================

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
};

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!\"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~])[a-zA-Z\d!\"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]{8,}$/;

// ============================================================
// API PAGINATION
// ============================================================

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// FIELD VALIDATION
// ============================================================

export const FIELD_VALIDATION = {
  email: {
    maxLength: 255,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    pattern: /^\+?[\d\s\-()]{7,}$/,
  },
  zipCode: {
    maxLength: 10,
  },
  name: {
    maxLength: 255,
    minLength: 2,
  },
  description: {
    maxLength: 5000,
  },
};

// ============================================================
// DATE & TIME
// ============================================================

export const DATE_FORMATS = {
  display: "MMM d, yyyy",
  displayTime: "MMM d, yyyy h:mm a",
  api: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  display_ph: "dd/MM/yyyy", // Philippines format
};

// ============================================================
// CURRENCY & SALARY
// ============================================================

export const CURRENCY = "PHP";
export const SALARY_PERIODS = [
  { value: "hourly", label: "Per Hour" },
  { value: "daily", label: "Per Day" },
  { value: "weekly", label: "Per Week" },
  { value: "monthly", label: "Per Month" },
  { value: "yearly", label: "Per Year" },
] as const;

// ============================================================
// FILE UPLOAD
// ============================================================

export const FILE_UPLOAD = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedDocumentTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  profileImageDimensions: {
    width: 200,
    height: 200,
  },
};

// ============================================================
// PROFILE COMPLETENESS WEIGHTS
// ============================================================

export const PROFILE_COMPLETENESS_WEIGHTS = {
  // Essential (40%)
  email: 5,
  name: 5,
  phone: 5,
  address: 10,
  employmentStatus: 10,
  profileImage: 5,

  // Education & Skills (30%)
  educationLevel: 5,
  skills: 10,
  certifications: 5,
  schoolName: 5,
  schoolYear: 5,

  // Experience & Preferences (20%)
  currentOccupation: 5,
  yearsExperience: 5,
  preferredIndustries: 5,
  preferredLocations: 5,

  // Additional (10%)
  birthDate: 3,
  gender: 2,
  nsrpId: 5,
};

// ============================================================
// AI MATCHING
// ============================================================

export const AI_MATCHING = {
  model: "llama3-70b-8192",
  provider: "groq",
  minScore: 0,
  maxScore: 100,
  defaultMinScore: 50,
  cacheDurationMinutes: 5,
  timeout: 30000, // 30 seconds
};

// ============================================================
// PAGINATION DEFAULTS
// ============================================================

export const PAGINATION = {
  defaultLimit: 10,
  defaultOffset: 0,
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  maxLimit: 100,
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: string,
  to: string
): boolean {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

/**
 * Get all valid next statuses for a given status
 */
export function getNextStatuses(status: string): string[] {
  return STATUS_TRANSITIONS[status] || [];
}

/**
 * Convert application status to referral status
 */
export function mapApplicationToReferralStatus(
  appStatus: string
): string {
  return APPLICATION_TO_REFERRAL_STATUS[appStatus] || "Pending";
}

/**
 * Check if a status is terminal (no transitions allowed)
 */
export function isTerminalStatus(status: string): boolean {
  return getNextStatuses(status).length === 0;
}

/**
 * Format enum value for display
 */
export function formatEnumValue(value: string): string {
  return value
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
