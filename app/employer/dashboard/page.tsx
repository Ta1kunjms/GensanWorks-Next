"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";

type Summary = {
  jobsCount: number;
  activeJobsCount: number;
  applicationsCount: number;
  pendingApplicationsCount: number;
};

type Job = {
  id: string;
  positionTitle: string;
  status: string | null;
  createdAt: string;
};

export default function EmployerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, jobsRes] = await Promise.all([
          fetch("/api/employer/summary", { cache: "no-store" }),
          fetch("/api/employer/jobs", { cache: "no-store" }),
        ]);

        if (summaryRes.ok) {
          const summaryData = (await summaryRes.json()) as Summary;
          setSummary(summaryData);
        }

        if (jobsRes.ok) {
          const jobsData = (await jobsRes.json()) as { jobs: Job[] };
          setJobs((jobsData.jobs ?? []).slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Employer Dashboard</h2>
        <p className="text-sm text-slate-600">Monitor your postings and applicant activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-600">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.jobsCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Active Jobs</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.activeJobsCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Applications</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.applicationsCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Pending Applications</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.pendingApplicationsCount ?? 0}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Recent Job Posts</h3>
          <Link href="/employer/jobs" className="text-sm text-blue-600 hover:underline">
            Manage jobs
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No jobs posted yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded-md p-3">
                <p className="font-medium text-slate-900">{job.positionTitle}</p>
                <p className="text-sm text-slate-600">Status: {job.status ?? "draft"}</p>
                <Link
                  href={`/employer/jobs/${job.id}/applications`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View applications
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AccountSecurityPanel />
    </div>
  );
}
