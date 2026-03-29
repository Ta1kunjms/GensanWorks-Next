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

export type EmployerSummary = {
  jobsCount: number;
  activeJobsCount: number;
  applicationsCount: number;
  pendingApplicationsCount: number;
};

export type EmployerJob = {
  id: string;
  positionTitle: string;
  status: string | null;
  createdAt: string;
};

export type JobseekerJob = {
  id: string;
  positionTitle: string;
  location: string;
  establishmentName: string | null;
};

export type JobseekerApplication = {
  id: string;
  status: string | null;
  positionTitle: string | null;
  employerName: string | null;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchAdminDashboardData(
  statusFilter: string,
  fetcher: Fetcher = fetch
): Promise<{ summary: AdminSummary; jobs: AdminJob[] }> {
  const [summaryRes, jobsRes] = await Promise.all([
    fetcher("/api/admin/summary", { cache: "no-store" }),
    fetcher(
      `/api/admin/jobs${statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : ""}`,
      { cache: "no-store" }
    ),
  ]);

  if (!summaryRes.ok || !jobsRes.ok) {
    throw new Error("Unable to load admin data");
  }

  const summary = await parseJson<AdminSummary>(summaryRes);
  const jobsData = await parseJson<{ jobs: AdminJob[] }>(jobsRes);
  return { summary, jobs: jobsData.jobs ?? [] };
}

export async function fetchEmployerDashboardData(
  fetcher: Fetcher = fetch
): Promise<{ summary: EmployerSummary | null; jobs: EmployerJob[] }> {
  const [summaryRes, jobsRes] = await Promise.all([
    fetcher("/api/employer/summary", { cache: "no-store" }),
    fetcher("/api/employer/jobs", { cache: "no-store" }),
  ]);

  let summary: EmployerSummary | null = null;
  let jobs: EmployerJob[] = [];

  if (summaryRes.ok) {
    summary = await parseJson<EmployerSummary>(summaryRes);
  }

  if (jobsRes.ok) {
    const jobsData = await parseJson<{ jobs: EmployerJob[] }>(jobsRes);
    jobs = (jobsData.jobs ?? []).slice(0, 5);
  }

  return { summary, jobs };
}

export async function fetchJobseekerDashboardData(
  fetcher: Fetcher = fetch
): Promise<{ jobs: JobseekerJob[]; applications: JobseekerApplication[] }> {
  const [jobsRes, applicationsRes] = await Promise.all([
    fetcher("/api/jobseeker/jobs?limit=6", { cache: "no-store" }),
    fetcher("/api/jobseeker/applications", { cache: "no-store" }),
  ]);

  if (!jobsRes.ok || !applicationsRes.ok) {
    return { jobs: [], applications: [] };
  }

  const jobsData = await parseJson<{ jobs: JobseekerJob[] }>(jobsRes);
  const applicationsData = await parseJson<{ applications: JobseekerApplication[] }>(applicationsRes);

  return {
    jobs: jobsData.jobs ?? [],
    applications: applicationsData.applications ?? [],
  };
}