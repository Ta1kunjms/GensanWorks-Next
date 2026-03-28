"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";

type Summary = {
  usersCount: number;
  employersCount: number;
  jobsCount: number;
  applicationsCount: number;
  pendingEmployerCount: number;
  pendingAdminRequests: number;
  pendingJobs: number;
};

type AdminJob = {
  id: string;
  positionTitle: string;
  status: "draft" | "pending" | "active" | "closed" | "archived";
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
  employerId: string;
  establishmentName: string | null;
};

const STATUS_OPTIONS: AdminJob["status"][] = [
  "draft",
  "pending",
  "active",
  "closed",
  "archived",
];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryRes, jobsRes] = await Promise.all([
        fetch("/api/admin/summary", { cache: "no-store" }),
        fetch(
          `/api/admin/jobs${statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : ""}`,
          { cache: "no-store" }
        ),
      ]);

      if (!summaryRes.ok || !jobsRes.ok) {
        throw new Error("Unable to load admin data");
      }

      const summaryData = (await summaryRes.json()) as Summary;
      const jobsData = (await jobsRes.json()) as { jobs: AdminJob[] };

      setSummary(summaryData);
      setJobs(jobsData.jobs);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const cards = useMemo(
    () => [
      { label: "Job Seekers", value: summary?.usersCount ?? 0 },
      { label: "Employers", value: summary?.employersCount ?? 0 },
      { label: "Jobs", value: summary?.jobsCount ?? 0 },
      { label: "Applications", value: summary?.applicationsCount ?? 0 },
      { label: "Pending Employers", value: summary?.pendingEmployerCount ?? 0 },
      { label: "Pending Admin Requests", value: summary?.pendingAdminRequests ?? 0 },
      { label: "Pending Jobs", value: summary?.pendingJobs ?? 0 },
    ],
    [summary]
  );

  const updateJobStatus = async (jobId: string, status: AdminJob["status"]) => {
    setUpdatingJobId(jobId);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update job status");
      }

      await fetchData();
    } catch {
      setError("Could not update job status");
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-sm text-slate-600">Review platform metrics and moderate job postings.</p>
      </div>

      {error ? (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700 text-sm">{error}</Card>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Job Moderation</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading admin data...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No jobs found for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Employer</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">{job.positionTitle}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {job.establishmentName ?? `Employer ${job.employerId.slice(0, 8)}`}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{formatDate(job.createdAt)}</td>
                    <td className="py-2 pr-3 text-slate-700">{job.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_OPTIONS.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={job.status === status ? "default" : "outline"}
                            disabled={updatingJobId === job.id}
                            onClick={() => updateJobStatus(job.id, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AccountSecurityPanel />
    </div>
  );
}
