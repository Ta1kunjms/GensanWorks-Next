"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStatGrid } from "@/components/dashboard-cards";
import { ErrorState } from "@/components/ui/error-state";
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
  // A failed load must not fall through to the "No jobs posted yet" empty state.
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // After a successful Retry, focus moves to the page heading (the Retry button is gone).
  const headingRef = useRef<HTMLSpanElement>(null);
  const focusAfterRetryRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // loadFailed is cleared only on success so ErrorState stays mounted while retrying.
      setLoading(true);
      try {
        const [workspaceData, appData] = await Promise.all([
          fetchEmployerDashboardData(undefined, { throwOnError: true }),
          // Preview failures fall back to an empty list instead of hiding the loaded stats.
          fetchEmployerApplicationsPreview(),
        ]);

        if (!mounted) return;

        setSummary(workspaceData.summary);
        setJobs(workspaceData.jobs);
        setApplications(appData);
        setLoadFailed(false);
      } catch {
        if (mounted) setLoadFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!loading && !loadFailed && focusAfterRetryRef.current) {
      focusAfterRetryRef.current = false;
      headingRef.current?.focus();
    }
  }, [loading, loadFailed]);

  const welcomeName = user?.company || user?.name || "Employer";

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Employer workspace</p>
        <PageHeader
          title={
            <span ref={headingRef} tabIndex={-1} className="outline-none">
              Welcome back, {welcomeName}
            </span>
          }
          description="Manage postings, shortlist applicants, coordinate feedback, and keep account operations in one place."
          actions={
            <>
              <Button asChild>
                <Link href="/employer/jobs">
                  <Briefcase className="mr-2 h-4 w-4" aria-hidden="true" />
                  Manage jobs
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/employer/applications">
                  <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                  Review applications
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/employer/profile", title: "Profile completeness", text: "Keep company details and documents current.", Icon: ArrowRight },
            { href: "/employer/messages", title: "Messages", text: "Track employer feedback and conversations.", Icon: MessageSquare },
            { href: "/employer/settings", title: "Settings", text: "Company, privacy, team, and security controls.", Icon: Settings },
          ].map(({ href, title, text, Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-slate-200 bg-card p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {loadFailed ? (
        <ErrorState
          title="We couldn't load your dashboard"
          message="Your job and application summary could not be loaded. Check your connection and try again."
          onRetry={() => {
            focusAfterRetryRef.current = true;
            setReloadKey((key) => key + 1);
          }}
          retrying={loading}
        />
      ) : (
      <>
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
          {
            label: "Total Hired",
            value: loading ? "—" : summary?.hiredCount ?? 0,
          },
          {
            label: "Total Rejected",
            value: loading ? "—" : summary?.rejectedCount ?? 0,
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
                <EmptyState
                  headingLevel="h3"
                  title="No applications yet"
                  description="Applications will appear here after candidates apply."
                />
              ) : (
                applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{application.applicantName || "Unknown applicant"}</p>
                        <StatusBadge kind="application" status={application.status || "pending"} />
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
                <EmptyState
                  headingLevel="h3"
                  title="No jobs posted yet"
                  description="Create a job to start receiving applicants."
                />
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{job.positionTitle}</p>
                        <StatusBadge kind="job" status={normalizeJobStatus(job.status)} />
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
      </>
      )}
    </div>
  );
}