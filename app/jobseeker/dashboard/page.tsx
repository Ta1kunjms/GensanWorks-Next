"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { DashboardStatGrid } from "@/components/dashboard-cards";
import {
  fetchJobseekerDashboardData,
  type JobseekerApplication as Application,
  type JobseekerJob as Job,
} from "@/lib/dashboard-data";

export default function JobseekerDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJobseekerDashboardData();
        setJobs(data.jobs);
        setApplications(data.applications);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const pendingCount = useMemo(
    () => applications.filter((item) => item.status === "pending").length,
    [applications]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
        <p className="text-sm text-slate-600">Track your progress and discover opportunities.</p>
      </div>

      <DashboardStatGrid
        items={[
          { label: "Open Jobs", value: jobs.length },
          { label: "My Applications", value: applications.length },
          { label: "Pending Reviews", value: pendingCount },
        ]}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Latest Jobs</h3>
          <Link href="/jobseeker/jobs" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No active jobs yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded-md p-3">
                <Link href={`/jobseeker/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline">
                  {job.positionTitle}
                </Link>
                <p className="text-sm text-slate-600">
                  {job.establishmentName ?? "Unknown employer"} - {job.location}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AccountSecurityPanel />
    </div>
  );
}
