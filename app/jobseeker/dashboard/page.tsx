"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Clock,
  CheckCircle,
  Compass,
  FileText,
  Handshake,
  ListChecks,
  MapPin,
  ArrowRight,
  Briefcase,
  Send
} from "lucide-react";
import { queryFetcher } from "@/lib/query-fetcher";
import { 
  fetchJobseekerDashboardData,
  type JobseekerApplication as Application,
  type JobseekerJob as Job
} from "@/lib/dashboard-data";
import { JobSeekingStatusToggle } from "@/components/jobseeker/job-seeking-status-toggle";
import { formatRelativeTime } from "@/lib/time-utils";

export default function JobseekerDashboardPage() {
  const { data: session } = useAuth();

  // 1. Fetch Dashboard Stats & Recent Data
  const { 
    data: dashboardData, 
    isLoading: isDashLoading,
    isError: isDashError,
    isFetching: isDashFetching,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["jobseeker", "dashboard"],
    queryFn: () => fetchJobseekerDashboardData(undefined, { throwOnError: true }),
    // One retry, so a failure shows the error state promptly.
    retry: 1,
  });

  // 2. Fetch Personalized Recommendations
  const { 
    data: recsData, 
    isLoading: isRecsLoading 
  } = useQuery({
    queryKey: ["jobseeker", "recommendations"],
    queryFn: () => queryFetcher<{ jobs: Job[] }>("/api/jobseeker/recommendations"),
    staleTime: 10 * 60 * 1000, // Recommendations can be stale for longer (10 mins)
  });

  // After a successful Retry, focus moves to the first section heading (the Retry button is gone).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRetryRef = useRef(false);
  useEffect(() => {
    if (!isDashError && !isDashFetching && focusAfterRetryRef.current) {
      focusAfterRetryRef.current = false;
      headingRef.current?.focus();
    }
  }, [isDashError, isDashFetching]);

  const jobs = dashboardData?.jobs || [];
  const applications = dashboardData?.applications || [];
  const profile = dashboardData?.profile || null;
  const recommendations = recsData?.jobs || [];
  const loading = isDashLoading || isRecsLoading;

  const stats = useMemo(() => {
    return {
      totalApplications: applications.length,
      viaReferral: applications.filter((a) => a.source === "referred").length,
      directApplication: applications.filter((a) => a.source === "direct").length,
      pendingReferral: applications.filter((a) => a.source === "referred" && (a.status === "pending" || a.status === "under_review")).length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      accepted: applications.filter((a) => a.status === "accepted" || a.status === "hired").length,
    };
  }, [applications]);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Your applications, recommendations and the latest openings." />

      {/* Job-Seeking Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 bg-white">
        <div>
          <p className="font-semibold text-slate-900 text-sm">Your Job-Seeking Status</p>
          <p className="text-sm text-slate-600 mt-0.5">Control your visibility in the PESO AI matching pool and referral system</p>
        </div>
        <JobSeekingStatusToggle initialStatus={profile?.job_seeking_status as any} />
      </div>

      {/* Profile Completeness Prompt */}
      {!loading && profile && profile.profileCompleteness < 80 && (
        <Card className="p-4 sm:p-5 border-amber-200 bg-amber-50">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-fit p-3 bg-white rounded-lg border border-amber-100 flex-shrink-0" aria-hidden="true">
              <div className="relative h-12 w-12 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500"
                    strokeWidth="3"
                    strokeDasharray={`${profile.profileCompleteness}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-semibold text-amber-800">{profile.profileCompleteness}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                Complete your profile to unlock more jobs
                <Badge variant="warning">Recommended</Badge>
              </h2>
              <p className="text-sm text-slate-600">
                Your profile is currently <span className="font-semibold text-slate-900">{profile.profileCompleteness}%</span> complete. 
                Employers prefer jobseekers with complete details.
              </p>
            </div>
            <Button asChild size="lg" className="w-full md:w-auto">
              <Link href="/jobseeker/profile">Finish Setup</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Load failure: fixed copy only, never backend error text */}
      {isDashError ? (
        <ErrorState
          title="We couldn't load your dashboard"
          message="Your applications and the latest jobs could not be loaded. Check your connection and try again."
          onRetry={() => {
            focusAfterRetryRef.current = true;
            void refetchDash();
          }}
          retrying={isDashFetching}
        />
      ) : (
      /* Stats Grid - 6 cards */
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isDashLoading ? (
          <>
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </>
        ) : (
          <>
            <StatCard label="Total Applications" value={stats.totalApplications} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Via Referral" value={stats.viaReferral} icon={<Handshake className="h-5 w-5" />} />
            <StatCard label="Direct Application" value={stats.directApplication} icon={<Send className="h-5 w-5" />} />
            <StatCard label="Pending Referral Review" value={stats.pendingReferral} icon={<Clock className="h-5 w-5" />} />
            <StatCard label="Shortlisted" value={stats.shortlisted} icon={<ListChecks className="h-5 w-5" />} />
            <StatCard label="Accepted Jobs" value={stats.accepted} icon={<CheckCircle className="h-5 w-5" />} />
          </>
        )}
      </div>
      )}

      {/* Recommendations Section */}
      {!isRecsLoading && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                Recommended for You
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI-assisted suggestions based on your profile. They are not a guarantee of fit or hiring.
              </p>
            </div>
            <Link href="/jobseeker/jobs" className="shrink-0 rounded-sm text-sm font-medium text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {recommendations.map((job) => (
              <Link key={job.id} href={`/jobseeker/jobs/${job.id}`} className="min-w-[260px] group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="p-4 sm:p-5 h-full transition-colors border-slate-200 group-hover:border-primary/40 motion-reduce:transition-none">
                  <div className="flex flex-col h-full">
                    <Badge variant="neutral" className="w-fit mb-3 font-medium">
                      {job.employmentType}
                    </Badge>
                    <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1 group-hover:text-primary">
                      {job.positionTitle}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-1 mb-4">{job.employerName}</p>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {job.city}
                      </div>
                      <div className="font-semibold text-slate-900">
                        {job.startingSalary || "Negotiable"}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications Section */}
      {!isDashError && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-900 outline-none">Recent Applications</h2>
            <Button asChild variant="ghost" className="text-blue-700 hover:text-blue-800 hover:bg-blue-50">
              <Link href="/jobseeker/applications">
                View all <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {isDashLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : applications.length > 0 ? (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => (
                <Link key={app.id} href={`/jobseeker/applications/${app.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="p-4 transition-colors border border-slate-200 hover:border-primary/40 group motion-reduce:transition-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-primary">
                          {app.positionTitle || "Position"}
                        </h3>
                        <p className="text-sm text-slate-600">{app.employerName || "Employer"}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge kind="application" status={app.status || "pending"} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {app.submittedAt ? formatRelativeTime(app.submittedAt) : "N/A"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              headingLevel="h3"
              icon={<Briefcase className="w-6 h-6" />}
              title="No applications yet"
              description="Start exploring jobs and apply today!"
              action={
                <Button asChild size="lg">
                  <Link href="/jobseeker/jobs">Browse Jobs</Link>
                </Button>
              }
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Latest Jobs</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobseeker/jobs">See all</Link>
            </Button>
          </div>

          {isDashLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 3).map((job) => (
                <Link key={job.id} href={`/jobseeker/jobs/${job.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="p-4 sm:p-5 transition-colors hover:border-primary/40 group motion-reduce:transition-none">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-primary">
                      {job.positionTitle}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">{job.establishmentName}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {job.location}
                      </p>
                      <Badge variant="neutral" className="shrink-0 font-medium">
                        {job.createdAt ? formatRelativeTime(job.createdAt) : "New"}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState headingLevel="h3" title="No new jobs at the moment" />
          )}
        </div>
      </div>
      )}
    </div>
  );
}
