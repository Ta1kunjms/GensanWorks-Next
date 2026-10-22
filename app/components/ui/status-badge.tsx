// Canonical status -> badge mapping, so the same status looks the same everywhere.
// Referral labels come from app/lib/referral-status.ts (accepts every stored spelling).

import * as React from "react";

import { cn } from "@/lib/utils";
import { referralStatusLabel } from "@/lib/referral-status";
import { Badge } from "@/components/ui/badge";

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusKind = "application" | "referral" | "employer" | "job";

const TONES: Record<Exclude<StatusKind, "referral">, Record<string, BadgeTone>> = {
  application: {
    pending: "warning",
    under_review: "warning",
    reviewed: "info",
    accepted: "success",
    shortlisted: "info",
    interview: "info",
    hired: "success",
    rejected: "danger",
    withdrawn: "neutral",
  },
  employer: {
    pending: "warning",
    approved: "success",
    suspended: "danger",
    rejected: "danger",
  },
  job: {
    draft: "neutral",
    pending: "warning",
    active: "success",
    closed: "neutral",
    rejected: "danger",
    suspended: "danger",
    archived: "neutral",
  },
};

const REFERRAL_TONES: Record<ReturnType<typeof referralStatusLabel>, BadgeTone> = {
  Pending: "warning",
  "For Interview": "info",
  Hired: "success",
  Rejected: "danger",
  Withdrawn: "neutral",
};

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Badge tone and display label for a status; unknown values render neutral as-is. */
export function statusBadgeProps(kind: StatusKind, status: string | null | undefined): {
  tone: BadgeTone;
  label: string;
} {
  if (kind === "referral") {
    const label = referralStatusLabel(status);
    return { tone: REFERRAL_TONES[label], label };
  }
  const normalized = (status ?? "").trim().toLowerCase();
  if (!normalized) return { tone: "neutral", label: "—" };
  return { tone: TONES[kind][normalized] ?? "neutral", label: titleCase(normalized) };
}

type StatusBadgeProps = {
  kind: StatusKind;
  status: string | null | undefined;
  /** Optional display text override; the tone still comes from the status. */
  label?: string;
  className?: string;
};

export function StatusBadge({ kind, status, label, className }: StatusBadgeProps) {
  const mapped = statusBadgeProps(kind, status);
  return (
    <Badge variant={mapped.tone} className={cn("font-medium", className)}>
      {label ?? mapped.label}
    </Badge>
  );
}
