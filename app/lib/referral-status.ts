// Canonical referral status vocabulary (scan batch 4, 2026-10-21).
// The database stores lowercase values; the UI shows title-case labels.
// Older code wrote title-case labels ("Hired", "For Interview") and "pending",
// so readers accept every spelling and writers always store the canonical value.

export type ReferralStatusLabel = "Pending" | "For Interview" | "Hired" | "Rejected" | "Withdrawn";
export type ReferralDbStatus = "referred" | "interview" | "hired" | "rejected" | "withdrawn";

export const REFERRAL_STATUS_LABELS: ReferralStatusLabel[] = ["Pending", "For Interview", "Hired", "Rejected", "Withdrawn"];
export const REFERRAL_DB_STATUSES: ReferralDbStatus[] = ["referred", "interview", "hired", "rejected", "withdrawn"];

const LABEL_TO_DB: Record<ReferralStatusLabel, ReferralDbStatus> = {
  Pending: "referred",
  "For Interview": "interview",
  Hired: "hired",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
};

/** Display label for any stored or submitted spelling; unknown values read as Pending. */
export function referralStatusLabel(value?: string | null): ReferralStatusLabel {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "for interview" || normalized === "interview") return "For Interview";
  if (normalized === "hired") return "Hired";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "withdrawn") return "Withdrawn";
  return "Pending";
}

/** Canonical value to store for any label or stored spelling. */
export function referralDbStatus(value?: string | null): ReferralDbStatus {
  return LABEL_TO_DB[referralStatusLabel(value)];
}

/** Every spelling that means this status, for `.in("status", ...)` filters over older rows. */
export function referralStatusDbValues(label: ReferralStatusLabel): string[] {
  const db = LABEL_TO_DB[label];
  return label === "Pending" ? [db, "pending", label] : [db, label];
}
