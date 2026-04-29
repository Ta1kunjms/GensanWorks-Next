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
  status: "draft" | "pending" | "active" | "closed" | "archived" | "rejected";
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
  employerId: string;
  establishmentName: string | null;
  rejectionReason?: string | null;
  description?: string | null;
  vacancies?: number | null;
  startingSalary?: string | null;
  workSetup?: string | null;
  minimumEducationRequired?: string | null;
  yearsOfExperienceRequired?: number | null;
  industryCode?: string | null;
  employmentContractType?: string | null;
  location?: string | null;
};

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const [usersResult, employersResult, jobsResult, applicationsResult, pendingEmployersResult, pendingJobsResult, pendingAdminRequestsResult] = await Promise.all([
    supabaseAdmin.from("jobseekers").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("employers").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("applications").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("employers").select("*", { count: "exact", head: true }).eq("account_status", "pending"),
    supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("job_status", "pending"),
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
    .select("id, position_title, job_status, is_active, archived, created_at, employer_id, rejection_reason, description, vacancies, starting_salary, salary_period, work_setup, minimum_education_required, years_of_experience_required, industry_code, employment_contract_type, location, published_at", { count: "exact" });

  if (status && status !== "all") query = query.eq("job_status", status);
  if (search) query = query.or(`position_title.ilike.%${search}%,location.ilike.%${search}%,work_setup.ilike.%${search}%`);

  const sortColumnMapping: Record<string, string> = {
    positionTitle: "position_title",
    status: "job_status",
    createdAt: "created_at",
    created_at: "created_at",
  };

  const sortColumn = sortColumnMapping[sortBy] || sortBy;

  if (sortColumn !== "location") {
    query = query.order(sortColumn, { ascending: sortOrder === "asc" });
  } else {
    // If location sorting is requested but not supported on the table, default to created_at
    query = query.order("created_at", { ascending: sortOrder === "asc" });
  }
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
    status: row.job_status,
    isPublished: row.is_active,
    archived: row.archived,
    createdAt: row.created_at,
    employerId: row.employer_id,
    establishmentName: employerMap[row.employer_id] ?? null,
    rejectionReason: row.rejection_reason ?? null,
    description: row.description,
    vacancies: row.vacancies,
    startingSalary: row.starting_salary,
    salaryPeriod: row.salary_period,
    workSetup: row.work_setup,
    minimumEducationRequired: row.minimum_education_required,
    yearsOfExperienceRequired: row.years_of_experience_required,
    industryCode: row.industry_code,
    employmentContractType: row.employment_contract_type,
    location: row.location,
    publishedAt: row.published_at,
  }));

  return { jobs, total: count ?? 0 };
}

export async function updateJobStatus(
  jobId: string, 
  status: "draft" | "pending" | "active" | "closed" | "archived" | "rejected",
  rejectionReason?: string
): Promise<AdminJob> {
  const updateData: Record<string, unknown> = { job_status: status, updated_at: new Date().toISOString() };
  
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  if (status === "archived") { updateData.archived = true; updateData.is_active = false; }
  else if (status === "active") { updateData.is_active = true; updateData.archived = false; updateData.published_at = new Date().toISOString(); }
  else { updateData.is_active = false; updateData.archived = false; }

  const { data, error } = await supabaseAdmin.from("jobs").update(updateData).eq("id", jobId)
    .select("id, position_title, job_status, is_active, archived, created_at, employer_id, rejection_reason, description, vacancies, starting_salary, salary_period, work_setup, minimum_education_required, years_of_experience_required, industry_code, employment_contract_type, location, published_at").single();

  if (error) throw new Error(`Failed to update job: ${error.message}`);

  let establishmentName: string | null = null;
  if (data.employer_id) {
    const { data: emp } = await supabaseAdmin.from("employers").select("establishment_name").eq("id", data.employer_id).single();
    establishmentName = emp?.establishment_name ?? null;
  }

  return { 
    id: data.id, 
    positionTitle: data.position_title, 
    status: data.job_status, 
    isPublished: data.is_active, 
    archived: data.archived, 
    createdAt: data.created_at, 
    employerId: data.employer_id, 
    establishmentName,
    rejectionReason: data.rejection_reason ?? null,
    description: data.description,
    vacancies: data.vacancies,
    startingSalary: data.starting_salary,
    salaryPeriod: data.salary_period,
    workSetup: data.work_setup,
    minimumEducationRequired: data.minimum_education_required,
    yearsOfExperienceRequired: data.years_of_experience_required,
    industryCode: data.industry_code,
    employmentContractType: data.employment_contract_type,
    location: data.location,
    publishedAt: data.published_at,
  };
}

export async function fetchAdminAnalytics() {
  const JOB_STATUSES = ["draft", "pending", "active", "closed", "archived"];
  const APPLICATION_STATUSES = ["pending", "reviewed", "shortlisted", "interview", "hired", "rejected", "withdrawn"];

  // Build 6-month window
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [usersCount, employersCount, jobsResult, appsResult, jobTrends, appTrends] = await Promise.all([
    supabaseAdmin.from("jobseekers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("employers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("jobs").select("job_status"),
    supabaseAdmin.from("applications").select("status"),
    supabaseAdmin.from("jobs").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
    supabaseAdmin.from("applications").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
  ]);

  const jobCounts: Record<string, number> = {};
  (jobsResult.data ?? []).forEach(row => { jobCounts[row.job_status] = (jobCounts[row.job_status] ?? 0) + 1; });
  const appCounts: Record<string, number> = {};
  (appsResult.data ?? []).forEach(row => { appCounts[row.status] = (appCounts[row.status] ?? 0) + 1; });

  // Build monthly buckets
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() - 5 + i);
    return { label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), year: d.getFullYear(), month: d.getMonth() };
  });

  const jobsByMonth: Record<string, number> = {};
  (jobTrends.data ?? []).forEach(row => {
    const d = new Date(row.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    jobsByMonth[key] = (jobsByMonth[key] ?? 0) + 1;
  });

  const appsByMonth: Record<string, number> = {};
  (appTrends.data ?? []).forEach(row => {
    const d = new Date(row.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    appsByMonth[key] = (appsByMonth[key] ?? 0) + 1;
  });

  const totalJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0);
  const totalApps = Object.values(appCounts).reduce((a, b) => a + b, 0);

  return {
    overview: {
      usersCount: usersCount.count ?? 0,
      employersCount: employersCount.count ?? 0,
      jobsCount: totalJobs,
      applicationsCount: totalApps,
    },
    jobStatusCounts: JOB_STATUSES.map(s => ({ status: s, count: jobCounts[s] ?? 0 })),
    applicationStatusCounts: APPLICATION_STATUSES.map(s => ({ status: s, count: appCounts[s] ?? 0 })),
    monthlyTrends: monthLabels.map(({ label }) => ({
      month: label,
      jobs: jobsByMonth[label] ?? 0,
      applications: appsByMonth[label] ?? 0,
    })),
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

export async function fetchActiveJobs() {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, employer_id, starting_salary, location, work_setup")
    .eq("job_status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch active jobs: ${error.message}`);

  const employerIds = [...new Set(data.map(j => j.employer_id).filter(Boolean))];
  const employerMap: Record<string, string> = {};
  
  if (employerIds.length > 0) {
    const { data: empData } = await supabaseAdmin.from("employers").select("id, establishment_name").in("id", employerIds);
    empData?.forEach(e => { employerMap[e.id] = e.establishment_name ?? "Unknown"; });
  }

  return data.map(j => ({
    id: j.id,
    title: j.position_title,
    employerId: j.employer_id,
    employerName: employerMap[j.employer_id] ?? "Unknown",
    salary: j.starting_salary,
    location: j.location,
    workSetup: j.work_setup
  }));
}

export async function createReferral(payload: { jobId: string; jobseekerId: string }) {
  const { jobId, jobseekerId } = payload;

  // Get job details to get employer_id
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("employer_id, position_title")
    .eq("id", jobId)
    .single();

  if (jobError || !job) throw new Error("Job not found");

  const { data, error } = await supabaseAdmin
    .from("referrals")
    .insert({
      job_id: jobId,
      jobseeker_id: jobseekerId,
      employer_id: job.employer_id,
      status: "referred"
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create referral: ${error.message}`);

  // Notify Employer
  const { tryCreateNotification } = await import("./notifications");
  const { data: seeker } = await supabaseAdmin.from("jobseekers").select("first_name, last_name").eq("id", jobseekerId).single();
  const seekerName = seeker ? `${seeker.first_name} ${seeker.last_name}` : "A candidate";

  await tryCreateNotification({
    userId: job.employer_id,
    role: "employer",
    title: "New Candidate Referral",
    message: `${seekerName} has been referred to your job posting: ${job.position_title}.`,
    type: "referral",
    relatedId: data.id,
    relatedType: "referral"
  });

  return data;
}