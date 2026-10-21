import type { DashboardPeriod } from "./types-period";

export type QueueType =
  | "employer_approval"
  | "job_approval"
  | "referral_update"
  | "jobseeker_profile_review"
  | "ai_match_ready";

export type QueuePriority = "high" | "medium" | "low";

export type JobStatus = "pending" | "approved" | "rejected" | "archived" | "closed";

export type ReferralStatus = "Pending" | "For Interview" | "Hired" | "Rejected" | "Withdrawn";

export type IntegrationStatus = "healthy" | "degraded" | "offline";

export type SecurityAlertLevel = "info" | "warning" | "critical";

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  trendLabel?: string;
}

export interface ActionQueueItem {
  id: string;
  title: string;
  count: number;
  ctaLabel: string;
  ctaHref: string;
  type: QueueType;
  priority: QueuePriority;
}

export type TrendBucket = "hour" | "day" | "month";

export interface TrendPoint {
  label: string;
  registrations: number;
  applications: number;
  referrals: number;
  placements: number;
}

export interface PeriodTotals {
  registrations: number;
  applications: number;
  referrals: number;
  placements: number;
  employerSignups: number;
  referralUpdates: number;
}

export interface StatusDistributionPoint {
  status: JobStatus;
  count: number;
}

export interface SectorDemandPoint {
  sector: string;
  vacancies: number;
}

export interface SkillDemandPoint {
  skill: string;
  count: number;
}

export interface RankedItem {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
}

export interface ReferralStatusSummaryItem {
  status: ReferralStatus;
  count: number;
}

export interface RecentReferralRow {
  id: string;
  slipNumber: string;
  jobseekerName: string;
  employerName: string;
  jobTitle: string;
  status: ReferralStatus;
  referredAt: string;
}

export interface PlacementSummary {
  totalPlacements: number;
  placementRate: number;
  pendingPlacements: number;
}

export interface EmployerFeedbackSummary {
  completed: number;
  pending: number;
  completionRate: number;
}

export interface ActivityLogItem {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  module: string;
}

export interface ErrorSummary {
  openCritical: number;
  openWarnings: number;
  lastIncidentAt: string | null;
}

export interface ApiIntegrationHealthItem {
  id: string;
  name: string;
  status: IntegrationStatus;
  latencyMs: number;
  lastCheckedAt: string;
}

export interface SecurityAlert {
  id: string;
  label: string;
  level: SecurityAlertLevel;
}

export interface LmiOverview {
  trend: TrendPoint[];
  trendBucket: TrendBucket;
  jobStatusDistribution: StatusDistributionPoint[];
  sectorDemand: SectorDemandPoint[];
  topSkills: SkillDemandPoint[];
}

export interface RankingsOverview {
  topEmployersByReferrals: RankedItem[];
  topEmployersByVacancies: RankedItem[];
  topBarangayHotspots: RankedItem[];
  topSectorsByPlacement: RankedItem[];
}

export interface ReferralMonitoringOverview {
  statusSummary: ReferralStatusSummaryItem[];
  recentReferrals: RecentReferralRow[];
  placementSummary: PlacementSummary;
  employerFeedback: EmployerFeedbackSummary;
}

export interface SystemOversightOverview {
  activityLog: ActivityLogItem[];
  errorSummary: ErrorSummary;
  apiHealth: ApiIntegrationHealthItem[];
  latestBackupAt: string | null;
  securityAlerts: SecurityAlert[];
}

export interface AdminDashboardData {
  generatedAt: string;
  period: DashboardPeriod;
  periodTotals: PeriodTotals;
  kpis: DashboardKpi[];
  actionRequired: ActionQueueItem[];
  lmi: LmiOverview;
  rankings: RankingsOverview;
  referralMonitoring: ReferralMonitoringOverview;
  systemOversight: SystemOversightOverview;
}
