"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { DashboardStatGrid } from "@/components/dashboard-cards";
import {
  fetchEmployerDashboardData,
  type EmployerJob as Job,
  type EmployerSummary as Summary,
} from "@/lib/dashboard-data";

export default function EmployerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchEmployerDashboardData();
        setSummary(data.summary);
        setJobs(data.jobs);
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

      <DashboardStatGrid
        items={[
          { label: "Total Jobs", value: summary?.jobsCount ?? 0 },
          { label: "Active Jobs", value: summary?.activeJobsCount ?? 0 },
          { label: "Applications", value: summary?.applicationsCount ?? 0 },
          { label: "Pending Applications", value: summary?.pendingApplicationsCount ?? 0 },
        ]}
      />

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
