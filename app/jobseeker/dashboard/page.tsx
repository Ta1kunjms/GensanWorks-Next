"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import {
  fetchJobseekerDashboardData,
  type JobseekerApplication as Application,
  type JobseekerJob as Job,
} from "@/lib/dashboard-data";

export default function JobseekerDashboardPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJobseekerDashboardData();
        setJobs(data.jobs);
        setApplications(data.applications);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = useMemo(() => {
    const totalApplications = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
    const accepted = applications.filter((a) => a.status === "accepted").length;

    const shortlistRate = totalApplications
      ? Math.round((shortlisted / totalApplications) * 100)
      : 0;
    const acceptanceRate = totalApplications
      ? Math.round((accepted / totalApplications) * 100)
      : 0;

    return {
      totalApplications,
      pending,
      shortlisted,
      accepted,
      shortlistRate,
      acceptanceRate,
    };
  }, [applications]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "reviewed":
        return "bg-sky-100 text-sky-800";
      case "shortlisted":
        return "bg-purple-100 text-purple-800";
      case "interview":
        return "bg-indigo-100 text-indigo-800";
      case "accepted":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "reviewed":
        return "Reviewed";
      case "shortlisted":
        return "Shortlisted";
      case "interview":
        return "Interview";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500 blur-3xl" />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Welcome back</p>
          <h1 className="mt-2 text-4xl font-bold">Hi, {session?.user?.name || "Jobseeker"}!</h1>
          <p className="mt-2 text-slate-200">
            A smarter job hunt with real-time progress and personalized recommendations.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/jobseeker/jobs">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <Search className="mr-2 h-5 w-5" />
                Browse Jobs
              </Button>
            </Link>
            <Link href="/jobseeker/profile">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Complete Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
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

      {/* Recent Applications Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Applications</h2>
            <p className="text-sm text-slate-600">Track your job applications in one place</p>
          </div>
          <Link href="/jobseeker/applications">
            <Button variant="outline">View all</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-3">
            {applications.slice(0, 5).map((app) => (
              <Card
                key={app.id}
                className="p-4 hover:shadow-md transition-shadow border border-slate-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {app.positionTitle || "Position"}
                    </h3>
                    <p className="text-sm text-slate-600">{app.employerName || "Employer"}</p>
                  </div>
                  <Badge className={`${getStatusColor(app.status)} text-xs`}>
                    {getStatusLabel(app.status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border border-dashed border-slate-300">
            <p className="text-slate-600">No applications yet. Start exploring jobs!</p>
            <Link href="/jobseeker/jobs">
              <Button className="mt-4">Browse Jobs</Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Recommended Jobs Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recommended Opportunities</h2>
            <p className="text-sm text-slate-600">Based on your profile and experience</p>
          </div>
          <Link href="/jobseeker/jobs">
            <Button variant="outline">View all jobs</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.slice(0, 4).map((job) => (
              <Link key={job.id} href={`/jobseeker/jobs/${job.id}`}>
                <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-300 cursor-pointer h-full">
                  <h3 className="font-semibold text-slate-900 line-clamp-2">
                    {job.positionTitle}
                  </h3>
                  <p className="text-sm text-slate-600 mt-2">{job.establishmentName}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    📍 {job.location}
                  </p>
                  <Button className="mt-4 w-full" variant="default">
                    View & Apply
                  </Button>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border border-dashed border-slate-300">
            <p className="text-slate-600">No jobs available at the moment</p>
          </Card>
        )}
      </div>
    </div>
  );
}
