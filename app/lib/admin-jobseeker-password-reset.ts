type ResetPasswordOptions = {
  jobseekerId: string;
  newPassword: string;
  req?: Request;
};

type JobseekerRecord = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type ResetJobseekerPasswordDeps = {
  getJobseekerById: (jobseekerId: string) => Promise<{
    data: JobseekerRecord | null;
    error: { message?: string } | null;
  }>;
  updateUserPassword: (userId: string, password: string) => Promise<{
    data?: { user?: { id: string } } | null;
    error: { message?: string } | null;
  }>;
};

export async function resetJobseekerPassword(
  { jobseekerId, newPassword }: ResetPasswordOptions,
  deps: ResetJobseekerPasswordDeps
) {
  const { data: jobseeker, error: jobseekerError } = await deps.getJobseekerById(jobseekerId);

  if (jobseekerError || !jobseeker) {
    return {
      ok: false as const,
      status: 404,
      error: "Job seeker not found",
    };
  }

  const { data, error } = await deps.updateUserPassword(jobseekerId, newPassword);

  if (error || !data?.user) {
    return {
      ok: false as const,
      status: 400,
      error: error?.message || "Failed to update password",
    };
  }

  return {
    ok: true as const,
    jobseeker,
  };
}
