import type { IntegrationStatus, QueuePriority, ReferralStatus, SecurityAlertLevel } from "./types";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTimeOnly(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function queuePriorityBadgeClass(priority: QueuePriority): string {
  if (priority === "high") return "bg-red-100 text-red-700";
  if (priority === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function referralStatusBadgeClass(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    Pending: "bg-amber-100 text-amber-700",
    "For Interview": "bg-blue-100 text-blue-700",
    Hired: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-rose-100 text-rose-700",
    Withdrawn: "bg-slate-100 text-slate-700",
  };

  return map[status] || "bg-slate-100 text-slate-700";
}

export function integrationStatusBadgeClass(status: IntegrationStatus): string {
  if (status === "healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "degraded") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function securityAlertBadgeClass(level: SecurityAlertLevel): string {
  if (level === "critical") return "bg-rose-100 text-rose-700";
  if (level === "warning") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}
