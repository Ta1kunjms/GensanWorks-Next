import { supabaseAdmin } from "./supabase";

export type AdminSummary = {
  usersCount: number;
  employersCount: number;
  jobsCount: number;
  applicationsCount: number;
  pendingEmployerCount: number;
  pendingAdminRequests: number;
  pendingJobs: number;
};

export type AdminJob = {
  id: string;
  positionTitle: string;
  status: "draft" | "pending" | "active" | "closed" | "archived";
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
  employerId: string;
  establishmentName: string | null;
};

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const [usersResult, employersResult, jobsResult, applicationsResult, pendingEmployersResult, pendingJobsResult, pendingAdminRequestsResult] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("employers").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("applications").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("employers").select("*", { count: "exact", head: true }).eq("account_status", "pending"),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("admin_access_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    usersCount: usersResult.count ?? 0,
    employersCount: employersResult.count ?? 0,
    jobsCount: jobsResult.count ?? 0,
    applicationsCount: applicationsResult.count ?? 0,
    pendingEmployerCount: pendingEmployersResult.count ?? 0,
    pendingJobs: pendingJobsResult.count ?? 0,
    pendingAdminRequests: pendingAdminRequestsResult.count ?? 0,
  };
}

export async function fetchAdminJobs(options?: {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}): Promise<{ jobs: AdminJob[]; total: number }> {
  const { status, search, sortBy = "created_at", sortOrder = "desc", limit = 20, offset = 0 } = options ?? {};

  let query = supabaseAdmin
    .from("jobs")
    .select("id, position_title, status, is_published, archived, created_at, employer_id", { count: "exact" });

  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`position_title.ilike.*${search}*,location.ilike.*${search}*`);

  query = query.order(sortBy, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);

  const jobRows = data ?? [];
  const employerIds = [...new Set(jobRows.map(j => j.employer_id).filter(Boolean))];

  const employerMap: Record<string, string> = {};
  if (employerIds.length > 0) {
    const { data: employerData } = await supabaseAdmin.from("employers").select("id, establishment_name").in("id", employerIds);
    employerData?.forEach(emp => { employerMap[emp.id] = emp.establishment_name ?? ""; });
  }

  const jobs: AdminJob[] = jobRows.map(row => ({
    id: row.id,
    positionTitle: row.position_title,
    status: row.status,
    isPublished: row.is_published,
    archived: row.archived,
    createdAt: row.created_at,
    employerId: row.employer_id,
    establishmentName: employerMap[row.employer_id] ?? null,
  }));

  return { jobs, total: count ?? 0 };
}

export async function updateJobStatus(jobId: string, status: "draft" | "pending" | "active" | "closed" | "archived"): Promise<AdminJob> {
  const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

  if (status === "archived") { updateData.archived = true; updateData.is_published = false; }
  else if (status === "active") { updateData.is_published = true; updateData.archived = false; updateData.published_at = new Date().toISOString(); }
  else { updateData.is_published = false; updateData.archived = false; }

  const { data, error } = await supabaseAdmin.from("jobs").update(updateData).eq("id", jobId)
    .select("id, position_title, status, is_published, archived, created_at, employer_id").single();

  if (error) throw new Error(`Failed to update job: ${error.message}`);

  let establishmentName: string | null = null;
  if (data.employer_id) {
    const { data: emp } = await supabaseAdmin.from("employers").select("establishment_name").eq("id", data.employer_id).single();
    establishmentName = emp?.establishment_name ?? null;
  }

  return { id: data.id, positionTitle: data.position_title, status: data.status, isPublished: data.is_published, archived: data.archived, createdAt: data.created_at, employerId: data.employer_id, establishmentName };
}

export async function fetchAdminAnalytics() {
  const JOB_STATUSES = ["draft", "pending", "active", "closed", "archived"];
  const APPLICATION_STATUSES = ["pending", "reviewed", "shortlisted", "interview", "hired", "rejected", "withdrawn"];

  const [jobsResult, appsResult] = await Promise.all([
    supabaseAdmin.from("jobs").select("status"),
    supabaseAdmin.from("applications").select("status"),
  ]);

  const jobCounts: Record<string, number> = {};
  (jobsResult.data ?? []).forEach(row => { jobCounts[row.status] = (jobCounts[row.status] ?? 0) + 1; });
  const appCounts: Record<string, number> = {};
  (appsResult.data ?? []).forEach(row => { appCounts[row.status] = (appCounts[row.status] ?? 0) + 1; });

  return {
    overview: { usersCount: 0, employersCount: 0, jobsCount: 0, applicationsCount: 0 },
    jobStatusCounts: JOB_STATUSES.map(s => ({ status: s, count: jobCounts[s] ?? 0 })),
    applicationStatusCounts: APPLICATION_STATUSES.map(s => ({ status: s, count: appCounts[s] ?? 0 })),
    monthlyTrends: Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - 5 + i);
      return { month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), jobs: 0, applications: 0 };
    }),
  };
}

export async function fetchReferralAnalytics() {
  const REFERRAL_STATUSES = ["Pending", "For Interview", "Hired", "Rejected", "Withdrawn"];

  const [refsResult, allRefs] = await Promise.all([
    supabaseAdmin.from("referrals").select("status, employer_id"),
    supabaseAdmin.from("referrals").select("*"),
  ]);

  const statusCounts: Record<string, number> = {};
  (refsResult.data ?? []).forEach(r => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1; });

  const employerCounts: Record<string, { count: number; name: string }> = {};
  (refsResult.data ?? []).forEach(r => {
    if (r.employer_id) {
      const e = employerCounts[r.employer_id];
      if (e) e.count++;
      else employerCounts[r.employer_id] = { count: 1, name: "" };
    }
  });

  const empIds = Object.keys(employerCounts);
  if (empIds.length > 0) {
    const { data: empData } = await supabaseAdmin.from("employers").select("id, establishment_name").in("id", empIds);
    (empData ?? []).forEach(e => { 
      const entry = employerCounts[e.id];
      if (entry) entry.name = e.establishment_name ?? ""; 
    });
  }

  const topEmployers = Object.entries(employerCounts)
    .map(([id, { count, name }]) => ({ employerId: id, employerName: name || "Unknown", count }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    totalReferrals: allRefs.data?.length ?? 0,
    referralsByStatus: REFERRAL_STATUSES.map(s => ({ status: s, count: statusCounts[s] ?? 0 })),
    topEmployers,
  };
}