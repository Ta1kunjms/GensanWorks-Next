export const dynamic = "force-dynamic";
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

type Job = {
  id: string;
  positionTitle: string;
  status: "draft" | "pending" | "active" | "closed" | "archived";
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
  employerId: string;
  establishmentName: string | null;
};

type ResponsePayload = {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
};

const STATUS_OPTIONS = ["all", "draft", "pending", "active", "closed", "archived"] as const;
const SORT_OPTIONS = ["createdAt", "positionTitle", "status", "location"] as const;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search, status, sortBy, sortOrder]);

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", String(pageSize));
      params.set("offset", String((page - 1) * pageSize));

      const response = await fetch(`/api/admin/jobs?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load jobs");
      }

      const payload = (await response.json()) as ResponsePayload;
      setJobs(payload.jobs ?? []);
      setTotal(payload.total ?? 0);
      setLastLoadedAt(new Date());
    } catch {
      setError("Unable to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [page, search, sortBy, sortOrder, status]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const updateStatus = async (jobId: string, nextStatus: Job["status"]) => {
    setUpdatingId(jobId);
    setError("");
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update job status");
      }

      await loadJobs();
    } catch {
      setError("Unable to update job status");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = jobs.filter((job) => job.status === "pending").length;
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const draftCount = jobs.filter((job) => job.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Jobs</h1>
          <p className="mt-1 text-sm text-slate-600">Review and moderate job postings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => void loadJobs()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" type="button" onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}>
            {sortOrder === "asc" ? "Oldest first" : "Newest first"}
          </button>
        </div>
      </div>

      {lastLoadedAt ? <p className="text-xs text-slate-500">Last updated: {formatDate(lastLoadedAt.toISOString())}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Draft</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{draftCount}</p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search jobs by title, employer, or location"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
        />
        <Link href="/admin/reports" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          Open reports
        </Link>
      </div>

      {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No jobs match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job</th>
                  <th className="px-4 py-3 font-semibold">Employer</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        className="font-semibold text-slate-950 hover:underline"
                        onClick={() => {
                          setSelectedJob(job);
                          setDetailsOpen(true);
                        }}
                      >
                        {job.positionTitle}
                      </button>
                      <div className="mt-1 text-slate-500">{job.id}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{job.establishmentName ?? `Employer ${job.employerId.slice(0, 8)}`}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{job.status}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailsOpen(true);
                          }}
                        >
                          Details
                        </Button>
                        <Button variant="outline" size="sm" type="button" asChild>
                          <Link href={`/admin/jobs/${job.id}/match`}>Match</Link>
                        </Button>
                        {job.status === "pending" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              disabled={updatingId === job.id}
                              onClick={() => void updateStatus(job.id, "active")}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={updatingId === job.id}
                              onClick={() => void updateStatus(job.id, "closed")}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Close
                            </Button>
                          </>
                        ) : null}
                        {(["draft", "pending", "active", "closed", "archived"] as const).map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            variant={job.status === nextStatus ? "default" : "outline"}
                            size="sm"
                            type="button"
                            disabled={updatingId === job.id}
                            onClick={() => void updateStatus(job.id, nextStatus)}
                          >
                            {nextStatus}
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedJob(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job details</DialogTitle>
            <DialogDescription>
              Review the posting before changing its moderation state.
            </DialogDescription>
          </DialogHeader>

          {selectedJob ? (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Position</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedJob.positionTitle}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Employer</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedJob.establishmentName ?? `Employer ${selectedJob.employerId.slice(0, 8)}`}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <p className="mt-1 font-semibold text-slate-950 capitalize">{selectedJob.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Published</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedJob.isPublished ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Archived</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedJob.archived ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatDate(selectedJob.createdAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}