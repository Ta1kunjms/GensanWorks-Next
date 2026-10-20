// Stage 2 of the two-stage account deletion policy (pilot constraint #3):
// stage 1 deactivates on an approved request (admin/account-deletion/process);
// stage 2 anonymizes direct identifiers after the pilot retention period while
// keeping the relational row, so audit history and non-identifying aggregates
// (city, employment status, skills, sector) survive. Never a hard delete.
//
// Pure helpers only, so the decision logic can be unit tested offline.

export type AnonymizableRole = "admin" | "employer" | "jobseeker";

export const ANONYMIZED_EMAIL_DOMAIN = "anonymized.invalid";
export const ANONYMIZED_PASSWORD_HASH = "anonymized";

export const PROFILE_TABLES: Record<AnonymizableRole, string> = {
  admin: "admins",
  employer: "employers",
  jobseeker: "jobseekers",
};

export function anonymizedEmail(userId: string): string {
  return `deleted+${userId}@${ANONYMIZED_EMAIL_DOMAIN}`;
}

export function isAnonymizedEmail(email: unknown): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${ANONYMIZED_EMAIL_DOMAIN}`);
}

// Direct identifiers to overwrite per role. Columns not listed are kept.
const DIRECT_IDENTIFIERS: Record<AnonymizableRole, Record<string, unknown>> = {
  jobseeker: {
    first_name: "Deleted",
    last_name: "User",
    middle_name: null,
    suffix: null,
    phone: null,
    house_number: null,
    barangay: null,
    zip_code: null,
    birth_date: null,
    tin: null,
    household_id_no: null,
    nsrp_id: null,
    profile_image: null,
    profile_embedding: null,
  },
  employer: {
    contact_person: null,
    contact_phone: null,
    designation: null,
    company_tax_id: null,
    profile_image: null,
  },
  admin: {
    name: "Deleted Admin",
  },
};

/**
 * Builds the profile UPDATE for one user. Only columns present on the fetched
 * row are written, so schema differences between environments cannot cause
 * writes to unknown columns.
 */
export function buildAnonymizedProfileUpdate(
  role: AnonymizableRole,
  userId: string,
  row: Record<string, unknown>,
  now: Date = new Date()
): Record<string, unknown> {
  const candidate: Record<string, unknown> = {
    ...DIRECT_IDENTIFIERS[role],
    email: anonymizedEmail(userId),
    password_hash: ANONYMIZED_PASSWORD_HASH,
    updated_at: now.toISOString(),
  };
  return Object.fromEntries(Object.entries(candidate).filter(([column]) => column in row));
}

export type AnonymizationDecision = "anonymize" | "resume" | "skip_missing" | "skip_active" | "skip_changed";

/**
 * Decides whether one processed deletion request may be anonymized.
 * - "resume": the profile was anonymized by an earlier run that did not finish;
 *   the remaining (idempotent) steps are re-run.
 * - "anonymize": the profile still exists, is deactivated, and has not changed
 *   since stage 1 processed the request (stage 1 writes the profile's
 *   updated_at and the request's processed_at with the same timestamp). Any
 *   later change, such as re-activation or a moderation suspension, means the
 *   old request no longer describes this account, so it is skipped.
 */
export function decideAnonymization(
  row: Record<string, unknown> | null,
  processedAt: string | null
): AnonymizationDecision {
  if (!row) return "skip_missing";
  if (isAnonymizedEmail(row.email)) return "resume";
  if (row.is_active !== false) return "skip_active";
  const updated = typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN;
  const processed = processedAt ? Date.parse(processedAt) : NaN;
  if (Number.isNaN(updated) || Number.isNaN(processed) || updated > processed + STAGE1_TIMESTAMP_TOLERANCE_MS) {
    return "skip_changed";
  }
  return "anonymize";
}

/**
 * Slack between stage 1's processed_at and the profile's updated_at, in case the
 * database stamps updated_at itself (e.g. a now() trigger). Any real later change
 * (re-activation, suspension) happens well outside this window.
 */
export const STAGE1_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/** Clears every existing user_metadata key (GoTrue merges keys; only null removes one). */
export function clearedMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, null> {
  return Object.fromEntries(Object.keys(metadata ?? {}).map((key) => [key, null]));
}

/** Retention period in whole days; null when unset or invalid (feature stays off). */
export function parseRetentionDays(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const days = Number(value.trim());
  return days >= 1 ? days : null;
}

export function retentionCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}
