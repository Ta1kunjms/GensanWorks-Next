"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Eye, MessageSquare, Save, Trash2 } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EmployerApplication = {
  id: string;
  applicantName?: string | null;
  applicantEmail?: string | null;
  status?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  feedback?: string | null;
  jobId?: string | null;
  job?: {
    id?: string;
    title?: string | null;
    positionTitle?: string | null;
  } | null;
  applicant?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

type ApplicationsResponse = {
  applications?: EmployerApplication[];
  results?: EmployerApplication[];
};

function unwrapApiData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return (payload as { data?: T }).data ?? null;
  }
  return payload as T;
}

const statusOptions = ["all", "pending", "under_review", "shortlisted", "interview", "hired", "rejected", "withdrawn"] as const;
const sourceOptions = ["shortlisted", "referrals", "direct"] as const;

function normalizeStatus(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function badgeVariant(status: string) {
  switch (status) {
    case "hired":
      return "default";
    case "rejected":
      return "destructive";
    case "pending":
      return "secondary";
    case "under_review":
    case "interview":
      return "outline";
    default:
      return "outline";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function EmployerApplicationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployerApplication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployerApplication | null>(null);
  const [sourceTab, setSourceTab] = useState<(typeof sourceOptions)[number]>("direct");
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab")?.toLowerCase();
    const jobId = params.get("jobId");

    if (sourceOptions.includes(tab as (typeof sourceOptions)[number])) {
      setSourceTab(tab as (typeof sourceOptions)[number]);
    }

    if (jobId) {
      setJobFilter(jobId);
    }

    void loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/employer/applications?limit=100&offset=0");
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const payload = await response.json();
      const data = unwrapApiData<ApplicationsResponse | EmployerApplication[]>(payload);
      const nextApplications = Array.isArray(data) ? data : data?.applications ?? data?.results ?? [];
      setApplications(nextApplications);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to load applications"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const jobOptions = useMemo(() => {
    const unique = new Map<string, string>();
    applications.forEach((application) => {
      const jobId = application.job?.id || application.jobId;
      const title = application.job?.title || application.job?.positionTitle || "Untitled role";
      if (jobId && !unique.has(jobId)) {
        unique.set(jobId, title);
      }
    });
    return Array.from(unique.entries()).map(([id, label]) => ({ id, label }));
  }, [applications]);

  const pendingCount = useMemo(
    () => applications.filter((application) => normalizeStatus(application.status) === "pending").length,
    [applications]
  );

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const status = normalizeStatus(application.status);
      const isReferral =
        application.source === "referred" ||
        application.id.startsWith("app_ref_") ||
        (application.notes || "").toLowerCase().includes("referral:");

      const sourceMatch =
        sourceTab === "shortlisted"
          ? status === "shortlisted"
          : sourceTab === "referrals"
            ? isReferral
            : !isReferral && status !== "shortlisted";

      const jobMatch = jobFilter === "all" ? true : (application.job?.id || application.jobId) === jobFilter;
      const statusMatch = statusFilter === "all" ? true : status === statusFilter;

      return sourceMatch && jobMatch && statusMatch;
    });
  }, [applications, jobFilter, sourceTab, statusFilter]);

  const openDetails = (application: EmployerApplication) => {
    setSelected(application);
    setDetailsOpen(true);
    setStatusDrafts((prev) => ({
      ...prev,
      [application.id]: prev[application.id] || normalizeStatus(application.status) || "pending",
    }));
    setFeedbackDrafts((prev) => ({
      ...prev,
      [application.id]: prev[application.id] || application.feedback || "",
    }));
  };

  const saveStatus = async (applicationId: string) => {
    const nextStatus = statusDrafts[applicationId];
    if (!nextStatus) {
      toast({ title: "Select a status first", variant: "destructive" });
      return;
    }

    try {
      const response = await authFetch(`/api/employer/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          feedback: feedbackDrafts[applicationId]?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update application");
      }

      toast({ title: "Application updated", description: `Marked as ${nextStatus}` });
      await loadApplications();
      queryClient.invalidateQueries({ queryKey: ["/api/employer/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employer/dashboard"] });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Unable to update application"),
        variant: "destructive",
      });
    }
  };

  const sendFeedback = async (applicationId: string) => {
    const message = feedbackDrafts[applicationId]?.trim();
    if (!message) {
      toast({ title: "Add feedback first", variant: "destructive" });
      return;
    }

    try {
      const response = await authFetch(`/api/employer/applications/${applicationId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Unable to send feedback");
      }

      toast({ title: "Feedback sent" });
      await loadApplications();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Unable to send feedback"),
        variant: "destructive",
      });
    }
  };

  const promptDelete = (application: EmployerApplication) => {
    setDeleteTarget(application);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await authFetch(`/api/employer/applications/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete application");
      }

      toast({ title: "Application deleted" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadApplications();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Unable to delete application"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employer workspace</p>
          <h2 className="text-2xl font-semibold text-slate-950">Applications</h2>
          <p className="mt-1 text-sm text-slate-600">Review, shortlist, message, and remove candidate applications.</p>
        </div>
        {pendingCount > 0 ? <Badge variant="secondary">{pendingCount} pending</Badge> : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <Tabs value={sourceTab} onValueChange={(value) => setSourceTab(value as typeof sourceTab)}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="direct">Direct applications</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Job filter</label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {jobOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Status filter</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all" ? "All statuses" : formatLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current view</p>
              <p className="mt-1 text-sm text-slate-700">
                {sourceTab} · {jobFilter === "all" ? "all jobs" : "single job"} · {statusFilter === "all" ? "all statuses" : statusFilter}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-slate-600">No applications found</p>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or open a different source tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => {
                    const currentStatus = normalizeStatus(application.status) || "pending";
                    return (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{application.applicantName || application.applicant?.name || "Unknown"}</p>
                            <p className="text-sm text-slate-500">{application.applicantEmail || application.applicant?.email || "No email"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-700">{application.job?.title || application.job?.positionTitle || "N/A"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(currentStatus)}>
                            {currentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600">{formatDate(application.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openDetails(application)} title="View details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.applicantName || selected?.applicant?.name || "Application details"}</DialogTitle>
            <DialogDescription>
              Review applicant details, update status, and send feedback.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Applicant</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{selected.applicantName || selected.applicant?.name || "Unknown"}</p>
                  <p className="text-sm text-slate-600">{selected.applicantEmail || selected.applicant?.email || "No email"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Job</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{selected.job?.title || selected.job?.positionTitle || "N/A"}</p>
                  <p className="text-sm text-slate-600">Applied {formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Update status</label>
                  <Select
                    value={statusDrafts[selected.id] || normalizeStatus(selected.status) || "pending"}
                    onValueChange={(value) => setStatusDrafts((prev) => ({ ...prev, [selected.id]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {["pending", "under_review", "interview", "hired", "rejected"].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "under_review" ? "Under Review" : formatLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Feedback message</label>
                  <Textarea
                    value={feedbackDrafts[selected.id] || ""}
                    onChange={(event) => setFeedbackDrafts((prev) => ({ ...prev, [selected.id]: event.target.value }))}
                    placeholder="Add interview notes or decision rationale"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selected ? (
              <>
                <Button variant="outline" onClick={() => sendFeedback(selected.id)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send feedback
                </Button>
                <Button onClick={() => saveStatus(selected.id)}>
                  <Save className="mr-2 h-4 w-4" />
                  Save status
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
