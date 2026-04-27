import { db } from "./db";

export async function getEmployerApplicationDetailById(employerId: string, applicationId: string) {
  const { data } = await db
    .from("applications")
    .select("*, jobs(*), users(*)")
    .eq("id", applicationId)
    .eq("employer_id", employerId)
    .single();
  return data;
}

export async function updateEmployerApplicationStatus(
  employerId: string,
  applicationId: string,
  updates: { status: string; feedback?: string }
) {
  const { data } = await db
    .from("applications")
    .update({
      status: updates.status,
      feedback: updates.feedback?.trim() || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("employer_id", employerId)
    .select("id, status, applicant_id, reviewed_at")
    .single();

  return data;
}

export async function getEmployerApplicationById(employerId: string, applicationId: string) {
  const { data } = await db
    .from("applications")
    .select("*, jobs(*)")
    .eq("id", applicationId)
    .eq("employer_id", employerId)
    .single();
  return data;
}

export async function getEmployerJobById(employerId: string, jobId: string) {
  const { data } = await db
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("employer_id", employerId)
    .single();
  return data;
}

export async function listEmployerJobs(employerId: string, filters?: { status?: string; search?: string; limit?: number; offset?: number }) {
  let query = db
    .from("jobs")
    .select("id, position_title, description, work_setup, starting_salary, job_status, is_active, archived, created_at, updated_at")
    .eq("employer_id", employerId);

  if (filters?.status) {
    query = query.eq("job_status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("position_title", `%${filters.search}%`);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 100) - 1);

  return data ?? [];
}

export async function deleteEmployerJob(employerId: string, jobId: string) {
  const { data, error } = await db
    .from("jobs")
    .update({
      archived: true,
      is_active: false,
      job_status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("employer_id", employerId)
    .select("id")
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function listEmployerApplications(
  employerId: string,
  filters: { limit: number; offset: number; status?: string; jobId?: string; search?: string }
) {
  let query = db
    .from("applications")
    .select("*, jobs(position_title)", { count: "exact" })
    .eq("employer_id", employerId);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.jobId) {
    query = query.eq("job_id", filters.jobId);
  }

  if (filters.search) {
    query = query.or(`applicant_name.ilike.%${filters.search}%,applicant_email.ilike.%${filters.search}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  return { applications: data ?? [], total: count ?? 0 };
}

export async function listEmployerJobApplications(employerId: string, jobId: string) {
  const { data: job } = await db
    .from("jobs")
    .select("id, position_title")
    .eq("id", jobId)
    .eq("employer_id", employerId)
    .single();

  if (!job) {
    return null;
  }

  const { data: applications } = await db
    .from("applications")
    .select("*, users(*)")
    .eq("job_id", jobId)
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  return { job, applications: applications ?? [] };
}

export async function getEmployerProfileById(employerId: string) {
  const { data } = await db
    .from("employers")
    .select("*")
    .eq("id", employerId)
    .single();
  return data;
}

export async function updateEmployerProfileById(employerId: string, updates: Record<string, unknown>) {
  const { data, error } = await db
    .from("employers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", employerId)
    .select()
    .single();
  return data;
}

export async function getEmployerSummary(employerId: string) {
  const { count: jobsCount } = await db.from("jobs").select("*", { count: "exact", head: true }).eq("employer_id", employerId);
  const { count: activeJobsCount } = await db.from("jobs").select("*", { count: "exact", head: true }).eq("employer_id", employerId).eq("job_status", "active");
  const { count: applicationsCount } = await db.from("applications").select("*", { count: "exact", head: true }).eq("employer_id", employerId);
  const { count: pendingApplicationsCount } = await db.from("applications").select("*", { count: "exact", head: true }).eq("employer_id", employerId).eq("status", "pending");

  return {
    jobsCount: jobsCount ?? 0,
    activeJobsCount: activeJobsCount ?? 0,
    applicationsCount: applicationsCount ?? 0,
    pendingApplicationsCount: pendingApplicationsCount ?? 0,
  };
}

export async function updateEmployerJobWorkflowStatus(
  employerId: string,
  jobId: string,
  status: "draft" | "pending" | "active" | "closed" | "archived"
) {
  const now = new Date().toISOString();
  const updateData = {
    job_status: status,
    archived: status === "archived",
    is_active: status === "active",
    updated_at: now,
  };

  const { data, error } = await db
    .from("jobs")
    .update(updateData)
    .eq("id", jobId)
    .eq("employer_id", employerId)
    .select("id, job_status, is_active, archived")
    .single();

  if (error || !data) return null;
  return data;
}