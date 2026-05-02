"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStatGrid } from "@/components/dashboard-cards";
import {
  fetchEmployerApplicationsPreview,
  fetchEmployerDashboardData,
  type EmployerApplicationPreview,
  type EmployerJob,
  type EmployerSummary,
} from "@/lib/dashboard-data";
import { useAuth } from "@/lib/auth-client";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "hired":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "shortlisted":
    case "reviewed":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "archived":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function normalizeJobStatus(status: string | null | undefined) {
  if (!status) return "draft";
  return status.toLowerCase();
}

export default function EmployerDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EmployerSummary | null>(null);
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [applications, setApplications] = useState<EmployerApplicationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [workspaceData, appData] = await Promise.all([
          fetchEmployerDashboardData(),
          fetchEmployerApplicationsPreview(),
        ]);

        if (!mounted) return;

        setSummary(workspaceData.summary);
        setJobs(workspaceData.jobs);
        setApplications(appData);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const welcomeName = user?.company || user?.name || "Employer";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="grid gap-8 px-6 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-10">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Employer workspace</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Welcome back, {welcomeName}</h2>
            <p className="max-w-2xl text-sm text-slate-300 md:text-base">
              Manage postings, shortlist applicants, coordinate feedback, and keep account operations in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/employer/jobs">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Manage jobs
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/employer/applications">
                  <Users className="mr-2 h-4 w-4" />
                  Review applications
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/employer/profile" className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Profile completeness</p>
                    <p className="mt-1 text-xs text-slate-300">Keep company details and documents current.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
              <Link href="/employer/messages" className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Messages</p>
                    <p className="mt-1 text-xs text-slate-300">Track employer feedback and conversations.</p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
              <Link href="/employer/settings" className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Settings</p>
                    <p className="mt-1 text-xs text-slate-300">Company, privacy, team, and security controls.</p>
                  </div>
                  <Settings className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <DashboardStatGrid
        items={[
          {
            label: "Total job postings",
            value: loading ? "—" : summary?.jobsCount ?? 0,
          },
          {
            label: "Active jobs",
            value: loading ? "—" : summary?.activeJobsCount ?? 0,
          },
          {
            label: "Applications",
            value: loading ? "—" : summary?.applicationsCount ?? 0,
          },
          {
            label: "Pending applications",
            value: loading ? "—" : summary?.pendingApplicationsCount ?? 0,
          },
        ]}
      />

      <Tabs defaultValue="applications" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 text-slate-600">
          <TabsTrigger value="applications">Recent applications</TabsTrigger>
          <TabsTrigger value="jobs">Recent jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Review and manage the newest applicant activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Loading applications...</p>
              ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-900">No applications yet</p>
                  <p className="mt-1 text-sm text-slate-500">Applications will appear here after candidates apply.</p>
                </div>
              ) : (
                applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{application.applicantName || "Unknown applicant"}</p>
                        <Badge className={statusTone(application.status)}>{application.status || "pending"}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{application.applicantEmail || "No email on file"}</p>
                      <p className="text-xs text-slate-500">
                        {application.job?.positionTitle || "Job"} · Applied {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/employer/applications">Open applications</Link>
                      </Button>
                      {application.jobId ? (
                        <Button asChild size="sm">
                          <Link href={`/employer/jobs/${application.jobId}/applications`}>View job</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Recent Job Posts</CardTitle>
              <CardDescription>Track the current state of your postings and quickly jump to edits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Loading jobs...</p>
              ) : jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="font-medium text-slate-900">No jobs posted yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create a job to start receiving applicants.</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{job.positionTitle}</p>
                        <Badge className={statusTone(normalizeJobStatus(job.status))}>{normalizeJobStatus(job.status)}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">Created {formatDate(job.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/employer/jobs">Manage jobs</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/employer/jobs/${job.id}/applications`}>View applicants</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}