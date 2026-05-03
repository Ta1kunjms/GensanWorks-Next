"use client";
export const dynamic = "force-dynamic";

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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { 
  CheckCircle2, 
  RefreshCw, 
  XCircle, 
  Trash2, 
  Info, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  Building2,
  Brain
} from "lucide-react";

type Job = {
  id: string;
  positionTitle: string;
  status: "draft" | "pending" | "active" | "closed" | "archived" | "rejected" | "suspended";
  isPublished: boolean;
  archived: boolean;
  createdAt: string;
  employerId: string;
  establishmentName: string | null;
  rejectionReason?: string | null;
  description?: string | null;
  vacancies?: number | null;
  startingSalary?: string | null;
  workSetup?: string | null;
  minimumEducationRequired?: string | null;
  yearsOfExperienceRequired?: number | null;
  industryCode?: string | null;
  employmentContractType?: string | null;
  location?: string | null;
};

type ResponsePayload = {
  success: boolean;
  data: Job[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const STATUS_OPTIONS = ["all", "suspended", "pending", "active", "closed", "archived", "rejected"] as const;
const SORT_OPTIONS = [
  { value: "createdAt", label: "Date Created" },
  { value: "positionTitle", label: "Position Title" },
  { value: "status", label: "Status" },
  { value: "location", label: "Location" },
] as const;

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]["value"]>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
      setJobs(payload.data ?? []);
      setTotal(payload.pagination?.total ?? 0);
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

  const updateStatus = async (jobId: string, nextStatus: Job["status"], reason?: string) => {
    setUpdatingId(jobId);
    setError("");
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, rejectionReason: reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to update job status");
      }

      await loadJobs();
      setRejectionOpen(false);
      setRejectionReason("");
    } catch {
      setError("Unable to update job status");
    } finally {
      setUpdatingId(null);
    }
  };

  const StatusBadge = ({ status }: { status: Job["status"] }) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pending Review</Badge>;
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
      case "rejected":
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">Rejected</Badge>;
      case "archived":
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">Archived</Badge>;
      case "suspended":
        return <Badge variant="outline" className="text-slate-500">Suspended</Badge>;
      case "closed":
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = jobs.filter((job) => job.status === "pending").length;
  const activeCount = jobs.filter((job) => job.status === "active").length;
  const suspendedCount = jobs.filter((job) => job.status === "suspended").length;

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
          <select 
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" 
            value={sortBy} 
            onChange={(event) => setSortBy(event.target.value as any)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Suspended</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{suspendedCount}</p>
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
                        className="font-semibold text-slate-950 hover:underline text-left"
                        onClick={() => {
                          setSelectedJob(job);
                          setDetailsOpen(true);
                        }}
                      >
                        {job.positionTitle}
                      </button>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{job.establishmentName ?? `Employer ${job.employerId.slice(0, 8)}`}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-4 align-top">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-slate-600"
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailsOpen(true);
                          }}
                        >
                          <Info className="mr-1.5 h-4 w-4" />
                          Details
                        </Button>

                        {job.status === "pending" || job.status === "rejected" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            disabled={updatingId === job.id}
                            onClick={() => void updateStatus(job.id, "active")}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Approve
                          </Button>
                        ) : null}

                        {job.status === "pending" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            disabled={updatingId === job.id}
                            onClick={() => {
                              setSelectedJob(job);
                              setRejectionOpen(true);
                            }}
                          >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Reject
                          </Button>
                        ) : null}

                        {job.status === "active" || job.status === "closed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            disabled={updatingId === job.id}
                            onClick={() => void updateStatus(job.id, "archived")}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Archive
                          </Button>
                        ) : null}
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
        <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0 rounded-[2.5rem] border-none shadow-2xl">
          <div className="flex flex-col h-full bg-white p-10">
            <DialogHeader className="mb-6 relative">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <FileText className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold">Internal Moderation View</span>
              </div>
              <DialogTitle className="sr-only">Job Details</DialogTitle>
              <DialogDescription className="sr-only">
                Review the full details of this job posting.
              </DialogDescription>
              
              {selectedJob ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">
                      {selectedJob.positionTitle}
                    </h2>
                    <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{selectedJob.establishmentName ?? `Employer ${selectedJob.employerId.slice(0, 8)}`}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(selectedJob.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <StatusBadge status={selectedJob.status} />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] font-bold">
                      ID: {selectedJob.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ) : null}
            </DialogHeader>

            {selectedJob ? (
              <div className="grid grid-cols-12 gap-10 flex-1 overflow-hidden min-h-0">
                {/* Left Panel: Description */}
                <div className="col-span-7 flex flex-col gap-5 overflow-hidden">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-[0.15em]">Job Description</h3>
                  </div>
                  <div className="flex-1 bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="text-slate-700 leading-relaxed text-base whitespace-pre-wrap font-medium">
                      {selectedJob.description || "No description provided."}
                    </div>
                  </div>
                  
                  {selectedJob.status === "rejected" && selectedJob.rejectionReason && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Moderator Feedback</p>
                        <p className="text-sm text-rose-700 font-bold leading-relaxed">{selectedJob.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel: Metadata & Action Stack */}
                <div className="col-span-5 flex flex-col gap-8 overflow-y-auto pr-2 scrollbar-none">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 text-indigo-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Salary</span>
                      </div>
                      <p className="text-base font-black text-slate-900 truncate">
                        {selectedJob.startingSalary || "Not specified"}
                      </p>
                    </div>
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 text-blue-600">
                        <Users className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Vacancies</span>
                      </div>
                      <p className="text-base font-black text-slate-900">
                        {selectedJob.vacancies ?? 0} Slots
                      </p>
                    </div>
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 text-rose-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Location</span>
                      </div>
                      <p className="text-base font-black text-slate-900 truncate">
                        {selectedJob.location || "General Santos"}
                      </p>
                    </div>
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Setup</span>
                      </div>
                      <p className="text-base font-black text-slate-900 capitalize">
                        {selectedJob.workSetup || "Onsite"}
                      </p>
                    </div>
                  </div>

                  {/* Requirements & Compliance Stack */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Candidate Profile</span>
                      </div>
                      <div className="space-y-3 px-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-semibold">Education</span>
                          <span className="font-black text-slate-900">{selectedJob.minimumEducationRequired || "Any"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-semibold">Experience</span>
                          <span className="font-black text-slate-900">{selectedJob.yearsOfExperienceRequired ? `${selectedJob.yearsOfExperienceRequired}Y` : "None"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Employment SRS</span>
                      </div>
                      <div className="space-y-3 px-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-semibold">Industry</span>
                          <span className="font-black text-slate-900">{selectedJob.industryCode || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-semibold">Contract</span>
                          <span className="font-black text-slate-900">
                            {selectedJob.employmentContractType === "P" ? "Permanent" : 
                             selectedJob.employmentContractType === "T" ? "Temporary" : 
                             selectedJob.employmentContractType === "C" ? "Contractual" : "Other"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Bottom: Contextual Actions */}
                  <div className="mt-auto space-y-3 pt-6">
                    {selectedJob.status === "pending" && (
                      <Button 
                        className="w-full rounded-[1.25rem] h-14 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-xl shadow-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        disabled={updatingId === selectedJob.id}
                        onClick={() => {
                          void updateStatus(selectedJob.id, "active");
                          setDetailsOpen(false);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Approve Posting
                      </Button>
                    )}
                    <Link href={`/admin/jobs/${selectedJob.id}/match`} className="w-full">
                      <Button 
                        className="w-full rounded-[1.25rem] h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Brain className="mr-2 h-5 w-5" />
                        AI Matching Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full rounded-[1.25rem] h-14 text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-600" 
                      onClick={() => setDetailsOpen(false)}
                    >
                      Dismiss View
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectionOpen}
        onOpenChange={(open) => {
          setRejectionOpen(open);
          if (!open) {
            setSelectedJob(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject job posting</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This will be shared with the employer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Rejection Reason</label>
              <Textarea
                placeholder="e.g., Please provide more details about the salary range..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectionOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectionReason.trim() || updatingId === selectedJob?.id}
                onClick={() => selectedJob && void updateStatus(selectedJob.id, "rejected", rejectionReason)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}