import { buildLegacyActivities } from "@/api/admin/activities/_events";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  ActionQueueItem,
  AdminDashboardData,
  ApiIntegrationHealthItem,
  JobStatus,
  RankedItem,
  ReferralStatus,
  SecurityAlert,
} from "./types";

type AnyRecord = Record<string, unknown>;

const INDUSTRY_LABELS: Record<string, string> = {
  "01": "Agriculture",
  "02": "Mining",
  "03": "Manufacturing",
  "04": "Electricity",
  "05": "Water",
  "06": "Construction",
  "07": "Retail",
  "08": "Logistics",
  "09": "Hospitality",
  "10": "Information",
  "11": "Finance",
  "12": "Real Estate",
  "13": "Professional Services",
  "14": "Administrative Services",
  "15": "Education",
  "16": "Health",
  "17": "Other Services",
};

const REFERRAL_STATUSES: ReferralStatus[] = ["Pending", "For Interview", "Hired", "Rejected", "Withdrawn"];
const JOB_DISTRIBUTION_STATUSES: JobStatus[] = ["pending", "approved", "rejected", "archived", "closed"];

function monthKey(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short" });
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReferralStatus(value: unknown): ReferralStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "for interview" || normalized === "interview") return "For Interview";
  if (normalized === "hired") return "Hired";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "withdrawn") return "Withdrawn";
  return "Pending";
}

function normalizeJobStatus(value: unknown): JobStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "active" || normalized === "approved") return "approved";
  if (normalized === "rejected" || normalized === "suspended") return "rejected";
  if (normalized === "archived") return "archived";
  if (normalized === "closed") return "closed";
  return "pending";
}

function pickDate(record: AnyRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

async function queryRows(table: string, select = "*", since?: Date): Promise<AnyRecord[]> {
  let query: any = supabaseAdmin.from(table).select(select as any);
  if (since) {
    query = query.gte("created_at", since.toISOString());
  }
  const { data, error } = await query;
  if (error) {
    console.warn(`[dashboard] Failed querying ${table}: ${error.message}`);
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data as unknown as AnyRecord[];
}

async function queryCount(table: string, filter?: (query: any) => any) {
  let query: any = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  if (filter) {
    query = filter(query);
  }
  const { count, error } = await query;
  if (error) {
    console.warn(`[dashboard] Failed count ${table}: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

function parseSkillTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        if (entry && typeof entry === "object") {
          const maybeName = (entry as AnyRecord).name ?? (entry as AnyRecord).skill;
          return typeof maybeName === "string" ? [maybeName] : [];
        }
        return [];
      })
      .map((token) => token.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  }

  return [];
}

function buildMonthRange(length: number): string[] {
  const now = new Date();
  return Array.from({ length }, (_, index) => {
    const point = new Date(now.getFullYear(), now.getMonth() - (length - 1 - index), 1);
    return point.toLocaleDateString("en-US", { month: "short" });
  });
}

async function buildApiHealth(): Promise<ApiIntegrationHealthItem[]> {
  const probes: Array<{ id: string; name: string; run: () => Promise<void> }> = [
    {
      id: "api-supabase-auth",
      name: "Supabase Auth",
      run: async () => {
        await supabaseAdmin.from("auth_lifecycle_tokens").select("id", { count: "exact", head: true });
      },
    },
    {
      id: "api-supabase-db",
      name: "Supabase Database",
      run: async () => {
        await supabaseAdmin.from("jobs").select("id", { count: "exact", head: true });
      },
    },
    {
      id: "api-ai-matching",
      name: "AI Matching Service",
      run: async () => {
        await supabaseAdmin.from("skill_suggestions").select("id", { count: "exact", head: true });
      },
    },
    {
      id: "api-email-delivery",
      name: "Email Delivery",
      run: async () => {
        await supabaseAdmin.from("account_email_verifications").select("id", { count: "exact", head: true });
      },
    },
  ];

  const now = new Date().toISOString();
  const results: ApiIntegrationHealthItem[] = [];

  for (const probe of probes) {
    const start = Date.now();
    try {
      await probe.run();
      const latencyMs = Date.now() - start;
      results.push({
        id: probe.id,
        name: probe.name,
        status: latencyMs > 800 ? "degraded" : "healthy",
        latencyMs,
        lastCheckedAt: now,
      });
    } catch {
      const latencyMs = Date.now() - start;
      results.push({
        id: probe.id,
        name: probe.name,
        status: "offline",
        latencyMs,
        lastCheckedAt: now,
      });
    }
  }

  return results;
}

async function getLatestBackupTimestamp(generatedAt: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("backups")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.created_at) {
    return generatedAt;
  }

  return data.created_at;
}

export type DashboardPeriod = "day" | "week" | "month" | "year";

export function computeSinceDate(period: DashboardPeriod): Date {
  const now = new Date();
  switch (period) {
    case "day": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return d;
    }
    case "week": {
      const day = now.getDay(); // 0=Sun,1=Mon,...
      const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
      return d;
    }
    case "year": {
      return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
    case "month":
    default: {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
  }
}

export async function getAdminDashboardData(options?: { since?: Date }): Promise<AdminDashboardData> {
  const generatedAt = new Date().toISOString();
  const since = options?.since;

  const [
    jobseekers,
    employers,
    jobs,
    applications,
    referrals,
    referralSlips,
    auditLogs,
    adminAccessRequests,
    deletionRequests,
  ] = await Promise.all([
    queryRows("jobseekers", "id, created_at, first_name, last_name, email, phone, barangay, city, education_level, employment_status, other_skills", since),
    queryRows("employers", "id, establishment_name, account_status, created_at", since),
    queryRows("jobs", "id, employer_id, position_title, vacancies, industry_code, created_at, status, job_status, is_active, archived, main_skill_desired", since),
    queryRows("applications", "id, status, created_at, updated_at", since),
    queryRows("referrals", "id, status, created_at, updated_at, job_id, employer_id, jobseeker_id, applicant_id", since),
    queryRows("referral_slips", "id, slip_number, applicant_id, job_id, issued_at, created_at", since),
    queryRows("audit_logs", "id, created_at, role, action, resource_type, user_id", since),
    queryRows("admin_access_requests", "id, status, created_at"),
    queryRows("account_deletion_requests", "id, status, delete_after"),
  ]);

  const months = buildMonthRange(6);
  const registrationsByMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));
  const applicationsByMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));
  const referralsByMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));
  const placementsByMonth: Record<string, number> = Object.fromEntries(months.map((month) => [month, 0]));

  for (const row of jobseekers) {
    const key = monthKey(pickDate(row, ["created_at"]));
    if (key && registrationsByMonth[key] !== undefined) registrationsByMonth[key] += 1;
  }

  for (const row of applications) {
    const key = monthKey(pickDate(row, ["created_at", "updated_at"]));
    if (key && applicationsByMonth[key] !== undefined) applicationsByMonth[key] += 1;
  }

  for (const row of referrals) {
    const date = pickDate(row, ["created_at", "updated_at"]);
    const key = monthKey(date);
    if (key && referralsByMonth[key] !== undefined) referralsByMonth[key] += 1;
    if (normalizeReferralStatus(row.status) === "Hired" && key && placementsByMonth[key] !== undefined) {
      placementsByMonth[key] += 1;
    }
  }

  const referralsByStatus = REFERRAL_STATUSES.reduce<Record<ReferralStatus, number>>(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    { Pending: 0, "For Interview": 0, Hired: 0, Rejected: 0, Withdrawn: 0 }
  );

  for (const referral of referrals) {
    const status = normalizeReferralStatus(referral.status);
    referralsByStatus[status] += 1;
  }

  const jobsById = new Map(jobs.map((job) => [String(job.id), job]));
  const employersById = new Map(employers.map((employer) => [String(employer.id), employer]));
  const jobseekersById = new Map(jobseekers.map((jobseeker) => [String(jobseeker.id), jobseeker]));

  const jobStatusCounts = JOB_DISTRIBUTION_STATUSES.reduce<Record<JobStatus, number>>(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    { pending: 0, approved: 0, rejected: 0, archived: 0, closed: 0 }
  );

  const sectorDemandMap = new Map<string, number>();
  const topSkillsMap = new Map<string, number>();
  const employerReferralsMap = new Map<string, number>();
  const employerVacancyMap = new Map<string, number>();
  const barangayPlacementMap = new Map<string, number>();
  const sectorPlacementMap = new Map<string, number>();
  const jobReferralCountMap = new Map<string, number>();

  for (const job of jobs) {
    const status = normalizeJobStatus(job.job_status ?? job.status);
    jobStatusCounts[status] += 1;

    const employerId = String(job.employer_id ?? "");
    const vacancies = typeof job.vacancies === "number" ? job.vacancies : Number(job.vacancies ?? 1) || 1;

    if (status === "approved") {
      const industryCode = normalizeString(job.industry_code) || "99";
      const label = INDUSTRY_LABELS[industryCode] ?? "Other Services";
      sectorDemandMap.set(label, (sectorDemandMap.get(label) ?? 0) + vacancies);
    }

    if (employerId && (status === "approved" || normalizeJobStatus(job.job_status ?? job.status) === "approved")) {
      employerVacancyMap.set(employerId, (employerVacancyMap.get(employerId) ?? 0) + vacancies);
    }

    for (const token of parseSkillTokens(job.main_skill_desired)) {
      topSkillsMap.set(token, (topSkillsMap.get(token) ?? 0) + 1);
    }
  }

  for (const jobseeker of jobseekers) {
    for (const token of parseSkillTokens(jobseeker.other_skills)) {
      topSkillsMap.set(token, (topSkillsMap.get(token) ?? 0) + 1);
    }
  }

  const slipByReferralKey = new Map<string, AnyRecord>();
  for (const slip of referralSlips) {
    const key = `${String(slip.applicant_id ?? "")}:${String(slip.job_id ?? "")}`;
    const existing = slipByReferralKey.get(key);
    const currentDate = new Date(String(slip.issued_at ?? slip.created_at ?? 0)).getTime();
    const existingDate = existing ? new Date(String(existing.issued_at ?? existing.created_at ?? 0)).getTime() : -1;
    if (!existing || currentDate > existingDate) {
      slipByReferralKey.set(key, slip);
    }
  }

  for (const referral of referrals) {
    const employerId = String(referral.employer_id ?? "");
    if (employerId) {
      employerReferralsMap.set(employerId, (employerReferralsMap.get(employerId) ?? 0) + 1);
    }

    const jobId = String(referral.job_id ?? "");
    if (jobId) {
      jobReferralCountMap.set(jobId, (jobReferralCountMap.get(jobId) ?? 0) + 1);
    }

    if (normalizeReferralStatus(referral.status) === "Hired") {
      const job = jobsById.get(jobId);
      if (job) {
        const industryCode = normalizeString(job.industry_code) || "99";
        const label = INDUSTRY_LABELS[industryCode] ?? "Other Services";
        sectorPlacementMap.set(label, (sectorPlacementMap.get(label) ?? 0) + 1);
      }

      const jobseekerId = String(referral.jobseeker_id ?? referral.applicant_id ?? "");
      const seeker = jobseekersById.get(jobseekerId);
      const barangay = normalizeString(seeker?.barangay) || "Unspecified";
      barangayPlacementMap.set(barangay, (barangayPlacementMap.get(barangay) ?? 0) + 1);
    }
  }

  const recentReferrals = referrals
    .slice()
    .sort((left, right) => {
      const leftDate = new Date(String(pickDate(left, ["created_at", "updated_at"]) ?? 0)).getTime();
      const rightDate = new Date(String(pickDate(right, ["created_at", "updated_at"]) ?? 0)).getTime();
      return rightDate - leftDate;
    })
    .slice(0, 8)
    .map((referral) => {
      const jobId = String(referral.job_id ?? "");
      const seekerId = String(referral.jobseeker_id ?? referral.applicant_id ?? "");
      const slip = slipByReferralKey.get(`${seekerId}:${jobId}`);
      const seeker = jobseekersById.get(seekerId);
      const employer = employersById.get(String(referral.employer_id ?? ""));
      const job = jobsById.get(jobId);
      return {
        id: String(referral.id ?? `${jobId}-${seekerId}`),
        slipNumber: normalizeString(slip?.slip_number) || "N/A",
        jobseekerName:
          `${normalizeString(seeker?.first_name)} ${normalizeString(seeker?.last_name)}`.trim() || normalizeString(seeker?.email) || "Unknown",
        employerName: normalizeString(employer?.establishment_name) || "Unknown",
        jobTitle: normalizeString(job?.position_title) || "Untitled role",
        status: normalizeReferralStatus(referral.status),
        referredAt: pickDate(referral, ["created_at", "updated_at"]) ?? generatedAt,
      };
    });

  const incompleteProfiles = jobseekers.filter((item) => {
    const checks = [
      normalizeString(item.first_name),
      normalizeString(item.last_name),
      normalizeString(item.email),
      normalizeString(item.phone),
      normalizeString(item.barangay),
      normalizeString(item.education_level),
    ];
    return checks.filter(Boolean).length < 5;
  }).length;

  const aiMatchReady = jobs.filter((job) => {
    const status = normalizeJobStatus(job.job_status ?? job.status);
    if (status !== "approved") return false;
    return (jobReferralCountMap.get(String(job.id ?? "")) ?? 0) === 0;
  }).length;

  const pendingEmployerApprovals = employers.filter(
    (employer) => normalizeString(employer.account_status).toLowerCase() === "pending"
  ).length;

  const pendingJobs = jobs.filter((job) => normalizeJobStatus(job.job_status ?? job.status) === "pending").length;
  const pendingReferralUpdates = referralsByStatus.Pending + referralsByStatus["For Interview"];

  const totalReferrals = referrals.length;
  const totalPlacements = referralsByStatus.Hired;
  const placementRate = totalReferrals > 0 ? Math.round((totalPlacements / totalReferrals) * 100) : 0;
  const completedOutcomes = referralsByStatus.Hired + referralsByStatus.Rejected + referralsByStatus.Withdrawn;
  const pendingOutcomes = referralsByStatus.Pending + referralsByStatus["For Interview"];
  const completionRate = totalReferrals > 0 ? Math.round((completedOutcomes / totalReferrals) * 100) : 0;

  const monthlyTrends = months.map((month) => ({
    month,
    registrations: registrationsByMonth[month] ?? 0,
    applications: applicationsByMonth[month] ?? 0,
    referrals: referralsByMonth[month] ?? 0,
    placements: placementsByMonth[month] ?? 0,
  }));

  const mapTopItems = (entries: Array<[string, number]>, makeItem: (entry: [string, number], index: number) => RankedItem) =>
    entries
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(makeItem);

  const topEmployersByReferrals = mapTopItems(Array.from(employerReferralsMap.entries()), ([employerId, value], index) => ({
    id: `emp-ref-${employerId}-${index}`,
    label: normalizeString(employersById.get(employerId)?.establishment_name) || "Unknown Employer",
    value,
    sublabel: "Referral slips generated",
  }));

  const topEmployersByVacancies = mapTopItems(Array.from(employerVacancyMap.entries()), ([employerId, value], index) => ({
    id: `emp-vac-${employerId}-${index}`,
    label: normalizeString(employersById.get(employerId)?.establishment_name) || "Unknown Employer",
    value,
    sublabel: "Active vacancies",
  }));

  const topBarangayHotspots = mapTopItems(Array.from(barangayPlacementMap.entries()), ([barangay, value], index) => ({
    id: `barangay-${index}`,
    label: barangay,
    value,
    sublabel: "Placements",
  }));

  const topSectorsByPlacement = mapTopItems(Array.from(sectorPlacementMap.entries()), ([sector, value], index) => ({
    id: `sector-${index}`,
    label: sector,
    value,
    sublabel: "Placements",
  }));

  const activityLog = auditLogs
    .slice()
    .sort((left, right) => {
      const leftDate = new Date(String(left.created_at ?? 0)).getTime();
      const rightDate = new Date(String(right.created_at ?? 0)).getTime();
      return rightDate - leftDate;
    })
    .slice(0, 12)
    .map((log) => ({
      id: String(log.id ?? `${log.created_at}`),
      occurredAt: pickDate(log, ["created_at"]) ?? generatedAt,
      actor: normalizeString(log.role) || "system",
      action: normalizeString(log.action) || "unknown_action",
      module: normalizeString(log.resource_type) || "system",
    }));

  if (activityLog.length === 0) {
    const fallbackActivities = await buildLegacyActivities(20);
    for (const activity of fallbackActivities.slice(0, 12)) {
      activityLog.push({
        id: activity.id,
        occurredAt: activity.createdAt,
        actor: activity.userId || "system",
        action: activity.action,
        module: activity.resourceType,
      });
    }
  }

  const securityAlerts: SecurityAlert[] = [];
  const pendingAccessRequests = adminAccessRequests.filter(
    (request) => normalizeString(request.status).toLowerCase() === "pending"
  ).length;
  if (pendingAccessRequests > 0) {
    securityAlerts.push({
      id: "alert-pending-access",
      label: `${pendingAccessRequests} pending admin access request(s)`,
      level: pendingAccessRequests >= 10 ? "critical" : "warning",
    });
  }

  const overdueDeletionRequests = deletionRequests.filter((request) => {
    const status = normalizeString(request.status).toLowerCase();
    if (status !== "pending") return false;
    const deleteAfter = pickDate(request, ["delete_after"]);
    return deleteAfter ? new Date(deleteAfter).getTime() < Date.now() : false;
  }).length;
  if (overdueDeletionRequests > 0) {
    securityAlerts.push({
      id: "alert-overdue-deletion",
      label: `${overdueDeletionRequests} overdue account deletion request(s)`,
      level: "critical",
    });
  }

  if (securityAlerts.length === 0) {
    securityAlerts.push({
      id: "alert-system-clear",
      label: "No critical security queue items detected.",
      level: "info",
    });
  }

  const openCritical = securityAlerts.filter((alert) => alert.level === "critical").length;
  const openWarnings = securityAlerts.filter((alert) => alert.level === "warning").length;
  const lastIncidentAt = activityLog.length > 0 ? activityLog[0]?.occurredAt ?? null : null;

  const apiHealth = await buildApiHealth();
  const latestBackupAt = await getLatestBackupTimestamp(generatedAt);

  const actionRequired: ActionQueueItem[] = [
    {
      id: "pending-employers",
      title: "Pending employer approvals",
      count: pendingEmployerApprovals,
      ctaLabel: "Review Employers",
      ctaHref: "/admin/employer-approvals",
      type: "employer_approval",
      priority: pendingEmployerApprovals >= 10 ? "high" : "medium",
    },
    {
      id: "pending-jobs",
      title: "Pending job posting approvals",
      count: pendingJobs,
      ctaLabel: "Moderate Jobs",
      ctaHref: "/admin/jobs",
      type: "job_approval",
      priority: pendingJobs >= 15 ? "high" : "medium",
    },
    {
      id: "pending-referrals",
      title: "Referrals pending status update",
      count: pendingReferralUpdates,
      ctaLabel: "Update Referrals",
      ctaHref: "/admin/referrals",
      type: "referral_update",
      priority: pendingReferralUpdates >= 25 ? "high" : "medium",
    },
    {
      id: "incomplete-profiles",
      title: "Incomplete jobseeker profiles",
      count: incompleteProfiles,
      ctaLabel: "Review Jobseekers",
      ctaHref: "/admin/applicants",
      type: "jobseeker_profile_review",
      priority: incompleteProfiles >= 50 ? "high" : "medium",
    },
    {
      id: "ai-match-ready",
      title: "Jobs ready for AI matching trigger",
      count: aiMatchReady,
      ctaLabel: "Run AI Match",
      ctaHref: "/admin/matching",
      type: "ai_match_ready",
      priority: aiMatchReady >= 20 ? "medium" : "low",
    },
  ];

  // For period-relative trend labels, count within the since window
  const periodSince = since ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const employersThisPeriod = await queryCount("employers", (query) =>
    query.gte("created_at", periodSince.toISOString())
  );

  const referralsThisPeriod = await queryCount("referrals", (query) =>
    query.gte("updated_at", periodSince.toISOString())
  );

  return {
    generatedAt,
    kpis: [
      {
        id: "jobseekers",
        label: "Total Job Seekers",
        value: jobseekers.length,
        trendLabel: `${monthlyTrends[5]?.registrations ?? 0} registered this period`,
      },
      {
        id: "applications",
        label: "Total Applications",
        value: applications.length,
        trendLabel: `${monthlyTrends[5]?.applications ?? 0} applications this period`,
      },
      {
        id: "employers",
        label: "Total Employers",
        value: employers.length,
        trendLabel: `${employersThisPeriod} new this period`,
      },
      {
        id: "referrals",
        label: "Total Referrals",
        value: totalReferrals,
        trendLabel: `${referralsThisPeriod} updated this period`,
      },
      {
        id: "vacancies",
        label: "Active Vacancies",
        value: jobs.filter((job) => normalizeJobStatus(job.job_status ?? job.status) === "approved").length,
        trendLabel: `${pendingJobs} pending moderation this period`,
      },
      {
        id: "success_rate",
        label: "Referral Success Rate",
        value: placementRate,
        trendLabel: "Hired / total referrals this period",
      },
    ],
    actionRequired,
    lmi: {
      monthlyTrends,
      jobStatusDistribution: JOB_DISTRIBUTION_STATUSES.map((status) => ({
        status,
        count: jobStatusCounts[status],
      })),
      sectorDemand: Array.from(sectorDemandMap.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([sector, vacancies]) => ({ sector, vacancies })),
      topSkills: Array.from(topSkillsMap.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count })),
    },
    rankings: {
      topEmployersByReferrals,
      topEmployersByVacancies,
      topBarangayHotspots,
      topSectorsByPlacement,
    },
    referralMonitoring: {
      statusSummary: REFERRAL_STATUSES.map((status) => ({
        status,
        count: referralsByStatus[status],
      })),
      recentReferrals,
      placementSummary: {
        totalPlacements,
        placementRate,
        pendingPlacements: pendingOutcomes,
      },
      employerFeedback: {
        completed: completedOutcomes,
        pending: pendingOutcomes,
        completionRate,
      },
    },
    systemOversight: {
      activityLog,
      errorSummary: {
        openCritical,
        openWarnings,
        lastIncidentAt,
      },
      apiHealth,
      latestBackupAt,
      securityAlerts,
    },
  };
}

 
