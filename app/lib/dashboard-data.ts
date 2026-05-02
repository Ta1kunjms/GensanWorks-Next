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
  hiredCount: number;
  rejectedCount: number;
};

export type EmployerJob = {
  id: string;
  positionTitle: string;
  status: string | null;
  createdAt: string;
};

export type EmployerApplicationPreview = {
  id: string;
  applicantName: string | null;
  applicantEmail: string | null;
  status: string | null;
  createdAt: string;
  job?: {
    id: string;
    positionTitle: string | null;
  } | null;
  jobId?: string | null;
};

export type JobseekerJob = {
  id: string;
  positionTitle: string;
  location?: string;
  establishmentName?: string | null;
  employmentType?: string;
  employerName?: string;
  city?: string;
  province?: string;
  startingSalary?: string | number | null;
  createdAt?: string;
};

export type JobseekerApplication = {
  id: string;
  status: string | null;
  source?: string | null;
  positionTitle: string | null;
  employerName: string | null;
  submittedAt?: string;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function unwrapApiData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeWrapped = payload as { data?: T };
  if (Object.prototype.hasOwnProperty.call(maybeWrapped, "data")) {
    return maybeWrapped.data ?? null;
  }

  return payload as T;
}

export async function fetchAdminDashboardData(
  statusFilter: string,
  fetcher: Fetcher = fetch
): Promise<{ summary: AdminSummary; jobs: AdminJob[] }> {
  const summaryRes = await fetcher("/api/admin/summary");
  const jobsRes = await fetcher(
    `/api/admin/jobs${statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : ""}`
  );

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
    const payload = await parseJson<unknown>(summaryRes);
    summary = unwrapApiData<EmployerSummary>(payload);
  }

  if (jobsRes.ok) {
    const payload = await parseJson<unknown>(jobsRes);
    const jobsData = unwrapApiData<{ jobs?: EmployerJob[]; results?: EmployerJob[] }>(payload);
    jobs = (jobsData?.jobs ?? jobsData?.results ?? []).slice(0, 5);
  }

  return { summary, jobs };
}

export async function fetchEmployerApplicationsPreview(
  fetcher: Fetcher = fetch,
  limit = 6
): Promise<EmployerApplicationPreview[]> {
  const response = await fetcher(`/api/employer/applications?limit=${limit}&offset=0`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = await parseJson<unknown>(response);
  const data = unwrapApiData<{ applications?: EmployerApplicationPreview[]; results?: EmployerApplicationPreview[] }>(payload);
  return (data?.applications ?? data?.results ?? []).slice(0, limit);
}

export async function fetchJobseekerDashboardData(
  fetcher: Fetcher = fetch
): Promise<{ 
  jobs: JobseekerJob[]; 
  applications: JobseekerApplication[];
  profile?: { 
    profileCompleteness: number; 
    profileComplete: boolean;
    job_seeking_status?: string;
  };
}> {
  const [jobsRes, applicationsRes, profileRes] = await Promise.all([
    fetcher("/api/jobseeker/jobs?limit=6", { cache: "no-store" }),
    fetcher("/api/jobseeker/applications", { cache: "no-store" }),
    fetcher("/api/jobseeker/profile", { cache: "no-store" }),
  ]);

  if (!jobsRes.ok || !applicationsRes.ok) {
    return { jobs: [], applications: [] };
  }

  const jobsData = await parseJson<{ jobs: JobseekerJob[] }>(jobsRes);
  const applicationsData = await parseJson<{ applications: JobseekerApplication[] }>(applicationsRes);
  const profileData = profileRes.ok ? await parseJson<{ profile: any }> (profileRes) : null;

  return {
    jobs: jobsData.jobs ?? [],
    applications: applicationsData.applications ?? [],
    profile: profileData?.profile,
  };
}