"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";

type Job = {
  id: string;
  positionTitle: string;
  location: string;
  establishmentName: string | null;
};

type Application = {
  id: string;
  status: string | null;
  positionTitle: string | null;
  employerName: string | null;
};

export default function JobseekerDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobsRes, applicationsRes] = await Promise.all([
          fetch("/api/jobseeker/jobs?limit=6", { cache: "no-store" }),
          fetch("/api/jobseeker/applications", { cache: "no-store" }),
        ]);

        if (!jobsRes.ok || !applicationsRes.ok) {
          return;
        }

        const jobsData = (await jobsRes.json()) as { jobs: Job[] };
        const applicationsData = (await applicationsRes.json()) as {
          applications: Application[];
        };

        setJobs(jobsData.jobs ?? []);
        setApplications(applicationsData.applications ?? []);
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-600">Open Jobs</p>
          <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">My Applications</p>
          <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Pending Reviews</p>
          <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
        </Card>
      </div>

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
