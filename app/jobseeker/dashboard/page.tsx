"use client";
export const dynamic = "force-dynamic";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  ArrowRight,
  Briefcase
} from "lucide-react";
import { queryFetcher } from "@/lib/query-fetcher";
import { 
  fetchJobseekerDashboardData,
  type JobseekerApplication as Application,
  type JobseekerJob as Job
} from "@/lib/dashboard-data";
import { JobSeekingStatusToggle } from "@/components/jobseeker/job-seeking-status-toggle";

export default function JobseekerDashboardPage() {
  const { data: session } = useAuth();

  // 1. Fetch Dashboard Stats & Recent Data
  const { 
    data: dashboardData, 
    isLoading: isDashLoading 
  } = useQuery({
    queryKey: ["jobseeker", "dashboard"],
    queryFn: () => fetchJobseekerDashboardData(),
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

  const jobs = dashboardData?.jobs || [];
  const applications = dashboardData?.applications || [];
  const profile = dashboardData?.profile || null;
  const recommendations = recsData?.jobs || [];
  const loading = isDashLoading || isRecsLoading;

  const stats = useMemo(() => {
    return {
      totalApplications: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      accepted: applications.filter((a) => a.status === "accepted" || a.status === "hired").length,
    };
  }, [applications]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "shortlisted": return "bg-purple-100 text-purple-700 border-purple-200";
      case "accepted": case "hired": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "rejected": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-8">

      {/* Job-Seeking Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div>
          <p className="font-semibold text-slate-900 text-sm">Your Job-Seeking Status</p>
          <p className="text-xs text-slate-500 mt-0.5">Control your visibility in the PESO AI matching pool and referral system</p>
        </div>
        <JobSeekingStatusToggle />
      </div>

      {/* Profile Completeness Prompt */}
      {!loading && profile && profile.profileCompleteness < 80 && (
        <Card className="p-5 border-amber-200 bg-amber-50/50 shadow-sm animate-in slide-in-from-top duration-500">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-amber-100 flex-shrink-0">
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
                <span className="absolute text-[10px] font-bold text-amber-700">{profile.profileCompleteness}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                Complete your profile to unlock more jobs
                <Badge variant="outline" className="bg-white border-amber-200 text-amber-700 text-[10px] py-0">Recommended</Badge>
              </h3>
              <p className="text-sm text-slate-600">
                Your profile is currently <span className="font-bold text-slate-900">{profile.profileCompleteness}%</span> complete. 
                Employers prefer jobseekers with complete details.
              </p>
            </div>
            <Link href="/jobseeker/profile">
              <Button className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm shadow-amber-200">
                Finish Setup
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isDashLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : (
          <>
            <Card className="p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Applications</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stats.totalApplications}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-amber-50 hover:shadow-md transition-shadow border border-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Pending Review</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{stats.pending}</p>
                </div>
                <div className="p-2 bg-amber-200 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-purple-50 hover:shadow-md transition-shadow border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Shortlisted</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">{stats.shortlisted}</p>
                </div>
                <div className="p-2 bg-purple-200 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-emerald-50 hover:shadow-md transition-shadow border border-emerald-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Accepted</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.accepted}</p>
                </div>
                <div className="p-2 bg-emerald-200 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-700" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Recommendations Section */}
      {!isRecsLoading && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Recommended for You
            </h2>
            <Link href="/jobseeker/jobs" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {recommendations.map((job) => (
              <Link key={job.id} href={`/jobseeker/jobs/${job.id}`} className="min-w-[280px] group">
                <Card className="p-5 h-full hover:shadow-md transition-all border-slate-200 group-hover:border-blue-300">
                  <div className="flex flex-col h-full">
                    <Badge variant="secondary" className="w-fit mb-3 text-[10px] py-0">
                      {job.employmentType}
                    </Badge>
                    <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
                      {job.positionTitle}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-1 mb-4">{job.employerName}</p>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.city}
                      </div>
                      <div className="font-bold text-slate-900">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent Applications</h2>
            <Link href="/jobseeker/applications">
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isDashLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : applications.length > 0 ? (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => (
                <Link key={app.id} href={`/jobseeker/applications/${app.id}`}>
                  <Card className="p-4 hover:shadow-md transition-all border border-slate-200 hover:border-blue-300 group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {app.positionTitle || "Position"}
                        </h3>
                        <p className="text-sm text-slate-600">{app.employerName || "Employer"}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(app.status || "pending")} text-xs border`}>
                          {getStatusLabel(app.status || "pending")}
                        </Badge>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border border-dashed border-slate-300 bg-slate-50/50">
              <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-slate-300">
                <Briefcase className="w-6 h-6" />
              </div>
              <p className="text-slate-600 font-medium">No applications yet</p>
              <p className="text-sm text-slate-500 mt-1">Start exploring jobs and apply today!</p>
              <Link href="/jobseeker/jobs">
                <Button className="mt-6 bg-slate-900 hover:bg-slate-800">Browse Jobs</Button>
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Latest Jobs</h2>
            <Link href="/jobseeker/jobs">
              <Button variant="ghost" size="sm">See all</Button>
            </Link>
          </div>

          {isDashLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 3).map((job) => (
                <Link key={job.id} href={`/jobseeker/jobs/${job.id}`}>
                  <Card className="p-5 hover:shadow-md transition-all hover:border-blue-300 group">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {job.positionTitle}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2">{job.establishmentName}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </p>
                      <Badge variant="outline" className="text-[10px] py-0 px-2">New</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border border-dashed border-slate-300 bg-slate-50/50">
              <p className="text-sm text-slate-500">No new jobs at the moment</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
